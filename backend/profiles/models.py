import typing
import uuid

import django.core.validators
import imagekit.models
import imagekit.processors
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

import profiles.utils
import utils.models

if typing.TYPE_CHECKING:
    import users.models


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
    profile_slug = models.SlugField(max_length=255, unique=True)
    title = models.CharField(max_length=512)
    description = models.TextField()
    is_public = models.BooleanField(default=False)

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
    def related_object(self):
        if self.user:
            return self.user
        if self.space:
            return self.space

    def clean(self):
        if self.user and self.space:
            raise ValidationError("Profile must be either for a user or a space, not both.")
        if not self.user and not self.space:
            raise ValidationError("Profile must be either for a user or a space.")
        if self.user and self.members.exists():
            raise ValidationError("User profiles cannot have members.")

    def save(self, *args, **kwargs):
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

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        if self.user:
            return f"{self.user.email} Profile"
        if self.space:
            return f"{self.space.title} Profile"
        return str(self.public_id)


def validate_user_profile_public(value: "users.models.User") -> None:
    if not value.profile or (value.profile and not value.profile.is_public):
        raise ValidationError("User profile is not public.")


class ProfileCard(utils.models.BaseModel):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="cards")
    title = models.CharField(max_length=512)
    description = models.TextField()
    author = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="cards",
        validators=[validate_user_profile_public],
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
    image_thumbnail = imagekit.models.ImageSpecField(
        source="image_original",
        format="JPEG",
        options={"quality": 90, "optimize": True},
        processors=[imagekit.processors.ResizeToFill(200, 80)],
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
        return f"{self.profile}: {self.title}"
