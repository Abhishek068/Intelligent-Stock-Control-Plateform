from django.contrib import admin

from emails.models import (
    EmailLog,
    EmailProviderConfig,
    EmailQueue,
    EmailTemplate,
    ScheduledReport,
)

admin.site.register(EmailTemplate)
admin.site.register(EmailQueue)
admin.site.register(EmailLog)
admin.site.register(EmailProviderConfig)
admin.site.register(ScheduledReport)
