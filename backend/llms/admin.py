import django.contrib.admin

import llms.models

django.contrib.admin.site.register(llms.models.LLModel)
