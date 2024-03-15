import typing
from urllib.parse import urljoin

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django_rest_passwordreset.models import ResetPasswordToken
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from utils.serializers import BaseSerializer

if typing.TYPE_CHECKING:
    from collections.abc import Mapping
    from typing import Any

User = get_user_model()


class UserSerializer(BaseSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name="auth:user-detail", lookup_field="public_id"
    )

    class Meta:
        model = User
        fields = ["name", "email", "id", "url"]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="This email address is already in use.",
            )
        ],
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "password", "name"]

    def __send_verification_email(self, token: ResetPasswordToken) -> None:
        """Email the user with a verification link."""
        # TODO: This should be a Celery task, but I didn't set up Celery yet.
        # Send an e-mail to the user
        context = {
            "current_user": token.user,
            "email": token.user.email,
            "verify_email_url": urljoin(settings.FRONTEND_URL, f"/auth/verify-email/{token.key}"),
            "verify_token": token.key,
        }

        # render email text
        email_html_message = render_to_string("email/user_verify_email.html", context)
        email_plaintext_message = render_to_string("email/user_verify_email.txt", context)

        msg = EmailMultiAlternatives(
            subject="coordnet.dev - Email Verification",
            body=email_plaintext_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[token.user.email],
        )
        msg.attach_alternative(email_html_message, "text/html")
        msg.send()

    def create(self, validated_data: "Mapping[str, Any]") -> "Mapping[str, Any]":
        user = User.objects.create(
            email=validated_data["email"], name=validated_data["name"], is_active=False
        )
        user.set_password(validated_data["password"])
        user.save()

        # Create a "reset token" for the user, that will be used to verify their email address.
        token = ResetPasswordToken.objects.create(user=user)
        self.__send_verification_email(token)
        return {"email": user.email, "name": user.name, "id": user.public_id}


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )

    def validate_old_password(self, old_password: str) -> str:
        """Check that the old password is correct."""
        if not self.context["request"].user.check_password(old_password):
            raise serializers.ValidationError("Old password is incorrect.")
        return old_password
