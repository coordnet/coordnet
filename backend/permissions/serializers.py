from rest_framework import serializers

from permissions import models
from users import models as user_models
from utils import serializers as utils_serializers


class ObjectPermissionModelSerializer(utils_serializers.BaseSerializer[models.ObjectMembership]):
    """
    Serializer for the ObjectPermission model.
    Because of our currently simple role setup, role is replaced by a simple string and translated
    into the corresponding ObjectMembershipRole object in the to_internal_value method.
    """

    role = serializers.ChoiceField(choices=models.RoleOptions.choices)
    user = serializers.EmailField()

    def to_representation(self, instance: models.ObjectMembership) -> dict:
        representation = super().to_representation(instance)
        representation["role"] = instance.role.role
        representation["user"] = instance.user.email
        return representation

    def validate_role(self, value: str) -> models.ObjectMembershipRole:
        value = value.lower()
        if value not in models.RoleOptions(value):
            raise serializers.ValidationError("Role does not exist.")

        try:
            return models.ObjectMembershipRole.objects.get(role=value)
        except models.ObjectMembershipRole.DoesNotExist as exc:
            raise serializers.ValidationError("Role does not exist.") from exc

    def validate_user(self, value: str) -> user_models.User:
        try:
            return user_models.User.objects.get(email=value)
        except user_models.User.DoesNotExist as exc:
            raise serializers.ValidationError("User does not exist.") from exc

    def create(self, validated_data: dict) -> models.ObjectMembership:
        return self.Meta.model.objects.create(
            **validated_data, content_object=self.context["content_object"]
        )

    class Meta(utils_serializers.BaseSerializer.Meta):
        model = models.ObjectMembership
        exclude = (utils_serializers.BaseSerializer.Meta.exclude or []) + [
            "content_type",
            "object_id",
        ]
