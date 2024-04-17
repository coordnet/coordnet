import logging
import time

import instructor
import openai
from celery import shared_task
from django.conf import settings

from buddies.agent_prompts import (
    PAPER_AGENT_KEYWORDS,
    PAPER_AGENT_RELEVANCE,
    PAPER_AGENT_SUMMARY,
)
from buddies.models import Buddy
from buddies.utils import (
    GraphEdge,
    GraphNode,
    LLMAnalysis,
    LLMKeywords,
    add_to_graph,
    add_to_node_page,
    query_semantic,
    score_color,
)
from nodes.models import Node

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def paper_buddy(buddy_id: str, space_id: str, graph_id: str, node_id: str) -> None:
    """
    Find related papers and analyze their relevance.
    """
    buddy = Buddy.available_objects.get(public_id=buddy_id)
    node = Node.available_objects.get(public_id=node_id)

    # Patch the OpenAI client
    client = instructor.from_openai(openai.OpenAI(api_key=settings.OPENAI_API_KEY))

    keywords = client.chat.completions.create(
        model=buddy.model,
        response_model=LLMKeywords,
        messages=[
            {
                "role": "user",
                "content": PAPER_AGENT_KEYWORDS + f"\n\n{node.title} {node.text}",
            }
        ],
    )

    # Add keyword node to the graph
    keywords_node = GraphNode(
        title=f"Keywords: {', '.join(keywords.keywords[0:4])}",
        content=None,
        data={"borderColor": "#5B28CE"},
    )
    keywords_edge = GraphEdge(source=node_id, target=keywords_node.id)
    add_to_graph(space_id, graph_id, [keywords_node], [keywords_edge])

    # Search for papers from semantic based on keywords
    semantic_response = query_semantic(keywords.keywords[0:4])

    # Add the papers to the graph
    paper_nodes = []
    for paper in semantic_response[0:5]:
        content = f"**URL:** {paper['url']}\n\n"
        content += f"**Year:** {paper.get('year', 'N/A')}\n\n"
        content += f"**Reference Count:** {paper.get('referenceCount')}\n\n"
        content += f"**Citation Count:** {paper.get('citationCount')}\n\n"
        content += f"**Is Open Access:** {'Yes' if paper.get('isOpenAccess') else 'No'}\n\n"
        if "openAccessPdf" in paper:
            content += f"**Open Access PDF:** {paper['openAccessPdf'].get('url')}\n\n"
        authors = ", ".join([author["name"] for author in paper.get("authors", [])])
        content += f"\n\n**Authors:** {authors}\n\n"
        content += f"**Abstract:** {paper.get('abstract')}\n\n"
        new_node = GraphNode(title=paper["title"], content=content)
        paper_nodes.append(new_node)

    # Add the paper nodes to the graph
    paper_edges = [GraphEdge(source=keywords_node.id, target=node.id) for node in paper_nodes]
    add_to_graph(space_id, graph_id, paper_nodes, paper_edges)

    input_node = f"<input_node>{node.title} {node.text}</input_node>"

    # Analyze the relevance of the papers
    query_node_ids = []
    for paper_node in paper_nodes:
        paper_prompt = PAPER_AGENT_RELEVANCE
        paper_prompt += f"{input_node}\n"
        paper_prompt += f"<paper_title>{paper_node.title}</paper_title>\n"
        paper_prompt += f"<paper_content>{paper_node.content}</paper_content>"

        # Add the query node to the graph
        query_node = GraphNode(
            title="Does the paper seem relevant?",
            content=paper_prompt.replace(f"{input_node}", f"**Input Node:** {node_id}")
            .replace(f"<paper_content>{paper_node.content}</paper_content>", "")
            .replace("<paper_title>", "\n\n**Paper Title:** ")
            .replace("</paper_title>", ""),
            data={"borderColor": "#5B28CE"},
        )
        query_node_ids.append(query_node.id)
        query_edge = GraphEdge(source=paper_node.id, target=query_node.id)
        add_to_graph(space_id, graph_id, [query_node], [query_edge])

        # Query for analysis from LLM
        analysis = client.chat.completions.create(
            model=buddy.model,
            response_model=LLMAnalysis,
            messages=[{"role": "user", "content": paper_prompt}],
        )

        # Add analysis to the graph
        analysis_node = GraphNode(
            title=f"Analysis: {paper_node.title}",
            content=f"""**Score:** {analysis.score}\n\n{analysis.analysis}""",
            data={"borderColor": score_color(analysis.score)},
        )
        query_node_ids.append(analysis_node.id)
        edge = GraphEdge(source=query_node.id, target=analysis_node.id)
        add_to_graph(space_id, graph_id, [analysis_node], [edge])

    # Sleep to wait for nodes to become available
    time.sleep(5)

    node_ids = [keywords_node.id, *[node.id for node in paper_nodes], *query_node_ids]
    nodes = Node.available_objects.filter(public_id__in=node_ids)
    response_chunks = []

    for chunk in buddy.query_model(nodes, 2, PAPER_AGENT_SUMMARY):
        response_chunks.append(chunk)

    add_to_node_page(graph_id, "".join(response_chunks))
