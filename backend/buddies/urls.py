from buddies import views
from utils import routers

app_name = "buddies"

router = routers.get_router()

router.register("buddies", views.BuddyModelViewSet, basename="buddies")

urlpatterns = router.urls
