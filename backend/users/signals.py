import typing

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django_rest_passwordreset.signals import (
    post_password_reset,
    reset_password_token_created,
)

from utils.urls import build_absolute_url

if typing.TYPE_CHECKING:
    from typing import Any

    from django import views
    from django_rest_passwordreset.models import ResetPasswordToken

    from users.models import User


@receiver(reset_password_token_created)
def password_reset_token_created(
    sender: "views.View",
    instance: "views.View",
    reset_password_token: "ResetPasswordToken",
    *args: "Any",
    **kwargs: "Any",
) -> None:
    """
    Handles password reset tokens
    When a token is created, an e-mail needs to be sent to the user
    """
    # Send an e-mail to the user
    context = {
        "current_user": reset_password_token.user,
        "email": reset_password_token.user.email,
        "reset_password_url": build_absolute_url(
            instance.request, f"/auth/reset-password/{reset_password_token.key}"
        ),
        "reset_token": reset_password_token.key,
    }

    # render email text
    email_html_message = render_to_string("email/user_reset_password.html", context)
    email_plaintext_message = render_to_string("email/user_reset_password.txt", context)

    msg = EmailMultiAlternatives(
        subject=f"{settings.EMAIL_SUBJECT_PREFIX} Password Reset",
        body=email_plaintext_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[reset_password_token.user.email],
    )
    msg.attach_alternative(email_html_message, "text/html")
    msg.send()


@receiver(post_password_reset)
def password_reset_done(
    sender: "views.View",
    user: "User",
    *args: "Any",
    **kwargs: "Any",
) -> None:
    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])
