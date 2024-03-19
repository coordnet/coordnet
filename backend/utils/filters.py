import typing
from copy import deepcopy

from django.db import models as django_models
from django_filters import ModelChoiceFilter, ModelMultipleChoiceFilter, filterset
from django_filters import rest_framework as filters
from django_filters.conf import settings as django_filters_settings
from django_filters.filterset import remote_queryset

FILTER_DEFAULTS = deepcopy(filterset.FILTER_FOR_DBFIELD_DEFAULTS)


class UUIDModelChoiceFilter(ModelChoiceFilter):
    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        kwargs["to_field_name"] = "public_id"
        super().__init__(*args, **kwargs)


class UUIDModelMultipleChoiceFilter(ModelMultipleChoiceFilter):
    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        kwargs["to_field_name"] = "public_id"
        super().__init__(*args, **kwargs)


# Forward relationships
FILTER_DEFAULTS[django_models.OneToOneField] = {
    "filter_class": UUIDModelChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}
FILTER_DEFAULTS[django_models.ForeignKey] = {
    "filter_class": UUIDModelChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "to_field_name": "public_id",
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}
FILTER_DEFAULTS[django_models.ManyToManyField] = {
    "filter_class": UUIDModelMultipleChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}

# Reverse relationships
FILTER_DEFAULTS[django_models.OneToOneRel] = {
    "filter_class": UUIDModelChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}
FILTER_DEFAULTS[django_models.ManyToOneRel] = {
    "filter_class": UUIDModelChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}
FILTER_DEFAULTS[django_models.ManyToManyRel] = {
    "filter_class": UUIDModelChoiceFilter,
    "extra": lambda f: {
        "queryset": remote_queryset(f),
        "null_label": django_filters_settings.NULL_CHOICE_LABEL if f.null else None,
    },
}


class BaseFilterSet(filters.FilterSet):
    """Custom BaseFilterSet that uses the public_id field instead of PKs for related lookups."""

    FILTER_DEFAULTS = FILTER_DEFAULTS


class BaseFilterBackend(filters.DjangoFilterBackend):
    """Custom BaseFilterBackend that uses the public_id field instead of PKs for related lookups."""

    filterset_base = BaseFilterSet
