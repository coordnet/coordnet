from nodes import views
from utils import routers

app_name = "nodes"

router = routers.get_router()

router.register("nodes/nodes", views.NodeModelViewSet, basename="nodes")
router.register("nodes/spaces", views.SpaceModelViewSet, basename="spaces")
router.register("nodes/versions", views.DocumentVersionModelViewSet, basename="document-versions")

urlpatterns = router.urls