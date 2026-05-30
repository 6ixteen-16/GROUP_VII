from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

from .serializers import (
    UserSerializer, RegisterSerializer, ChangePasswordSerializer,
    UserMinimalSerializer, AdminUserCreateSerializer
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            # Distinguish "inactive account" from "wrong credentials".
            # simplejwt returns the same error code for both — we detect the
            # difference by checking whether the user exists but is inactive.
            username = attrs.get(self.username_field, '')
            try:
                candidate = User.objects.get(**{self.username_field: username})
                if not candidate.is_active:
                    raise AuthenticationFailed(
                        "Your account is pending administrator approval. "
                        "Please wait until an admin activates your account.",
                        "account_pending_approval",
                    )
            except User.DoesNotExist:
                pass
            raise  # wrong credentials — re-raise the original error

        # Extra safeguard (should never reach here if is_active=False,
        # but keeps behaviour consistent if backends change).
        if not self.user.is_active:
            raise AuthenticationFailed(
                "Your account is pending administrator approval.",
                "account_pending_approval",
            )

        data['user'] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class AdminCreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # FIX: use is_staff OR role == 'admin' — both conditions individually
        # grant access, not just the combination.
        if not (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
            return Response(
                {"detail": "Only administrators can perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    # BUG 1 FIX: was missing permission_classes entirely.
    # Without this, AnonymousUser reaches get_queryset() and crashes on
    # user.is_admin_user (AttributeError) → 500, which breaks the admin UI.
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'is_admin_user', False):
            return User.objects.all()
        return User.objects.filter(is_active=True)


class UserDetailView(generics.RetrieveUpdateAPIView):
    # BUG 2 FIX: same issue as UserListView — was missing permission_classes.
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'is_admin_user', False):
            return User.objects.all()
        return User.objects.filter(id=user.id)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisors_list(request):
    """Returns workplace and academic supervisors for dropdowns."""
    role = request.query_params.get('role')
    qs = User.objects.filter(is_active=True)
    if role:
        qs = qs.filter(role=role)
    else:
        qs = qs.filter(role__in=['workplace_supervisor', 'academic_supervisor'])
    return Response(UserMinimalSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_list(request):
    students = User.objects.filter(role='student', is_active=True)
    return Response(UserMinimalSerializer(students, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Send a password-reset link to the given email address."""
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Return success anyway to avoid user-enumeration
        return Response({'detail': 'If that email exists, a reset link has been sent.'})

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

    send_mail(
        subject='ILES — Password Reset Request',
        message=(
            f'Hello {user.get_full_name() or user.username},\n\n'
            f'You requested a password reset for your ILES account.\n'
            f'Click the link below to set a new password:\n\n'
            f'{reset_link}\n\n'
            f'This link expires in 24 hours.\n'
            f'If you did not request this, please ignore this email.\n\n'
            f'— ILES Team'
        ),
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return Response({'detail': 'If that email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Verify the uid+token and set a new password."""
    uid = request.data.get('uid', '')
    token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')

    if not all([uid, token, new_password]):
        return Response({'detail': 'uid, token and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_pk)
    except (TypeError, ValueError, User.DoesNotExist):
        return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'This reset link has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password has been reset successfully. You can now log in.'})
