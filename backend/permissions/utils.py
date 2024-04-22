from functools import cache

from permissions import models


@cache
def get_owner_role() -> models.ObjectMembershipRole:
    """
    Get the owner role and cache it for the next call.
    These are loaded from fixtures, so they don't change.
    """
    return models.ObjectMembershipRole.objects.get(role=models.RoleOptions.OWNER)


@cache
def get_member_role() -> models.ObjectMembershipRole:
    """
    Get the owner role and cache it for the next call.
    These are loaded from fixtures, so they don't change.
    """
    return models.ObjectMembershipRole.objects.get(role=models.RoleOptions.MEMBER)


@cache
def get_viewer_role() -> models.ObjectMembershipRole:
    """
    Get the owner role and cache it for the next call.
    These are loaded from fixtures, so they don't change.
    """
    return models.ObjectMembershipRole.objects.get(role=models.RoleOptions.VIEWER)
