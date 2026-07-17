from activity.models import ActivityEvent


def record_activity(
    *,
    organization=None,
    user=None,
    event_type,
    title,
    description="",
    entity_type="",
    entity_id="",
    metadata=None,
):
    org = organization
    if org is None and user is not None:
        org = getattr(user, "organization", None)
    return ActivityEvent.objects.create(
        organization=org,
        user=user,
        event_type=event_type,
        title=title,
        description=description,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else "",
        metadata=metadata or {},
    )
