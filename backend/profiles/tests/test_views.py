# Test permission filter, we're filtering out space__is_removed=True, but what happens if no space
# is set?
from django.urls import reverse

import nodes.tests.factories as node_factories
import profiles.models
import profiles.tests.factories as profile_factories
from utils.testcases import BaseTransactionTestCase


class ProfileViewTestCase(BaseTransactionTestCase):
    def test_user_profile_list(self) -> None:
        response = self.owner_client.get(reverse("profiles:profiles-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["user"], self.owner_user.public_id)
        self.assertEqual(response.data["results"][0]["space"], None)
        self.assertEqual(response.data["results"][0]["draft"], True)

        self.viewer_user.profile.draft = False
        self.viewer_user.profile.save()

        response = self.owner_client.get(reverse("profiles:profiles-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_space_profile_list(self) -> None:
        space = node_factories.SpaceFactory(owner=self.owner_user)
        response = self.owner_client.get(
            reverse("profiles:profiles-list"), {"profile_type": "space"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["user"], None)
        self.assertEqual(response.data["results"][0]["space"], space.public_id)

    def test_query_count(self) -> None:
        profile_factories.UserProfileFactory.create_batch(10, draft=False)
        profile_factories.SpaceProfileFactory.create_batch(10, draft=False)

        with self.assertNumQueries(4):
            response = self.owner_client.get(reverse("profiles:profiles-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 21)

    def test_profile_retrieve(self) -> None:
        user_profile = profile_factories.UserProfileFactory()
        response = self.owner_client.get(
            reverse("profiles:profiles-detail", args=[user_profile.public_id])
        )
        self.assertEqual(response.status_code, 403)

        user_profile.draft = False
        user_profile.save()

        profile_factories.ProfileCardFactory.create_batch(
            5, author_profile=user_profile, created_by=self.owner_user
        )
        member_profiles = profile_factories.UserProfileFactory.create_batch(5, draft=False)
        for member_profile in member_profiles:
            user_profile.members.add(member_profile)

        with self.assertNumQueries(3):
            response = self.owner_client.get(
                reverse("profiles:profiles-detail", args=[user_profile.public_id])
            )
        self.assertEqual(response.status_code, 200)

    def test_profile_update(self) -> None:
        response = self.owner_client.patch(
            reverse("profiles:profiles-detail", args=[self.viewer_user.profile.public_id]),
            {"title": "new title"},
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.patch(
            reverse("profiles:profiles-detail", args=[self.owner_user.profile.public_id]),
            {"title": "new title"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "new title")

    def test_profile_delete(self) -> None:
        response = self.owner_client.delete(
            reverse("profiles:profiles-detail", args=[self.viewer_user.profile.public_id])
        )
        self.assertEqual(response.status_code, 405)

        response = self.owner_client.delete(
            reverse("profiles:profiles-detail", args=[self.owner_user.profile.public_id])
        )
        self.assertEqual(response.status_code, 405)


class ProfileCardTestCase(BaseTransactionTestCase):
    def test_profile_card_list(self) -> None:
        response = self.owner_client.get(reverse("profiles:profile-cards-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        profile_factories.ProfileCardFactory.create_batch(
            10, author_profile=self.owner_user.profile, created_by=self.owner_user
        )

        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("profiles:profile-cards-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_profile_card_retrieve(self) -> None:
        profile_card = profile_factories.ProfileCardFactory(
            author_profile=self.owner_user.profile, title="title", description="description"
        )
        response = self.owner_client.get(
            reverse("profiles:profile-cards-detail", args=[profile_card.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(profile_card.public_id))

    def test_profile_card_create(self) -> None:
        self.owner_user.profile.draft = False
        self.owner_user.profile.save()

        response = self.owner_client.post(
            reverse("profiles:profile-cards-list"),
            {
                "author_profile": self.owner_user.profile.public_id,
                "title": "title",
                "description": "description",
            },
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            response.data["author_profile"]["id"], str(self.owner_user.profile.public_id)
        )
        self.assertEqual(response.data["title"], "title")
        self.assertEqual(response.data["description"], "description")

    def test_profile_card_update(self) -> None:
        self.owner_user.profile.draft = False
        self.owner_user.profile.save()

        profile_card = profile_factories.ProfileCardFactory(
            author_profile=self.owner_user.profile, title="title", description="description"
        )

        response = self.owner_client.patch(
            reverse("profiles:profile-cards-detail", args=[profile_card.public_id]),
            {"title": "new title"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "new title")

    def test_profile_card_delete(self) -> None:
        self.owner_user.profile.draft = False
        self.owner_user.profile.save()

        profile_card = profile_factories.ProfileCardFactory(
            author_profile=self.owner_user.profile, title="title", description="description"
        )

        response = self.owner_client.delete(
            reverse("profiles:profile-cards-detail", args=[profile_card.public_id])
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            profiles.models.ProfileCard.objects.filter(public_id=profile_card.public_id).exists()
        )
