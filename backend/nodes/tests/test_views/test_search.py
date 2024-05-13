from django.urls import reverse

from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class SearchViewTestCase(BaseTransactionTestCase):
    def test_search(self) -> None:
        response = self.owner_client.get(reverse("nodes:search"))
        self.assertEqual(response.status_code, 400)

        node = factories.NodeFactory.create(owner=self.owner_user, title="Sunny the dog barks")
        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:search"), {"q": node.title})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        response = self.owner_client.get(reverse("nodes:search"), {"q": "not existing"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_search_with_space(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create(owner=self.owner_user, title="Sunny the dog barks")
        factories.NodeFactory.create(owner=self.owner_user, title=node.title)
        space.nodes.add(node)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": node.title}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 1)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": "not existing"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_search_with_not_owned_objects(self) -> None:
        space = factories.SpaceFactory.create()
        node = factories.NodeFactory.create(title="Sunny the dog barks")
        space.nodes.add(node)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": node.title}
        )
        self.assertEqual(response.status_code, 400, response.data)

        response = self.owner_client.get(reverse("nodes:search"), {"q": "node.title"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
