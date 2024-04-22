from django.contrib import admin

from permissions import models

admin.site.register(models.ObjectMembership)
admin.site.register(models.ObjectMembershipRole)
