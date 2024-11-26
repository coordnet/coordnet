from profiles import views
from utils import routers

app_name = "profiles"

router = routers.get_router()

router.register("profiles/profiles", views.ProfileModelViewSet, basename="profiles")
router.register("profiles/profile-cards", views.ProfileCardModelViewSet, basename="profile-cards")


urlpatterns = router.urls
