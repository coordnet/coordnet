import datetime
import typing
import uuid
import re

import django.core.validators
import imagekit.models
import imagekit.processors
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

import nodes.models
import profiles.utils
import utils.models
import utils.typing
from permissions.models import READ

if typing.TYPE_CHECKING:
    from django.db.models.base import ModelBase
    from rest_framework import request


# We have to explicitly create every function because Django migrations can't handle dynamic
# function creation it seems.
def unique_profile_image_filename(instance: utils.models.BaseModel, filename: str) -> str:
    file_components = filename.split(".")

    path = f"profiles/images/{instance.public_id}/{uuid.uuid4()}"
    if len(file_components) > 1:
        path += f".{file_components[-1]}"
    return path


def unique_banner_image_filename(instance: utils.models.BaseModel, filename: str) -> str:
    file_components = filename.split(".")

    path = f"profiles/banner_images/{instance.public_id}/{uuid.uuid4()}"
    if len(file_components) > 1:
        path += f".{file_components[-1]}"
    return path


def unique_profile_card_image_filename(instance: utils.models.BaseModel, filename: str) -> str:
    file_components = filename.split(".")

    path = f"profiles/card_images/{instance.public_id}/{uuid.uuid4()}"
    if len(file_components) > 1:
        path += f".{file_components[-1]}"
    return path


class Profile(utils.models.BaseModel):
    """
    A profile can be for a user or a space, but not both.
    """

    user = models.OneToOneField("users.User", on_delete=models.CASCADE, null=True, blank=True)
    space = models.OneToOneField("nodes.Space", on_delete=models.CASCADE, null=True, blank=True)

    cards = models.ManyToManyField("profiles.ProfileCard", related_name="profiles", blank=True)

    profile_slug = models.SlugField(max_length=255, unique=True)
    title = models.CharField(max_length=512)
    description = models.TextField(blank=True)
    draft = models.BooleanField(default=True)  # TODO: This is now supposed to be is_public instead.

    profile_image_original = models.ImageField(
        upload_to=unique_profile_image_filename,
        null=True,
        blank=True,
        validators=[django.core.validators.validate_image_file_extension],
    )
    profile_image = imagekit.models.ImageSpecField(
        source="profile_image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(200, 200)],
    )
    profile_image_2x = imagekit.models.ImageSpecField(
        source="profile_image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(400, 400)],
    )
    banner_image_original = models.ImageField(
        upload_to=unique_banner_image_filename,
        null=True,
        blank=True,
        validators=[django.core.validators.validate_image_file_extension],
    )
    banner_image = imagekit.models.ImageSpecField(
        source="banner_image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(1200, 320)],
    )
    banner_image_2x = imagekit.models.ImageSpecField(
        source="banner_image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(2400, 640)],
    )

    website = models.URLField(null=True, blank=True)
    telegram_url = models.CharField(max_length=255, null=True, blank=True)
    twitter_url = models.CharField(max_length=255, null=True, blank=True)
    bluesky_url = models.CharField(max_length=255, null=True, blank=True)

    # For spaces
    members = models.ManyToManyField("self", related_name="spaces", symmetrical=False, blank=True)

    # For users
    eth_address = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        validators=[
            django.core.validators.RegexValidator(
                regex=r"^0x[a-fA-F0-9]{40}$", message="Invalid Ethereum address."
            )
        ],
    )

    @property
    def related_object_creation_date(self) -> datetime.datetime | None:
        if self.user:
            return self.user.date_joined
        if self.space:
            return self.space.created_at
        return None

    @staticmethod
    def get_visible_cards_filter_expression(user: "utils.typing.HttpRequestUser") -> models.Q:
        if not user or user == AnonymousUser():
            return models.Q(draft=False)
        return (
            models.Q(draft=False)
            | models.Q(profiles__user=user)
            | models.Q(
                nodes.models.Space.get_user_has_permission_filter(
                    action=READ, user=user, prefix="profiles__space"
                )
            )
        )

    @staticmethod
    def get_visible_members_filter_expression() -> models.Q:
        return models.Q(draft=False)

    def visible_cards(
        self, user: "utils.typing.HttpRequestUser | None" = None
    ) -> "models.QuerySet[ProfileCard]":
        if not user or user == AnonymousUser():
            return self.cards.filter(draft=False)
        if self.user == user or (self.space and self.space.has_object_manage_permission(user=user)):
            return self.cards.all()
        return self.cards.filter(draft=False)

    def visible_members(
        self, user: "utils.typing.HttpRequestUser | None" = None
    ) -> "models.QuerySet[Profile]":
        if not user or user == AnonymousUser():
            return self.members.filter(draft=False)
        return Profile.objects.none()

    def clean(self) -> None:
        super().clean() 

        if self.user and self.space:
            raise ValidationError("Profile must be either for a user or a space, not both.")
        if not self.user and not self.space:
            raise ValidationError("Profile must be either for a user or a space.")
        if self.user and self.members.exists():
            raise ValidationError("User profiles cannot have members.")

        telegram_pattern = r'^https:\/\/t\.me\/[a-zA-Z0-9_]+$'
        twitter_pattern = r'^https:\/\/twitter\.com\/[a-zA-Z0-9_]+$'
        bluesky_pattern = r'^https:\/\/bsky\.app\/profile\/[a-zA-Z0-9_]+$'

        if self.telegram_url and not re.match(telegram_pattern, self.telegram_url):
            raise ValidationError({'telegram_url': 'Invalid Telegram URL format.'})

        if self.twitter_url and not re.match(twitter_pattern, self.twitter_url):
            raise ValidationError({'twitter_url': 'Invalid Twitter URL format.'})

        if self.bluesky_url and not re.match(bluesky_pattern, self.bluesky_url):
            raise ValidationError({'bluesky_url': 'Invalid Bluesky URL format.'})

    def save(
        self,
        force_insert: "bool | tuple[ModelBase, ...]" = False,
        force_update: bool = False,
        using: str | None = None,
        update_fields: typing.Iterable[str] | None = None,
    ) -> None:
        if not self.id:
            # Only set the slug automatically when creating the Profile.
            if self.profile_slug:
                profile_slug = slugify(self.profile_slug)
            elif self.title:
                profile_slug = slugify(self.title)
            else:
                profile_slug = "profile"
            self.profile_slug = profile_slug
            while Profile.objects.filter(profile_slug=self.profile_slug).exists():
                self.title_slug = f"{profile_slug}-{profiles.utils.random_string(4)}"

        super().save(force_insert, force_update, using, update_fields)

    def __str__(self) -> str:
        if self.user:
            return f"{self.user.email}"
        if self.space:
            return f"{self.space.title}"
        return str(self.public_id)

    @staticmethod
    def has_read_permission(request: "request.Request") -> bool:
        return True

    def has_object_read_permission(self, request: "request.Request") -> bool:
        return (
            not self.draft
            or self.user == request.user
            or bool(self.space and self.space.has_object_manage_permission(request=request))
        )

    @staticmethod
    def has_write_permission(request: "request.Request") -> bool:
        return True

    def has_object_write_permission(self, request: "request.Request") -> bool:
        return self.user == request.user or bool(
            self.space and self.space.has_object_manage_permission(request=request)
        )


def validate_user_profile_public(value: int) -> None:
    user_profile = Profile.objects.get(pk=value, user__isnull=False)
    if user_profile.draft:
        raise ValidationError("User profile is not public.")


def validate_space_profile_public(value: int) -> None:
    space_profile = Profile.objects.get(pk=value, space__isnull=False)
    if space_profile.draft:
        raise ValidationError("Space profile is not public.")


class ProfileCard(utils.models.BaseModel):
    title = models.CharField(max_length=512)
    description = models.TextField()
    status_message = models.TextField(blank=True)
    created_by = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="+")
    draft = models.BooleanField(default=True)

    author_profile = models.ForeignKey(
        "Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="author_cards",
        validators=[validate_user_profile_public],
    )
    space_profile = models.ForeignKey(
        "Profile",
        on_delete=models.SET_NULL,
        related_name="+",
        null=True,
        blank=True,
        validators=[validate_space_profile_public],
    )
    image_original = models.ImageField(
        upload_to=unique_profile_card_image_filename,
        null=True,
        blank=True,
        validators=[django.core.validators.validate_image_file_extension],
    )
    image = imagekit.models.ImageSpecField(
        source="image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(800, 320)],
    )
    image_2x = imagekit.models.ImageSpecField(
        source="image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(1600, 640)],
    )
    image_thumbnail = imagekit.models.ImageSpecField(
        source="image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(200, 80)],
    )
    image_thumbnail_2x = imagekit.models.ImageSpecField(
        source="image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(400, 160)],
    )
    url = models.CharField(
        null=True,
        blank=True,
        max_length=200,
        validators=[
            django.core.validators.RegexValidator(
                regex=r"^\/[a-zA-Z0-9_\-\/]*$", message="URL must be a local absolute path."
            )
        ],
    )
    video_url = models.URLField(null=True, blank=True)

    def __str__(self) -> str:
        profile_list = list(map(str, self.profiles.all()))
        if not profile_list:
            return f"Not in any profile: {self.title}"
        return f"{', '.join(profile_list)}: {self.title}"

    def has_object_read_permission(self, request: "request.Request") -> bool:
        if not self.draft:
            return True
        if request.user:
            if self.created_by == request.user or (
                self.author_profile and self.author_profile.user == request.user
            ):
                return True
        return False

    def has_object_write_permission(self, request: "request.Request") -> bool:
        if request.user:
            if self.created_by == request.user or (
                self.author_profile and self.author_profile.user == request.user
            ):
                return True
        return False
