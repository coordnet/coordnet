from django.contrib import admin

from nodes import models

admin.site.register(models.Document)
admin.site.register(models.DocumentEvent)
admin.site.register(models.Node)
admin.site.register(models.Space)
