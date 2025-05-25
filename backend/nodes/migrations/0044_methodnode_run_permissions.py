from django.db import migrations


def set_methodnode_run_owners(apps, schema_editor):
    """
    Set the existing user as the owner for all existing MethodNodeRun objects.
    """
    MethodNodeRun = apps.get_model("nodes", "MethodNodeRun")
    ObjectMembershipRole = apps.get_model("permissions", "ObjectMembershipRole")
    ObjectMembership = apps.get_model("permissions", "ObjectMembership")
    ContentType = apps.get_model("contenttypes", "ContentType")

    # Get the content type for MethodNodeRun, if it exists. If it does not exist, we assume the
    # initial migration has not been run yet.
    try:
        content_type = ContentType.objects.get(app_label="nodes", model="methodnoderun")
    except ContentType.DoesNotExist:
        pass

    # Get the owner role, but only if MethodNodeRun data exists, we assume the owner role has been
    # created by the initial migration.
    if MethodNodeRun.objects.exists():
        try:
            owner_role = ObjectMembershipRole.objects.get(role="owner")
        except ObjectMembershipRole.DoesNotExist as exc:
            raise ValueError(
                "Owner role does not exist. Please run the initial migration first."
            ) from exc

    # Create ObjectMembership for each MethodNodeRun
    for run in MethodNodeRun.objects.all():
        # Check if an ObjectMembership already exists for this run and user
        if not ObjectMembership.objects.filter(
            content_type=content_type, object_id=run.id, user=run.user
        ).exists():
            # Create a new ObjectMembership
            ObjectMembership.objects.create(
                content_type=content_type, object_id=run.id, user=run.user, role=owner_role
            )


def reverse_methodnode_run_owners(apps, schema_editor):
    """
    Remove all ObjectMembership objects for MethodNodeRun objects.
    """
    ObjectMembership = apps.get_model("permissions", "ObjectMembership")
    ContentType = apps.get_model("contenttypes", "ContentType")

    # Get the content type for MethodNodeRun, if it exists. If it does not exist, we assume the
    # initial migration has not been run yet.
    try:
        content_type = ContentType.objects.get(app_label="nodes", model="methodnoderun")
    except ContentType.DoesNotExist:
        pass

    # Delete all ObjectMembership objects for MethodNodeRun
    ObjectMembership.objects.filter(content_type=content_type).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("nodes", "0043_remove_methodnoderun_nodes_metho_public__89eb37_idx_and_more"),
        ("permissions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(set_methodnode_run_owners, reverse_methodnode_run_owners),
    ]
