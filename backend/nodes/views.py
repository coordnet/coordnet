from nodes import models, serializers
from utils import views


class NodeModelViewSet(views.BaseReadOnlyModelViewSet):
    """
    API endpoint that allows nodes to be viewed or edited.
    """

    queryset = models.Node.available_objects.all()
    serializer_class = serializers.NodeSerializer
    filterset_fields = ("spaces",)


class SpaceModelViewSet(views.BaseModelViewSet):
    """
    API endpoint that allows projects to be viewed or edited.
    """

    queryset = models.Space.available_objects.prefetch_related("nodes").all()
    serializer_class = serializers.SpaceSerializer
