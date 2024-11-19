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
        space = nodes_factories.SpaceFactory.create()

        # Check that the space doesn't have any permissions by default.
        with self.assertNumQueries(1):
            space_queryset = nodes.models.Space.available_objects.annotate_user_permissions(
                user=owner
            )

            # Force evaluation of the queryset
            repr(space_queryset)

        self.assertEqual(space_queryset.count(), 1)
        self.assertEqual(space_queryset.first().user_roles, [])
        space.delete()

        # Check that space permissions get annotated correctly.
        viewer = self.viewer_user
        space = nodes_factories.SpaceFactory.create(viewer=viewer)

        with self.assertNumQueries(1):
            space_queryset = nodes.models.Space.available_objects.annotate_user_permissions(
                user=viewer
            )

            # Force evaluation of the queryset
            repr(space_queryset)

        self.assertEqual(space_queryset.count(), 1)
        self.assertEqual(space_queryset.first().user_roles, [permissions.models.RoleOptions.VIEWER])

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

        # Now soft delete the space and check that the permissions are not transferred anymore
        space.delete()
