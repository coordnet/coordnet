import os
import typing

import pqapi
import pqapi.models
from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView
from smolagents import (
    CodeAgent,
    GoogleSearchTool,
    # HfApiModel,
    LiteLLMModel,
    ToolCallingAgent,
)

import tools.serializers
from tools.open_deep_research.text_inspector_tool import TextInspectorTool
from tools.open_deep_research.text_web_browser import (
    ArchiveSearchTool,
    FinderTool,
    FindNextTool,
    PageDownTool,
    PageUpTool,
    SimpleTextBrowser,
    VisitTool,
)
from tools.open_deep_research.visual_qa import visualizer

if typing.TYPE_CHECKING:
    import rest_framework.request


AUTHORIZED_IMPORTS = [
    "requests",
    "zipfile",
    "os",
    "pandas",
    "numpy",
    "sympy",
    "json",
    "bs4",
    "pubchempy",
    "xml",
    "yahoo_finance",
    "Bio",
    "sklearn",
    "scipy",
    "pydub",
    "io",
    "PIL",
    "chess",
    "PyPDF2",
    "pptx",
    "datetime",
    "fractions",
    "csv",
]


class PaperQAView(APIView):
    def post(self, request: "rest_framework.request.Request") -> Response:
        serializer = tools.serializers.PaperQAQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        response = pqapi.agent_query(
            query=validated_data["question"],
            bibliography=validated_data.get("bibliography"),
            named_template=validated_data.get("named_template"),
        )

        return Response(response)


class DeepResearchView(APIView):
    def post(self, request: "rest_framework.request.Request") -> Response:
        serializer = tools.serializers.DeepResearchQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # needed?
        # load_dotenv(override=True)
        # login(os.getenv("HF_TOKEN"))

        # Why?
        # append_answer_lock = threading.Lock()

        custom_role_conversions = {"tool-call": "assistant", "tool-response": "user"}

        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"

        BROWSER_CONFIG = {
            "viewport_size": 1024 * 5,
            "downloads_folder": "downloads_folder",
            "request_kwargs": {
                "headers": {"User-Agent": user_agent},
                "timeout": 300,
            },
            "serpapi_key": settings.SERPAPI_API_KEY,
        }

        os.makedirs(f"./{BROWSER_CONFIG['downloads_folder']}", exist_ok=True)

        def create_agent(model_id):
            model_params = {
                "model_id": model_id,
                "custom_role_conversions": custom_role_conversions,
                "max_completion_tokens": 8192,
            }
            if model_id[:2] in ("o1", "o3"):
                model_params["reasoning_effort"] = validated_data["reasoning_effort"]
            model = LiteLLMModel(**model_params)

            text_limit = 100000
            browser = SimpleTextBrowser(**BROWSER_CONFIG)
            WEB_TOOLS = [
                GoogleSearchTool(provider="serpapi"),
                VisitTool(browser),
                PageUpTool(browser),
                PageDownTool(browser),
                FinderTool(browser),
                FindNextTool(browser),
                ArchiveSearchTool(browser),
                TextInspectorTool(model, text_limit),
            ]
            text_webbrowser_agent = ToolCallingAgent(
                model=model,
                tools=WEB_TOOLS,
                max_steps=20,
                verbosity_level=2,
                planning_interval=4,
                name="search_agent",
                description="""A team member that will search the internet to answer your question.
            Ask him for all your questions that require browsing the web.
            Provide him as much context as possible, in particular if you need to search on a specific timeframe!
            And don't hesitate to provide him with a complex search task, like finding a difference between two webpages.
            Your request must be a real sentence, not a google search! Like "Find me this information (...)" rather than a few keywords.
            """,
                provide_run_summary=True,
            )
            text_webbrowser_agent.prompt_templates["managed_agent"][
                "task"
            ] += """You can navigate to .txt online files.
            If a non-html page is in another format, especially .pdf or a Youtube video, use tool 'inspect_file_as_text' to inspect it.
            Additionally, if after some searching you find out that you need more information to answer the question, you can use `final_answer` with your request for clarification as argument to request for more information."""

            manager_agent = CodeAgent(
                model=model,
                tools=[visualizer, TextInspectorTool(model, text_limit)],
                max_steps=12,
                verbosity_level=2,
                additional_authorized_imports=AUTHORIZED_IMPORTS,
                planning_interval=4,
                managed_agents=[text_webbrowser_agent],
            )

            return manager_agent

        agent = create_agent(model_id=validated_data["model"])

        answer = agent.run(validated_data["question"])

        return Response(answer)
