from django_filters import rest_framework as filters

import utils.filters as coord_filters
from nodes import models


class DocumentVersionFilterSet(filters.FilterSet):
    # TODO: Look at this when/if setting up permissions for browsable API
    document = coord_filters.UUIDModelMultipleChoiceFilter(
        queryset=models.Document.objects.all(), field_name="document__public_id"
    )
    document_type = filters.CharFilter(lookup_expr="iexact")

    class Meta:
        model = models.DocumentVersion
        fields = ["document", "document_type"]
