from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomerProfile
from .models import CustomerAccount

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'username', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data, role='customer')
        user.set_password(password)
        user.save()
        return user


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomerProfile
        fields = ['date_of_birth', 'profile_picture', 'notes']


class UserSerializer(serializers.ModelSerializer):
    profile = CustomerProfileSerializer(read_only=True)

    class Meta:
        model  = User
        fields = ['id', 'email', 'username', 'phone', 'address', 'role', 'profile', 'created_at']
        read_only_fields = ['id', 'role', 'created_at']




class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'phone', 'address', 'role', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'created_at']        

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()


class CustomerAccountSerializer(serializers.ModelSerializer):
    total_orders = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, required=False)

    class Meta:
        model = CustomerAccount
        fields = ['id', 'name', 'email', 'phone', 'address', 'created_at', 'total_orders', 'total_spent']