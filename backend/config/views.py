from django.conf import settings
from django.views.generic import TemplateView

from llms.models import LLModel


class HomeView(TemplateView):
    template_name = "pages/home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["api_url"] = settings.API_URL
        context["websocket_url"] = settings.WEBSOCKET_URL
        context["crdt_url"] = settings.CRDT_URL
        context["available_llms"] = {
            llm.identifier: llm.name for llm in LLModel.objects.filter(is_available=True)
        }
        return context
