from django.conf import settings
from rest_framework.routers import BaseRouter, DefaultRouter, SimpleRouter


class NamespacedDefaultRouter(DefaultRouter):
    def extend(self, router: BaseRouter, namespace: str | None = None) -> None:
        if namespace:
            for prefix, viewset, basename in router.registry:
                self.registry.append((prefix, viewset, f"{namespace}:{basename}"))
        else:
            self.registry.extend(router.registry)


class NamespacedSimpleRouter(SimpleRouter):
    def extend(self, router: BaseRouter, namespace: str | None = None) -> None:
        if namespace:
            for prefix, viewset, basename in router.registry:
                self.registry.append((prefix, viewset, f"{namespace}:{basename}"))
        else:
            self.registry.extend(router.registry)


def get_router() -> NamespacedSimpleRouter | NamespacedDefaultRouter:
    """Return the appropriate router based on the DEBUG setting."""
    if settings.DEBUG:
        return NamespacedDefaultRouter()
    return NamespacedSimpleRouter()
