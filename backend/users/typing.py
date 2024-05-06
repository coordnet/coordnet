from django.contrib.auth.models import AnonymousUser

from users import models

AnyUserType = models.User | AnonymousUser
