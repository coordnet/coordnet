from django.urls import path

import tools.views
from utils import routers

app_name = "tools"

router = routers.get_router()
router.register(
    "tools/paperqa-collections", tools.views.PaperQACollectionViewSet, basename="paperqa-collection"
)

urlpatterns = router.urls
urlpatterns += [
    path("tools/paperqa/", tools.views.PaperQAView.as_view(), name="paperqa-external"),
    path("tools/futurehouse/", tools.views.FutureHouseView.as_view(), name="futurehouse"),
    path(
        "tools/futurehouse/status/<str:task_id>/",
        tools.views.FutureHouseTaskStatusView.as_view(),
        name="futurehouse-status",
    ),
    path("tools/markitdown/", tools.views.MarkItDownView.as_view(), name="markitdown"),
]
