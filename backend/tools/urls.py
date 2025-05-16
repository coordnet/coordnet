from django.urls import path

import tools.views
from utils import routers

app_name = "tools"

router = routers.get_router()

urlpatterns = router.urls
urlpatterns += [
    path("tools/paperqa/", tools.views.LocalPDFQueryView.as_view(), name="paperqa-local"),
    path("tools/paperqa/external/", tools.views.PaperQAView.as_view(), name="paperqa-external"),
    path("tools/markitdown/", tools.views.MarkItDownView.as_view(), name="markitdown"),
]
