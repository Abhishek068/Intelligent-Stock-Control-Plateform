from audit.models import ActivityLog





def get_client_ip(request):

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")

    if forwarded:

        return forwarded.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")





def log_activity(

    *,

    user,

    action,

    entity_type,

    entity_id,

    entity_name="",

    before=None,

    after=None,

    details="",

    request=None,

):

    ip_address = get_client_ip(request) if request else None

    return ActivityLog.objects.create(

        user=user,

        action=action,

        entity_type=entity_type,

        entity_id=str(entity_id),

        entity_name=entity_name,

        before_json=before,

        after_json=after,

        details=details,

        ip_address=ip_address,

    )

