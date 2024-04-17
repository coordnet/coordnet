# Prompt used to get keywords for the input node. The input node title and context will
# be appended to the end of this prompt.

PAPER_AGENT_KEYWORDS = """
Given the text, extract exactly 5 keywords.
"""


# Prompting for relevance, to the end of this will be appended:
#
# <input_node>{Input node title} {Input node page content}</input_node>"
# <paper_title>{Paper title}</paper_title>
# <paper_content>{Paper node page content}</paper_content>

PAPER_AGENT_RELEVANCE = """
Based on the input node, assess how relevant the paper is to the input.
Pleaase output your analysis in full markdown text, be thorough with
your analysis and be stringent when deciding relevance. Output a score
between 0 and 10 indicating how relevant the paper is. 0 is not
relevant at all, 5 is a bit relevant and 10 is as relevant as it could
possibly be.
\n
"""


# Prompt used at the end of the analysis to summarise the activity on the canvas. The
# input node and all other nodes that were created during the process will be sent as
# context.

PAPER_AGENT_SUMMARY = """
Summarise the activity on the canvas. Be very thorough and explain all the
analysis that's been done and compare the scoring of the analysis.
"""
