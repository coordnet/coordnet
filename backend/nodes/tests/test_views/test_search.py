from django.urls import reverse

import nodes.models
from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class SearchViewTestCase(BaseTransactionTestCase):
    def test_search(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create(
            title="Sunny the barking dog", text="Sunny is a good dog."
        )

        factories.NodeFactory.create(title=node.title)
        space.nodes.add(node)
        parent_node = factories.NodeFactory.create(title="something else", text="")
        space.nodes.add(parent_node)
        parent_node.subnodes.add(node)

        with self.assertNumQueries(4):
            response = self.owner_client.get(reverse("nodes:search"), {"q": node.title})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)

        response = self.owner_client.get(reverse("nodes:search"), {"q": "not existing"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 0)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": node.title}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(node.public_id))
        self.assertEqual(len(response.data["results"][0]["parents"]), 1)
        self.assertEqual(response.data["results"][0]["parents"][0], parent_node.public_id)

        response = self.owner_client.get(
            reverse("nodes:search"), {"space": str(space.public_id), "q": "not existing"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 0)

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
        self.assertEqual(len(response.data["results"]), 0)

    def test_node_type_filter(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        method_node = factories.MethodNodeFactory.create(
            title="Sheila the cat", text="Sheila is a good cat.", owner=self.owner_user
        )
        default_node = factories.NodeFactory.create(
            title="Sunny the barking dog", text="Sunny is a good dog.", space=space
        )

        response = self.owner_client.get(reverse("nodes:search"), {"q": "good"})
        self.assertEqual(response.status_code, 200)
        print(response.data)
        self.assertEqual(len(response.data["results"]), 2)

        response = self.owner_client.get(
            reverse("nodes:search"),
            {"q": "good", "node_type": nodes.models.NodeType.METHOD},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(method_node.public_id))

        response = self.owner_client.get(
            reverse("nodes:search"),
            {"q": "good", "node_type": nodes.models.NodeType.DEFAULT},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(default_node.public_id))
