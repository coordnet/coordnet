from django.urls import reverse

from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class SearchViewTestCase(BaseTransactionTestCase):
    def test_search(self) -> None:
        response = self.owner_client.get(reverse("nodes:search"))
        self.assertEqual(response.status_code, 400)

        node = factories.NodeFactory.create(
            owner=self.owner_user, title="Sunny the barking dog", text="Sunny is a good dog."
        )
        with self.assertNumQueries(4):
            response = self.owner_client.get(reverse("nodes:search"), {"q": node.title})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        response = self.owner_client.get(reverse("nodes:search"), {"q": "not existing"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_search_with_space(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create(
            owner=self.owner_user, title="Sunny the barking dog", text="Sunny is a good dog."
        )

        factories.NodeFactory.create(owner=self.owner_user, title=node.title)
        space.nodes.add(node)
        parent_node = factories.NodeFactory.create(
            owner=self.owner_user, title="something else", text=""
        )
        space.nodes.add(parent_node)
        parent_node.subnodes.add(node)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": node.title}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(node.public_id))
        self.assertEqual(len(response.data["results"][0]["parents"]), 1)
        self.assertEqual(response.data["results"][0]["parents"][0], parent_node.public_id)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": "not existing"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_search_with_not_owned_objects(self) -> None:
        space = factories.SpaceFactory.create()
        node = factories.NodeFactory.create(
            title="Sunny the barking dog", text="Sunny is a good dog."
        )
        space.nodes.add(node)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": node.title}
        )
        self.assertEqual(response.status_code, 400, response.data)

        response = self.owner_client.get(reverse("nodes:search"), {"q": "not existing"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
