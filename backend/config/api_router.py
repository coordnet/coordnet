from django.urls import include, path

from buddies import urls as buddies_urls
from nodes import urls as nodes_urls
from profiles import urls as profiles_urls
from tools import urls as tools_urls
from uploads import urls as uploads_urls
from users.api import urls as users_urls
from utils import routers

# By setting up the routes this way, we have a router in each app, yet still have a browsable API
# at the root URL.
router = routers.get_router()
router.extend(nodes_urls.router, namespace="nodes")
router.extend(buddies_urls.router, namespace="buddies")
router.extend(users_urls.router, namespace="auth")
router.extend(profiles_urls.router, namespace="profiles")
router.extend(tools_urls.router, namespace="tools")
router.extend(uploads_urls.router, namespace="uploads")

# The paths are defined in the respective urls.py files. This file is just a collection of all
# the paths from the different apps.
urlpatterns = router.urls + [
    path("", include("users.api.urls")),
    path("", include("nodes.urls")),
    path("", include("buddies.urls")),
    path("", include("profiles.urls")),
    path("", include("tools.urls")),
    path("", include("uploads.urls")),
]
