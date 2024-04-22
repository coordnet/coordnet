from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from nodes.tests import factories as node_factories
from permissions.tests import factories
from users.tests import factories as user_factories
from utils.testcases import BaseTestCase


class MembershipModelMixinTestCase(BaseTestCase):
    """
    Tests for the `MembershipModelMixin` model mixin.

    Smoke tests for the MixIn to ensure that the permissions are correctly working. We try to hit
    all combinations of permissions and roles to ensure that nothing slips through the cracks.
    """

    def setUp(self) -> None:
        super().setUp()
        self.factory = RequestFactory()

        # Create users
        self.owner_user = user_factories.UserFactory()
        self.member_user = user_factories.UserFactory()
        self.viewer_user = user_factories.UserFactory()

        # Create requests
        self.anonymous_request = self.factory.get("/")
        self.anonymous_request.user = AnonymousUser()

        self.owner_request = self.factory.get("/")
        self.owner_request.user = self.owner_user

        self.member_request = self.factory.get("/")
        self.member_request.user = self.member_user

        self.viewer_request = self.factory.get("/")
        self.viewer_request.user = self.viewer_user

        # Create objects for each user.
        self.anonymous_space = node_factories.SpaceFactory()
        node_factories.NodeFactory.create_batch(3, space=self.anonymous_space)

        self.owner_space = node_factories.SpaceFactory()
        node_factories.NodeFactory.create_batch(3, space=self.owner_space)
        factories.ObjectMembershipFactory(
            user=self.owner_user, content_object=self.owner_space, role=self.owner_role
        )

        self.member_space = node_factories.SpaceFactory()
        node_factories.NodeFactory.create_batch(3, space=self.member_space)
        factories.ObjectMembershipFactory(
            user=self.member_user, content_object=self.member_space, role=self.member_role
        )

        self.viewer_space = node_factories.SpaceFactory()
        node_factories.NodeFactory.create_batch(3, space=self.viewer_space)
        factories.ObjectMembershipFactory(
            user=self.viewer_user, content_object=self.viewer_space, role=self.viewer_role
        )

    def test_has_read_permission(self) -> None:
        """Test that the general read permission is always True."""
        self.assertTrue(self.anonymous_space.has_read_permission(self.anonymous_request))
        self.assertTrue(self.anonymous_space.has_read_permission(self.owner_request))
        self.assertTrue(self.anonymous_space.has_read_permission(self.member_request))
        self.assertTrue(self.anonymous_space.has_read_permission(self.viewer_request))

    def test_public_has_object_read_permission(self) -> None:
        """Test that the object read permission is True for every user if the object is public."""
        self.assertFalse(self.anonymous_space.has_object_read_permission(self.anonymous_request))
        self.assertFalse(self.anonymous_space.has_object_read_permission(self.owner_request))
        self.assertFalse(self.anonymous_space.has_object_read_permission(self.member_request))
        self.assertFalse(self.anonymous_space.has_object_read_permission(self.viewer_request))

        self.anonymous_space.is_public = True

        self.assertTrue(self.anonymous_space.has_object_read_permission(self.anonymous_request))
        self.assertTrue(self.anonymous_space.has_object_read_permission(self.owner_request))
        self.assertTrue(self.anonymous_space.has_object_read_permission(self.member_request))
        self.assertTrue(self.anonymous_space.has_object_read_permission(self.viewer_request))

    def test_public_has_write_permission(self) -> None:
        """Test that the general write permission is always True."""
        self.assertTrue(self.anonymous_space.has_write_permission(self.anonymous_request))
        self.assertTrue(self.anonymous_space.has_write_permission(self.owner_request))
        self.assertTrue(self.anonymous_space.has_write_permission(self.member_request))
        self.assertTrue(self.anonymous_space.has_write_permission(self.viewer_request))

    def test_public_writable_has_object_write_permission(self) -> None:
        """
        Test that the object write permission is True for every user if the object is public and
        writable.
        """
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.anonymous_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.owner_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.member_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.viewer_request))

        self.anonymous_space.is_public = True

        self.assertFalse(self.anonymous_space.has_object_write_permission(self.anonymous_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.owner_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.member_request))
        self.assertFalse(self.anonymous_space.has_object_write_permission(self.viewer_request))

        self.anonymous_space.is_public_writable = True

        self.assertTrue(self.anonymous_space.has_object_write_permission(self.anonymous_request))
        self.assertTrue(self.anonymous_space.has_object_write_permission(self.owner_request))
        self.assertTrue(self.anonymous_space.has_object_write_permission(self.member_request))
        self.assertTrue(self.anonymous_space.has_object_write_permission(self.viewer_request))

    def test_owner_has_object_permissions(self) -> None:
        """Test that the object read and write permissions are True for the owner."""
        self.assertFalse(self.owner_space.has_object_read_permission(self.anonymous_request))
        self.assertTrue(self.owner_space.has_object_read_permission(self.owner_request))
        self.assertFalse(self.owner_space.has_object_read_permission(self.member_request))
        self.assertFalse(self.owner_space.has_object_read_permission(self.viewer_request))

        self.assertFalse(self.owner_space.has_object_write_permission(self.anonymous_request))
        self.assertTrue(self.owner_space.has_object_write_permission(self.owner_request))
        self.assertFalse(self.owner_space.has_object_write_permission(self.member_request))
        self.assertFalse(self.owner_space.has_object_write_permission(self.viewer_request))

    def test_member_has_object_permissions(self) -> None:
        """Test that the object read and write permissions are True for the member."""
        self.assertFalse(self.member_space.has_object_read_permission(self.anonymous_request))
        self.assertFalse(self.member_space.has_object_read_permission(self.owner_request))
        self.assertTrue(self.member_space.has_object_read_permission(self.member_request))
        self.assertFalse(self.member_space.has_object_read_permission(self.viewer_request))

        self.assertFalse(self.member_space.has_object_write_permission(self.anonymous_request))
        self.assertFalse(self.member_space.has_object_write_permission(self.owner_request))
        self.assertTrue(self.member_space.has_object_write_permission(self.member_request))
        self.assertFalse(self.member_space.has_object_write_permission(self.viewer_request))

    def test_viewer_has_object_permissions(self) -> None:
        """Test that the object read permission is True for the viewer."""
        self.assertFalse(self.viewer_space.has_object_read_permission(self.anonymous_request))
        self.assertFalse(self.viewer_space.has_object_read_permission(self.owner_request))
        self.assertFalse(self.viewer_space.has_object_read_permission(self.member_request))
        self.assertTrue(self.viewer_space.has_object_read_permission(self.viewer_request))

        self.assertFalse(self.viewer_space.has_object_write_permission(self.anonymous_request))
        self.assertFalse(self.viewer_space.has_object_write_permission(self.owner_request))
        self.assertFalse(self.viewer_space.has_object_write_permission(self.member_request))
        self.assertFalse(self.viewer_space.has_object_write_permission(self.viewer_request))

    def test_space_to_node_permission_inheritance(self) -> None:
        """Test that the permissions are inherited from the space to its nodes."""
        node = self.owner_space.nodes.first()
        self.assertFalse(node.has_object_read_permission(self.anonymous_request))
        self.assertTrue(node.has_object_read_permission(self.owner_request))
        self.assertFalse(node.has_object_read_permission(self.member_request))
        self.assertFalse(node.has_object_read_permission(self.viewer_request))

        self.assertFalse(node.has_object_write_permission(self.anonymous_request))
        self.assertTrue(node.has_object_write_permission(self.owner_request))
        self.assertFalse(node.has_object_write_permission(self.member_request))
        self.assertFalse(node.has_object_write_permission(self.viewer_request))

        self.owner_space.is_public = True
        self.owner_space.is_public_writable = True
        self.owner_space.save()

        self.assertTrue(node.has_object_read_permission(self.anonymous_request))
        self.assertTrue(node.has_object_read_permission(self.owner_request))
        self.assertTrue(node.has_object_read_permission(self.member_request))
        self.assertTrue(node.has_object_read_permission(self.viewer_request))

        self.assertTrue(node.has_object_write_permission(self.anonymous_request))
        self.assertTrue(node.has_object_write_permission(self.owner_request))
        self.assertTrue(node.has_object_write_permission(self.member_request))
        self.assertTrue(node.has_object_write_permission(self.viewer_request))

    def test_space_to_node_permission_inheritance_for_viewers(self) -> None:
        """Test that the permissions are inherited from the space to ots nodes."""
        node = self.viewer_space.nodes.first()
        self.assertFalse(node.has_object_read_permission(self.anonymous_request))
        self.assertFalse(node.has_object_read_permission(self.owner_request))
        self.assertFalse(node.has_object_read_permission(self.member_request))
        self.assertTrue(node.has_object_read_permission(self.viewer_request))

        self.assertFalse(node.has_object_write_permission(self.anonymous_request))
        self.assertFalse(node.has_object_write_permission(self.owner_request))
        self.assertFalse(node.has_object_write_permission(self.member_request))
        self.assertFalse(node.has_object_write_permission(self.viewer_request))

        self.viewer_space.is_public = True
        self.viewer_space.save()

        self.assertTrue(node.has_object_read_permission(self.anonymous_request))
        self.assertTrue(node.has_object_read_permission(self.owner_request))
        self.assertTrue(node.has_object_read_permission(self.member_request))
        self.assertTrue(node.has_object_read_permission(self.viewer_request))

        self.assertFalse(node.has_object_write_permission(self.anonymous_request))
        self.assertFalse(node.has_object_write_permission(self.owner_request))
        self.assertFalse(node.has_object_write_permission(self.member_request))
        self.assertFalse(node.has_object_write_permission(self.viewer_request))

        self.viewer_space.is_public_writable = True
        self.viewer_space.save()

        self.assertTrue(node.has_object_write_permission(self.anonymous_request))
        self.assertTrue(node.has_object_write_permission(self.owner_request))
        self.assertTrue(node.has_object_write_permission(self.member_request))
        self.assertTrue(node.has_object_write_permission(self.viewer_request))

    def test_node_to_node_inheritance(self) -> None:
        """Test that the permissions are inherited from the parent node to its children."""
        parent_node = self.owner_space.nodes.first()
        child_node = node_factories.NodeFactory(space=self.owner_space)
        parent_node.subnodes.add(child_node)

        self.assertFalse(child_node.has_object_read_permission(self.anonymous_request))
        self.assertTrue(child_node.has_object_read_permission(self.owner_request))
        self.assertFalse(child_node.has_object_read_permission(self.member_request))
        self.assertFalse(child_node.has_object_read_permission(self.viewer_request))

        self.assertFalse(child_node.has_object_write_permission(self.anonymous_request))
        self.assertTrue(child_node.has_object_write_permission(self.owner_request))
        self.assertFalse(child_node.has_object_write_permission(self.member_request))
        self.assertFalse(child_node.has_object_write_permission(self.viewer_request))

        self.owner_space.is_public = True
        self.owner_space.is_public_writable = True
        self.owner_space.save()

        self.assertTrue(child_node.has_object_read_permission(self.anonymous_request))
        self.assertTrue(child_node.has_object_read_permission(self.owner_request))
        self.assertTrue(child_node.has_object_read_permission(self.member_request))
        self.assertTrue(child_node.has_object_read_permission(self.viewer_request))

        self.assertTrue(child_node.has_object_write_permission(self.anonymous_request))
        self.assertTrue(child_node.has_object_write_permission(self.owner_request))
        self.assertTrue(child_node.has_object_write_permission(self.member_request))
        self.assertTrue(child_node.has_object_write_permission(self.viewer_request))

    def test_node_to_node_inheritance_with_added_permissions(self) -> None:
        """Test that the permissions are inherited from the parent node to its children."""
        parent_node = self.owner_space.nodes.first()
        child_node = node_factories.NodeFactory(space=self.owner_space)
        parent_node.subnodes.add(child_node)

        self.assertFalse(child_node.has_object_read_permission(self.member_request))
        self.assertFalse(child_node.has_object_write_permission(self.member_request))

        factories.ObjectMembershipFactory(
            user=self.member_user, content_object=parent_node, role=self.member_role
        )

        self.assertTrue(child_node.has_object_read_permission(self.member_request))
        self.assertTrue(child_node.has_object_write_permission(self.member_request))
