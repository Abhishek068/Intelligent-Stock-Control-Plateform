from django.contrib.auth import authenticate

from rest_framework import status

from rest_framework.permissions import AllowAny

from rest_framework.response import Response

from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken



from accounts.models import User

from accounts.serializers import LoginSerializer, UserSerializer

from audit.services import get_client_ip, log_activity





class LoginView(APIView):

    permission_classes = [AllowAny]



    def post(self, request):

        serializer = LoginSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)



        email = serializer.validated_data["email"]

        password = serializer.validated_data["password"]



        user = authenticate(request, username=email, password=password)

        if user is None:

            try:

                user_obj = User.objects.get(email=email)

                if not user_obj.check_password(password):

                    user = None

            except User.DoesNotExist:

                user = None



        if user is None or not user.is_active:

            return Response(

                {"success": False, "error": "Invalid email or password."},

                status=status.HTTP_401_UNAUTHORIZED,

            )



        user.last_login_ip = get_client_ip(request)

        user.save(update_fields=["last_login_ip"])



        refresh = RefreshToken.for_user(user)

        log_activity(

            user=user,

            action="Login",

            entity_type="User",

            entity_id=user.id,

            entity_name=user.display_name,

            request=request,

        )



        return Response(

            {

                "success": True,

                "data": {

                    "access": str(refresh.access_token),

                    "refresh": str(refresh),

                    "user": UserSerializer(user).data,

                },

            }

        )





class MeView(APIView):

    def get(self, request):

        return Response({"success": True, "data": UserSerializer(request.user).data})





class LogoutView(APIView):

    def post(self, request):

        refresh_token = request.data.get("refresh")

        if refresh_token:

            try:

                token = RefreshToken(refresh_token)

                token.blacklist()

            except Exception:

                pass

        log_activity(

            user=request.user,

            action="Logout",

            entity_type="User",

            entity_id=request.user.id,

            entity_name=request.user.display_name,

            request=request,

        )

        return Response({"success": True, "data": {"message": "Logged out successfully."}})

