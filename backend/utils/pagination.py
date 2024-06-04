import typing

import rest_framework.pagination
import rest_framework.response
from rest_framework.utils.urls import replace_query_param

if typing.TYPE_CHECKING:
    from django.db.models import QuerySet
    from rest_framework.request import Request
    from rest_framework.views import APIView

from django.db.models import Model

_MT = typing.TypeVar("_MT", bound=Model)


class NoCountLimitOffsetPagination(
    rest_framework.pagination.LimitOffsetPagination, typing.Generic[_MT]
):
    """LimitOffsetPagination that doesn't count the total number of objects."""

    def paginate_queryset(  # type: ignore[override]
        self, queryset: "QuerySet[_MT]", request: "Request", view: "APIView | None" = None
    ) -> list[_MT] | None:
        self.request = request
        self.limit = self.get_limit(request)
        if self.limit is None:
            return None

        self.offset = self.get_offset(request)
        self.display_page_controls = True

        return list(queryset[self.offset : self.offset + self.limit])

    def get_paginated_response(self, data: list[_MT]) -> rest_framework.response.Response:
        return rest_framework.response.Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema: dict[str, typing.Any]) -> dict[str, typing.Any]:
        return {
            "type": "object",
            "required": ["results"],
            "properties": {
                "next": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.org/accounts/?{offset_param}=400&{limit_param}=100".format(
                        offset_param=self.offset_query_param, limit_param=self.limit_query_param
                    ),
                },
                "previous": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.org/accounts/?{offset_param}=200&{limit_param}=100".format(
                        offset_param=self.offset_query_param, limit_param=self.limit_query_param
                    ),
                },
                "results": schema,
            },
        }

    def get_next_link(self) -> str | None:
        if self.request is None or self.offset is None or self.limit is None:
            return None

        url = self.request.build_absolute_uri()
        url = replace_query_param(url, self.limit_query_param, self.limit)

        offset = self.offset + self.limit
        return replace_query_param(url, self.offset_query_param, offset)

    def get_html_context(self) -> dict[str, str | None]:  # type: ignore[override]
        return {
            "previous_url": self.get_previous_link(),
            "next_url": self.get_next_link(),
        }

    def get_count(self, queryset: "QuerySet | typing.Sequence") -> int:
        raise NotImplementedError("get_count() is not implemented on this paginator.")
