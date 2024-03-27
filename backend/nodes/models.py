import typing
import uuid

import model_utils
import pgtrigger
from django.db import models
from django.utils.text import slugify

from nodes import utils as nodes_utils
from utils import models as utils_models
from utils import tokens


class DocumentType(models.TextChoices):
    EDITOR = "EDITOR", "Editor"
    SPACE = "SPACE", "Space"
    GRAPH = "GRAPH", "Graph"


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


class Node(utils_models.BaseModel):
    """
    A node in the graph.

    Note:
        The fields `title_token_count` and `text_token_count` are updated automatically when the
        `title` and `text` fields are changed.
        The field `text` is updated automatically when the `content` field is changed.
        These fields are considered read-only / automatically managed and should not be updated
        directly. The `save` method is overridden to handle these updates.
    """

    title = models.CharField(max_length=1024, null=True)
    title_token_count = models.PositiveIntegerField(null=True)
    content = models.JSONField(null=True)
    text = models.TextField(null=True, default=None)
    text_token_count = models.PositiveIntegerField(null=True)
    subnodes: models.ManyToManyField = models.ManyToManyField(
        "self", related_name="parents", symmetrical=False, blank=True
    )

    tracker = model_utils.FieldTracker()

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
        force_insert: bool = False,
        force_update: bool = False,
        using: str | None = None,
        update_fields: typing.Iterable[str] | None = None,
    ) -> None:
        add_to_update_fields: list[str] = []
        if self.tracker.has_changed("content") and self.__is_updated(update_fields, "content"):
            self.text = " ".join(nodes_utils.extract_text_from_node(self.content))
            add_to_update_fields.append("text")
            self.text_token_count = tokens.token_count(self.text)
            add_to_update_fields.append("text_token_count")
        if self.tracker.has_changed("title") and self.__is_updated(update_fields, "title"):
            self.title_token_count = tokens.token_count(self.title)
            add_to_update_fields.append("title_token_count")

        update_fields = self.__add_to_update_fields(update_fields, *add_to_update_fields)

        return super().save(force_insert, force_update, using, update_fields)

    def node_as_str(self, include_content: bool, include_connections: bool) -> str:
        """Return a string representation of the node."""
        single_line_title = self.title.replace("\n", " ").replace("\r", " ") if self.title else ""
        single_line_text = self.text.replace("\n", " ").replace("\r", " ") if self.text else ""
        node_str = f"({str(self.public_id)}) - {single_line_title}"
        if include_content:
            node_str += f" - {single_line_text}"
        if include_connections:
            if subnode_ids := self.subnodes.values_list("public_id", flat=True):
                node_str += f" - Connects to: {', '.join(map(str, subnode_ids))}"
        return node_str

    def fetch_subnodes(self, depth: int) -> dict[int, list["Node"]]:
        """Fetch subnodes of a node and return then by depth."""
        nodes_at_depth = {0: [self]}
        for i in range(1, depth + 1):
            subnodes = Node.objects.filter(parents__in=nodes_at_depth[i - 1]).prefetch_related(
                "subnodes"
            )
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
        context = ""

        for depth, nodes in nodes_at_depth.items():
            include_content = True
            if depth == ignore_content_at_depth:
                include_content = False

            for node in nodes:
                context += (
                    node.node_as_str(
                        include_content=include_content, include_connections=not depth == node_depth
                    )
                    + "\n"
                )

        return context

    def __str__(self) -> str:
        return f"{self.public_id} - {self.title}"


class DocumentVersion(utils_models.BaseModel):
    """Task for storing the version of a document."""

    public_id = models.UUIDField(editable=False, default=uuid.uuid4, db_index=True)
    document_type = models.CharField(max_length=255, choices=DocumentType.choices)
    document = models.ForeignKey("Document", on_delete=models.CASCADE, related_name="versions")
    json_hash = models.CharField(max_length=255)
    data = models.BinaryField()

    def __str__(self) -> str:
        return f"{self.document.public_id} - {self.created_at}"


class Space(utils_models.BaseModel):
    title = models.CharField(max_length=255)
    title_slug = models.SlugField(max_length=255, unique=True)
    # Setting the type hint manually is required because of a bug in the Django stubs.
    # Reported here: https://github.com/typeddjango/django-stubs/issues/2011
    nodes: models.ManyToManyField = models.ManyToManyField(Node, related_name="spaces")
    deleted_nodes: models.ManyToManyField = models.ManyToManyField(
        Node, related_name="spaces_deleted"
    )

    def __str__(self) -> str:
        return f"{self.public_id} - {self.title}"

    def save(self, *args: typing.Any, **kwargs: typing.Any) -> None:
        if not self.id:
            # Only set the slug when the object is created.
            title_slug = slugify(self.title)
            self.title_slug = title_slug
            while Space.objects.filter(title_slug=self.title_slug).exists():
                self.title_slug = f"{title_slug}-{nodes_utils.random_string(4)}"

        super().save(*args, **kwargs)


class Document(models.Model):  # type: ignore[django-manager-missing]
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
                    RETURN NEW;
                    """  # noqa: E501
                ),
            )
        ]
