import typing
from collections import OrderedDict

import model_utils
import pgtrigger
from django.contrib.auth.models import AnonymousUser
from django.contrib.contenttypes import models as content_type_models
from django.contrib.postgres import indexes as pg_indexes
from django.contrib.postgres import search as pg_search
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.functions import Coalesce

import nodes.utils
import permissions.models
import utils.models
from utils import tokens

if typing.TYPE_CHECKING:
    import uuid

    from django import http
    from django.db.models.fields.related_descriptors import RelatedManager

    from users import typing as user_typing

PG_NOTIFY_CHANNEL = "nodes_document_change"


class DocumentType(models.TextChoices):
    EDITOR = "EDITOR", "Editor"
    SPACE = "SPACE", "Space"
    GRAPH = "GRAPH", "Graph"
    METHOD_GRAPH = "METHOD_GRAPH", "Method Graph"


class NodeType(models.TextChoices):
    METHOD = "METHOD", "Method"
    DEFAULT = "DEFAULT", "Default"


def prefix_field(field: str, prefix: str | None = None) -> str:
    return f"{prefix}__{field}" if prefix else field


class DocumentEvent(models.Model):
    class EventType(models.TextChoices):
        INSERT = "INSERT", "Insert"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"

    public_id = models.UUIDField(editable=False)
    document_type = models.CharField(max_length=255, choices=DocumentType.choices)
    action = models.CharField(max_length=255, choices=EventType.choices)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.public_id} - {self.action.title()}"


class Node(utils.models.SoftDeletableBaseModel):
    """
    A node in the graph.

    Note:
        The fields `title_token_count` and `text_token_count` are updated automatically when the
        `title` and `text` fields are changed.
        The field `text` is updated automatically when the `content` field is changed.
        These fields are considered read-only / automatically managed and should not be updated
        directly. The `save` method is overridden to handle these updates.
    """

    title = models.TextField(null=True, default=None)
    title_token_count = models.PositiveIntegerField(null=True)

    description = models.TextField(null=True, default=None)
    description_token_count = models.PositiveIntegerField(null=True)

    content = models.JSONField(null=True)

    text = models.TextField(null=True, default=None)
    text_token_count = models.PositiveIntegerField(null=True)

    node_type = models.CharField(max_length=255, choices=NodeType.choices, default=NodeType.DEFAULT)

    subnodes = models.ManyToManyField("self", related_name="parents", symmetrical=False, blank=True)

    creator = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    authors = models.ManyToManyField("users.User", related_name="nodes", blank=True)

    space = models.ForeignKey(
        "Space", on_delete=models.CASCADE, null=True, blank=True, related_name="nodes"
    )

    editor_document = models.OneToOneField(
        "Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="node_editor"
    )
    graph_document = models.OneToOneField(
        "Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="node_graph"
    )

    search_vector = pg_search.SearchVectorField(editable=False, null=True)

    tracker = model_utils.FieldTracker()

    @staticmethod
    def get_user_has_permission_filter(
        action: permissions.models.Action,
        user: "user_typing.AnyUserType | None" = None,
        prefix: str | None = None,
    ) -> Q:
        """
        Return a Q object that filters whether the user has permission to do <action> on this
        object.
        Note: We're not filtering out whether the object itself is deleted, this should be done
              before calling this method, but we're checking whether the parents or spaces are
              deleted. Roles are not soft-deletable, so those aren't checked either.
        """
        user = user or AnonymousUser()

        def permissions_for_role(roles: list[permissions.models.RoleOptions]) -> Q:
            return Q(
                **{
                    prefix_field("space__members__user", prefix): user,
                    prefix_field("space__members__role__role__in", prefix): roles,
                    prefix_field("space__is_removed", prefix): False,
                }
            )

        if action == permissions.models.READ:
            queryset_filters = Q(
                **{
                    prefix_field("space__is_public", prefix): True,
                    prefix_field("space__is_removed", prefix): False,
                }
            )
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.READ_ROLES)
            return queryset_filters

        if action in (permissions.models.WRITE, permissions.models.DELETE):
            queryset_filters = Q(
                **{
                    prefix_field("space__is_public_writable", prefix): True,
                    prefix_field("space__is_public", prefix): True,
                    prefix_field("space__is_removed", prefix): False,
                }
            )
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.WRITE_ROLES)
            return queryset_filters

        if action == permissions.models.MANAGE:
            if user.is_authenticated:
                return permissions_for_role(permissions.models.ADMIN_ROLES)
            return Q(pk=None)  # That is a false statement, so it will always return False.

        raise ValueError("Invalid action type.")

    @staticmethod
    def get_role_annotation_query(user: "user_typing.AnyUserType") -> Coalesce | models.Case:
        public_subquery = models.Case(
            models.When(
                Q(
                    space__is_public=True,
                    space__is_public_writable=True,
                    space__is_removed=False,
                ),
                then=models.Value(
                    ["viewer", "writer"], output_field=ArrayField(models.CharField())
                ),
            ),
            models.When(
                Q(space__is_public=True, space__is_removed=False),
                then=models.Value(
                    ["viewer"],
                    output_field=ArrayField(models.CharField()),
                ),
            ),
            default=models.Value([], output_field=ArrayField(models.CharField())),
        )

        if not user.is_authenticated:
            return public_subquery

        space_public_subquery = Space.objects.filter(
            nodes=models.OuterRef("object_id"), is_removed=False, is_public=True  # mypy: ignore
        )
        space_public_writable_subquery = Space.objects.filter(
            nodes=models.OuterRef("object_id"),
            is_removed=False,
            is_public=True,
            is_public_writable=True,
        )

        space_content_type = content_type_models.ContentType.objects.get_for_model(Space)

        role_aggregation_stmt = ArrayAgg(
            "role__role",
            distinct=True,
            default=models.Value([], output_field=ArrayField(models.CharField())),
        )

        role_subquery = (
            permissions.models.ObjectMembership.objects.filter(
                models.Q(content_type=space_content_type, object_id=models.OuterRef("space__pk")),
                user=user,
            )
            # This is to group the roles by the related object, so we can aggregate them afterward.
            .annotate(related_object=models.OuterRef("pk"))
            .values("related_object")
            .annotate(
                roles=models.Func(
                    role_aggregation_stmt,
                    models.Case(
                        models.When(
                            Q(content_type=space_content_type)
                            & models.Exists(space_public_writable_subquery),
                            then=models.Value(
                                ["viewer", "writer"], output_field=ArrayField(models.CharField())
                            ),
                        ),
                        models.When(
                            Q(content_type=space_content_type)
                            & models.Exists(space_public_subquery),
                            then=models.Value(
                                ["viewer"], output_field=ArrayField(models.CharField())
                            ),
                        ),
                        default=models.Value([], output_field=ArrayField(models.CharField())),
                    ),
                    function="array_cat",
                    output_field=ArrayField(models.CharField()),
                    default=role_aggregation_stmt,
                ),
            )
        )
        return Coalesce(role_subquery.values("roles"), public_subquery)

    @staticmethod
    def __add_to_update_fields(
        update_fields: typing.Iterable[str] | None, *fields: str
    ) -> None | list[str]:
        if update_fields is None:
            return None
        update_fields = set(update_fields)
        update_fields.update(fields)
        return list(update_fields)

    @staticmethod
    def __is_updated(update_fields: typing.Iterable[str] | None, field: str) -> bool:
        return update_fields is None or field in update_fields

    def save(
        self,
        force_insert: bool = False,  # type: ignore[override] # I can't see what's wrong with this.
        force_update: bool = False,
        using: str | None = None,
        update_fields: typing.Iterable[str] | None = None,
    ) -> None:
        add_to_update_fields: list[str] = []
        if self.tracker.has_changed("content") and self.__is_updated(update_fields, "content"):
            self.text = " ".join(nodes.utils.extract_text_from_node(self.content))
            add_to_update_fields.append("text")
            self.text_token_count = tokens.token_count(self.text)
            add_to_update_fields.append("text_token_count")
        if self.tracker.has_changed("title") and self.__is_updated(update_fields, "title"):
            self.title_token_count = tokens.token_count(self.title)
            add_to_update_fields.append("title_token_count")
        if self.tracker.has_changed("description") and self.__is_updated(
            update_fields, "description"
        ):
            self.description_token_count = tokens.token_count(self.description)
            add_to_update_fields.append("description_token_count")

        update_fields = self.__add_to_update_fields(update_fields, *add_to_update_fields)

        return super().save(force_insert, force_update, using, update_fields)

    def node_as_str(self, include_content: bool, include_connections: bool) -> str:
        """Return a string representation of the node."""
        single_line_title = self.title.replace("\n", " ").replace("\r", " ") if self.title else ""
        single_line_text = self.text.replace("\n", " ").replace("\r", " ") if self.text else ""
        single_line_description = (
            self.description.replace("\n", " ").replace("\r", " ") if self.description else ""
        )
        node_str = f"({str(self.public_id)})\n - Title: {single_line_title}"
        if include_content:
            if single_line_text:
                node_str += f"\n - Content: {single_line_text}"
            if single_line_description:
                node_str += f"\n - Description: {single_line_description}"
        if include_connections:
            if subnode_ids := self.subnodes.values_list("public_id", flat=True):
                node_str += f"\n - Connects to: {', '.join(map(str, subnode_ids))}"
        return node_str

    def fetch_subnodes(self, depth: int) -> dict[int, list["Node"]]:
        """Fetch subnodes of a node and return then by depth."""
        nodes_at_depth = {0: [self]}
        for i in range(1, depth + 1):
            subnodes = Node.available_objects.filter(
                parents__in=nodes_at_depth[i - 1]
            ).prefetch_related("subnodes")
            if not subnodes:
                break
            nodes_at_depth[i] = list(subnodes)
        return nodes_at_depth

    def node_context_for_depth(
        self, query_depth: int, nodes_at_depth: dict[int, list["Node"]] | None = None
    ) -> str:
        """Get the context of a node for a certain depth."""
        node_depth = (query_depth // 2) + 1
        if nodes_at_depth:
            nodes_at_depth = {
                depth: nodes for depth, nodes in nodes_at_depth.items() if depth <= node_depth
            }
        else:
            nodes_at_depth = self.fetch_subnodes(node_depth)

        ignore_content_at_depth = node_depth if query_depth % 2 == 0 else None

        nodes_added: "dict[uuid.UUID, tuple[bool, bool]]" = {}
        context_nodes: "dict[uuid.UUID, str]" = OrderedDict()

        for depth, _nodes in nodes_at_depth.items():
            include_content = depth != ignore_content_at_depth
            for node in _nodes:
                # Check if the node is already added to the context, if so, with what settings.
                set_include_content, set_include_connections = nodes_added.get(
                    node.public_id, (False, False)
                )

                # Calculate the new settings for the node, to provide as much context as possible.
                new_include_content = set_include_content or include_content
                new_include_connections = set_include_connections or depth != node_depth

                # Save the new settings for the node.
                nodes_added[node.public_id] = (new_include_content, new_include_connections)

                # Add node context to the OrderedDict to preserve the original order (context
                # closer to the initial node comes first).
                context_nodes[node.public_id] = (
                    node.node_as_str(
                        include_content=new_include_content,
                        include_connections=new_include_connections,
                    )
                    + "\n"
                )

        return "".join(context_nodes.values())

    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has read permissions for this object."""

        # TODO: Space shouldn't be None, make it required.
        try:
            if self.space is not None:
                return self.space.has_object_read_permission(request)
        except Space.DoesNotExist:
            pass

        # This shouldn't happen consistently, it's a completely detached document. It might
        # happen before the corresponding object is created.
        # No permissions apply.
        return False

    @staticmethod
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        However, this allows any authenticated user to create a new object.
        """
        return True

    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has write permissions for this object."""
        if self.space is not None:
            return self.space.has_object_write_permission(request)

        return False

    def __str__(self) -> str:
        return f"{self.public_id} - {self.title}"

    class Meta(
        permissions.models.MembershipModelMixin.Meta, utils.models.SoftDeletableBaseModel.Meta
    ):
        indexes = utils.models.SoftDeletableBaseModel.Meta.indexes + [
            pg_indexes.GinIndex("search_vector", name="search_vector_idx")
        ]
        triggers = [
            pgtrigger.Trigger(
                name="node_update_search_vector",
                operation=pgtrigger.Update | pgtrigger.Insert,
                when=pgtrigger.Before,
                func=pgtrigger.Func(
                    """
                    NEW.search_vector := setweight(to_tsvector('pg_catalog.english', coalesce(new.title,'')), 'A') || setweight(to_tsvector('pg_catalog.english', coalesce(new.text,'')), 'C');
                    return NEW;
                    """  # noqa: E501
                ),
            )
        ]


class DocumentVersion(utils.models.SoftDeletableBaseModel):
    """Task for storing the version of a document."""

    document_type = models.CharField(max_length=255, choices=DocumentType.choices)
    document = models.ForeignKey("Document", on_delete=models.CASCADE, related_name="versions")
    json_hash = models.CharField(max_length=255)
    data = models.BinaryField()

    def __str__(self) -> str:
        return f"{self.document.public_id} - {self.created_at}"

    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.document.has_object_read_permission(request)

    @staticmethod
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        However, this allows any authenticated user to create a new object.
        """
        return True

    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.document.has_object_write_permission(request)


class Space(permissions.models.MembershipBaseModel):
    title = models.CharField(max_length=255)
    default_node = models.ForeignKey(
        "Node",
        help_text="The node that gets displayed when a space is opened.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    document = models.OneToOneField(
        "Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="space"
    )

    # Manually annotating reverse relations that are not automatically detected.
    # See: https://github.com/typeddjango/django-stubs/issues/1354
    nodes: "RelatedManager[Node]"

    def __str__(self) -> str:
        return f"{self.public_id} - {self.title}"

    @staticmethod
    def get_user_has_permission_filter(
        action: permissions.models.Action,
        user: "user_typing.AnyUserType | None" = None,
        prefix: str | None = None,
    ) -> Q:
        """
        Return a Q object that filters whether the user has permission to do <action> on this
        object.
        Note: We're not filtering out whether the object itself is deleted, this should be done
              before calling this method, but we're checking whether memberships are deleted.
              Roles are not soft-deletable, so those aren't checked either.
        """
        user = user or AnonymousUser()

        def permissions_for_role(roles: list[permissions.models.RoleOptions]) -> Q:
            return Q(
                **{
                    prefix_field("members__user", prefix): user,
                    prefix_field("members__role__role__in", prefix): roles,
                }
            )

        if action == permissions.models.READ:
            queryset_filters = Q(**{prefix_field("is_public", prefix): True})
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.READ_ROLES)
            return queryset_filters
        if action in (permissions.models.WRITE, permissions.models.DELETE):
            queryset_filters = Q(
                **{
                    prefix_field("is_public", prefix): True,
                    prefix_field("is_public_writable", prefix): True,
                }
            )
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.WRITE_ROLES)
            return queryset_filters
        if action == permissions.models.MANAGE:
            if user.is_authenticated:
                return permissions_for_role(permissions.models.ADMIN_ROLES)
            return Q(pk=None)  # That is a false statement, so it will return False.

        raise ValueError("Invalid action type.")

    @staticmethod
    def get_role_annotation_query(user: "user_typing.AnyUserType") -> Coalesce | models.Case:
        # TODO: This can probably be simplified more, since the roles for spaces are much simpler,
        #       and there are no parents to consider.
        public_subquery = models.Case(
            models.When(
                Q(is_public=True, is_public_writable=True, is_removed=False),
                then=models.Value(
                    ["viewer", "writer"], output_field=ArrayField(models.CharField())
                ),
            ),
            models.When(
                Q(is_public=True, is_removed=False),
                then=models.Value(["viewer"], output_field=ArrayField(models.CharField())),
            ),
            default=models.Value([], output_field=ArrayField(models.CharField())),
        )
        if not user.is_authenticated:
            return public_subquery

        space_public_subquery = Space.objects.filter(
            pk=models.OuterRef("object_id"), is_removed=False, is_public=True
        )
        space_public_writable_subquery = Space.objects.filter(
            pk=models.OuterRef("object_id"),
            is_removed=False,
            is_public=True,
            is_public_writable=True,
        )
        space_content_type = content_type_models.ContentType.objects.get_for_model(Space)

        role_aggregation_stmt = ArrayAgg(
            "role__role",
            distinct=True,
            default=models.Value([], output_field=ArrayField(models.CharField())),
        )

        role_subquery = (
            permissions.models.ObjectMembership.objects.filter(
                content_type=space_content_type,
                object_id=models.OuterRef("pk"),
                user=user,
            )
            # This is to group the roles by the related object, so we can aggregate them later, we
            # shouldn't need it for spaces, but it's here for consistency and future-proofing.
            .annotate(related_object=models.OuterRef("pk"))
            .values("related_object")
            .annotate(
                roles=models.Func(
                    role_aggregation_stmt,
                    models.Case(
                        models.When(
                            Q(content_type=space_content_type)
                            & models.Exists(space_public_writable_subquery),
                            then=models.Value(
                                ["viewer", "writer"], output_field=ArrayField(models.CharField())
                            ),
                        ),
                        models.When(
                            Q(content_type=space_content_type)
                            & models.Exists(space_public_subquery),
                            then=models.Value(
                                ["viewer"],
                                output_field=ArrayField(models.CharField()),
                            ),
                        ),
                        default=models.Value([], output_field=ArrayField(models.CharField())),
                    ),
                    function="array_cat",
                    output_field=ArrayField(models.CharField()),
                    default=role_aggregation_stmt,
                ),
            )
        )

        return Coalesce(
            role_subquery.values("roles"),
            public_subquery,
            output_field=ArrayField(models.CharField()),
        )

    class Meta(
        permissions.models.MembershipModelMixin.Meta, utils.models.SoftDeletableBaseModel.Meta
    ):
        pass


class Document(models.Model):
    # The type ignore is required because of a bug in the Django stubs (I think).
    # Possibly related to: https://github.com/typeddjango/django-stubs/issues/2011
    public_id = models.UUIDField(editable=False, db_index=True)
    document_type = models.CharField(max_length=255, choices=DocumentType.choices)

    data = models.BinaryField()
    json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.public_id}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["public_id", "document_type"],
                name="nodes_document_unique_public_id_and_type",
            )
        ]
        triggers = [
            pgtrigger.Trigger(
                name="document_change",
                operation=pgtrigger.Insert | pgtrigger.Update | pgtrigger.Delete,
                when=pgtrigger.After,
                func=pgtrigger.Func(
                    f"""
                    IF (TG_OP = 'INSERT') THEN
                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, new_data) VALUES (NEW.public_id, NEW.document_type, '{DocumentEvent.EventType.INSERT}', NOW(), NEW.json);
                    ELSIF (TG_OP = 'UPDATE') THEN
                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, old_data, new_data) VALUES (NEW.public_id, NEW.document_type, '{DocumentEvent.EventType.UPDATE}', NOW(), OLD.json, NEW.json);
                    ELSIF (TG_OP = 'DELETE') THEN
                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, old_data) VALUES (OLD.public_id, OLD.document_type, '{DocumentEvent.EventType.DELETE}', NOW(), OLD.json);
                    END IF;
                    NOTIFY {PG_NOTIFY_CHANNEL};
                    RETURN NEW;
                    """  # noqa: E501
                ),
            )
        ]

    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has read permissions for this object."""
        try:
            if self.space is not None:
                return self.space.has_object_read_permission(request)
        except Space.DoesNotExist:
            pass
        try:
            if self.node_graph is not None and self.node_graph.space is not None:
                return self.node_graph.space.has_object_read_permission(request)
        except Node.DoesNotExist:
            pass

        try:
            if self.node_editor is not None and self.node_editor.space is not None:
                return self.node_editor.space.has_object_read_permission(request)
        except Node.DoesNotExist:
            pass

        # This shouldn't happen consistently, it's a completely detached document. It might
        # happen before the corresponding object is created.
        # No permissions apply.
        return False

    @staticmethod
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        However, this allows any authenticated user to create a new object.
        """
        return True

    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has write permissions for this object."""
        if self.space is not None:
            return self.space.has_object_write_permission(request)
        elif self.node_graph is not None:
            return self.node_graph.space.has_object_write_permission(request)
        elif self.node_editor is not None:
            return self.node_editor.space.has_object_write_permission(request)

        # This shouldn't happen consistently, it's a completely detached document. It might
        # happen before the corresponding object is created.
        # No permissions apply.
        return False
