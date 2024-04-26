from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser

from users import models

AnyUserType = models.User | AbstractBaseUser | AnonymousUser
