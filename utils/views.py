from rest_framework import viewsets


class BaseModelViewSet(viewsets.ModelViewSet):
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"


class BaseReadOnlyModelViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"
