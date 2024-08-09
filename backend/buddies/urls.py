from django.urls import path, re_path

from buddies import consumers, views
from utils import routers

app_name = "buddies"

router = routers.get_router()

router.register("buddies", views.BuddyModelViewSet, basename="buddies")

urlpatterns = router.urls + [
    re_path(r"llm/.*", view=views.proxy_to_openai, name="proxy_to_openai"),
]


websocket_urlpatterns = [
    path(r"buddies/<uuid:public_id>/", consumers.QueryConsumer.as_asgi()),
]
