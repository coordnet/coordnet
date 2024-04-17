import logging
import uuid
from typing import Any

import requests
from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class GraphNode(BaseModel):
    """A node in a graph."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str | None = None
    data: dict[str, Any] | None = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """An edge connecting two nodes in a graph."""

    source: str
    target: str


class LLMAnalysis(BaseModel):
    """An analysis of the relevance of a paper."""

    analysis: str
    score: float


class LLMKeywords(BaseModel):
    """A list of keywords extracted from the input text."""

    keywords: list[str]


def score_color(score: float) -> str:
    """Return a color based on the score."""
    if not score:
        return "#000000"
    if score >= 8.0:
        return "#76CA48"
    if score >= 5.0:
        return "#F2A33A"
    return "#EA6441"


def query_semantic(query: list[str]) -> list[dict]:
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    headers = {"x-api-key": settings.SEMANTIC_API_KEY}
    fields = [
        "title",
        "year",
        "referenceCount",
        "citationCount",
        "authors",
        "url",
        "abstract",
        "isOpenAccess",
    ]
    params = {"query": ", ".join(query), "fields": ",".join(fields)}
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    logging.info(f"Querying semantic: {response.json()}")
    return response.json()["data"]


headers = {"Authorization": f"Token {settings.WEBSOCKET_API_KEY}"}


def add_to_graph(
    space_id: str,
    graph_id: str,
    nodes: list[GraphNode] | None = None,
    edges: list[GraphEdge] | None = None,
) -> None:
    """Add nodes and edges to a graph."""
    if nodes is None:
        nodes = []
    if edges is None:
        edges = []

    logging.info(f"Adding nodes to graph: {nodes}")
    url = f"{settings.WEBSOCKET_API_URL}/add-to-graph"
    json_data = {
        "spaceId": space_id,
        "graphId": graph_id,
        "edges": [edge.model_dump() for edge in edges],
        "nodes": [node.model_dump() for node in nodes],
    }
    r = requests.post(url, json=json_data, headers=headers)
    r.raise_for_status()


def set_node_page(node_id: str, content: str) -> None:
    """Add content to a node page."""
    logging.info(f"Adding content to node page: {node_id}")
    url = f"{settings.WEBSOCKET_API_URL}/set-node-page"
    json_data = {"nodeId": node_id, "content": content}
    r = requests.post(url, json=json_data, headers=headers)
    r.raise_for_status()


def update_node(
    space_id: str,
    node_id: str,
    graph_id: str,
    title: str,
    data: dict[Any, Any] | None = None,
) -> None:
    """Update a nodes title"""
    logging.info(f"Updating node title: {node_id}")
    url = f"{settings.WEBSOCKET_API_URL}/update-node"
    json_data: dict[str, Any] = {
        "spaceId": space_id,
        "graphId": graph_id,
        "nodeId": node_id,
        "title": title,
    }
    if data:
        json_data["data"] = data
    r = requests.post(url, json=json_data, headers=headers)
    r.raise_for_status()
