from django.urls import include, path
from rest_framework.routers import DefaultRouter

from uploads import views

app_name = "uploads"

router = DefaultRouter()
router.register("uploads", views.UserUploadViewSet, basename="uploads")

urlpatterns = [
    path("", include(router.urls)),
]
