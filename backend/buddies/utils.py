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
    if score >= 8:
        return "#76CA48"
    if score >= 5:
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
    data = {
        "spaceId": space_id,
        "graphId": graph_id,
        "edges": [edge.model_dump() for edge in edges],
        "nodes": [node.model_dump() for node in nodes],
    }
    r = requests.post(url, json=data, headers=headers)
    r.raise_for_status()


def add_to_node_page(node_id: str, content: str) -> None:
    """Add content to a node page."""
    logging.info(f"Adding content to node page: {node_id}")
    url = f"{settings.WEBSOCKET_API_URL}/add-to-node-page"
    data = {"nodeId": node_id, "content": content}
    r = requests.post(url, json=data, header=headers)
    r.raise_for_status()
