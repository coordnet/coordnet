from django.contrib import admin

import profiles.models

admin.site.register(profiles.models.Profile)
admin.site.register(profiles.models.ProfileCard)
