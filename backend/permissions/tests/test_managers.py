import nodes.models
import permissions.models
import permissions.utils
from nodes.tests import factories as nodes_factories
from utils.testcases import BaseTestCase


class MembershipModelQuerySetMixinTestCase(BaseTestCase):
    def test_role_annotations(self) -> None:
        """Test that the user_roles annotation is added to the queryset."""
        # TODO: Split this test into multiple smaller tests
        owner = self.owner_user
        node = nodes_factories.NodeFactory.create()
        subnodes = nodes_factories.NodeFactory.create_batch(10)
        node.subnodes.set(subnodes)

        # Check that the nodes don't have any permissions by default.
        with self.assertNumQueries(1):
            node_queryset = nodes.models.Node.available_objects.annotate_user_permissions(
                user=owner
            )

            # Force evaluation of the queryset
            repr(node_queryset)

        self.assertEqual(node_queryset.count(), 11)
        for result_node in node_queryset:
            self.assertEqual(result_node.user_roles, [])

        # Check that a space transfers the permissions to its nodes.
        viewer = self.viewer_user
        space = nodes_factories.SpaceFactory.create(viewer=viewer)
        space.nodes.set(subnodes)
        space.nodes.add(node)

        with self.assertNumQueries(1):
            node_queryset = nodes.models.Node.available_objects.annotate_user_permissions(
                user=viewer
            )

            # Force evaluation of the queryset
            repr(node_queryset)

        self.assertEqual(node_queryset.count(), 11)
        for result_node in node_queryset:
            self.assertEqual(result_node.user_roles, [permissions.models.RoleOptions.VIEWER])

        # # Check that multiple roles are correctly annotated.
        # second_space = nodes_factories.SpaceFactory.create(viewer=viewer)
        # node.spaces.add(second_space)
        # for subnode in subnodes:
        #     subnode.spaces.add(second_space)
        #
        # with self.assertNumQueries(1):
        #     node_queryset = nodes.models.Node.available_objects.annotate_user_permissions(
        #         user=viewer
        #     )
        #
        #     # Force evaluation of the queryset
        #     repr(node_queryset)
        #
        # # TODO: Doubling the number of queries for a second space is not ideal.
        # self.assertEqual(node_queryset.count(), 11)
        # for result_node in node_queryset:
        #     self.assertSetEqual(
        #         set(result_node.user_roles),
        #         {permissions.models.RoleOptions.OWNER, permissions.models.RoleOptions.VIEWER},
        #     )

        # Now test the same with a public space, for this we use the member user, who doesn't have
        # any permissions at the moment
        member = self.member_user

        with self.assertNumQueries(1):
            space_queryset = nodes.models.Space.available_objects.annotate_user_permissions(
                user=member
            )

            # Force evaluation of the queryset
            repr(space_queryset)

        self.assertEqual(space_queryset.count(), 1)
        for result_space in space_queryset:
            self.assertEqual(result_space.user_roles, [])

        # Check that the space transfers the public permissions to its nodes.
        space.is_public = True
        space.save()

        with self.assertNumQueries(1):
            space_queryset = nodes.models.Space.available_objects.annotate_user_permissions(
                user=member
            )

            # Force evaluation of the queryset
            repr(space_queryset)

        self.assertEqual(space_queryset.count(), 1)
        for result_space in space_queryset:
            self.assertEqual(result_space.user_roles, [permissions.models.RoleOptions.VIEWER])

        with self.assertNumQueries(1):
            node_queryset = nodes.models.Node.available_objects.annotate_user_permissions(
                user=member
            )

            # Force evaluation of the queryset
            repr(node_queryset)

        self.assertEqual(node_queryset.count(), 11)
        for result_node in node_queryset:
            self.assertListEqual(result_node.user_roles, [permissions.models.RoleOptions.VIEWER])

        # Now soft delete the space and check that the permissions are not transferred anymore
        space.delete()

        with self.assertNumQueries(1):
            node_queryset = nodes.models.Node.available_objects.annotate_user_permissions(
                user=member
            )

            # Force evaluation of the queryset
            repr(node_queryset)

        self.assertEqual(node_queryset.count(), 11)
        for result_node in node_queryset:
            self.assertListEqual(result_node.user_roles, [])
