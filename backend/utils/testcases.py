from django import test
from rest_framework import test as drf_test


@test.override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    PASSWORD_HASHERS=("django.contrib.auth.hashers.UnsaltedMD5PasswordHasher",),
)
class BaseAPITransactionTestCase(drf_test.APITransactionTestCase):
    pass


@test.override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    PASSWORD_HASHERS=("django.contrib.auth.hashers.UnsaltedMD5PasswordHasher",),
)
class BaseAPITestCase(drf_test.APITestCase):
    pass


@test.override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    PASSWORD_HASHERS=("django.contrib.auth.hashers.UnsaltedMD5PasswordHasher",),
)
class BaseTestCase(test.TestCase):
    pass
