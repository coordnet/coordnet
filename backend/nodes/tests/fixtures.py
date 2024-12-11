EDITOR_WITHOUT_NODES = {
    "default": {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"text": "Test This is node 2!", "type": "text"}],
            }
        ],
    }
}

EDITOR_WITH_NODES = {
    "default": {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"text": "Test", "type": "text"}]},
            {"type": "paragraph"},
            {
                "type": "CoordNode",
                "attrs": {"id": "ee11e624-9439-4e21-9bd1-e6ac016f7f3a"},
            },
            {"type": "paragraph"},
            {"type": "paragraph", "content": [{"text": "Test", "type": "text"}]},
            {
                "type": "paragraph",
                "content": [{"type": "hardBreak"}, {"text": "Hey", "type": "text"}],
            },
        ],
    }
}

SPACE = {
    "nodes": {
        "e5750bb8-15ca-4029-8ad5-5a19af3291c1": {
            "id": "e5750bb8-15ca-4029-8ad5-5a19af3291c1",
            "title": "ASDFGC",
        },
        "ee11e624-9439-4e21-9bd1-e6ac016f7f3a": {
            "id": "ee11e624-9439-4e21-9bd1-e6ac016f7f3a",
            "title": "Node 2",
        },
        "56cf2d65-c646-4354-b394-09aad918341f": {
            "id": "56cf2d65-c646-4354-b394-09aad918341f",
            "title": "Hello! Test OMG Tet test Test",
        },
        "0fce8b5a-de7f-416e-9738-324cefc0eb41": {
            "id": "0fce8b5a-de7f-416e-9738-324cefc0eb41",
            "title": "This is <b>my</b> new label",
        },
    },
    "deletedNodes": [],
}

GRAPH: dict[str, dict] = {
    "edges": {},
    "nodes": {
        "e5750bb8-15ca-4029-8ad5-5a19af3291c1": {
            "id": "e5750bb8-15ca-4029-8ad5-5a19af3291c1",
            "data": {"id": "e5750bb8-15ca-4029-8ad5-5a19af3291c1"},
            "type": "GraphNode",
            "style": {"width": 161, "height": 73},
            "width": 161,
            "height": 73,
            "dragging": False,
            "position": {"x": 280, "y": 216.5},
            "resizing": False,
            "selected": False,
            "positionAbsolute": {"x": 280, "y": 216.5},
        }
    },
}
