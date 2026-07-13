from django.conf import settings

from django.db import models





class ActivityLog(models.Model):

                                        



    user = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.PROTECT,

        related_name="activity_logs",

    )

    entity_type = models.CharField(max_length=50)

    entity_id = models.CharField(max_length=50)

    entity_name = models.CharField(max_length=255, blank=True)

    action = models.CharField(max_length=100)

    before_json = models.JSONField(null=True, blank=True)

    after_json = models.JSONField(null=True, blank=True)

    details = models.TextField(blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)



    class Meta:

        ordering = ["-created_at"]

        indexes = [

            models.Index(fields=["entity_type", "entity_id"]),

            models.Index(fields=["user", "created_at"]),

        ]



    def save(self, *args, **kwargs):

        if self.pk and ActivityLog.objects.filter(pk=self.pk).exists():

            raise ValueError("ActivityLog records are immutable and cannot be updated.")

        super().save(*args, **kwargs)



    def delete(self, *args, **kwargs):

        raise ValueError("ActivityLog records are immutable and cannot be deleted.")



    def __str__(self):

        return f"{self.action} on {self.entity_type}:{self.entity_id}"

