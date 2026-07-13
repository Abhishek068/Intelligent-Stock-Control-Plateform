from django.contrib.auth.backends import ModelBackend



from accounts.models import User





class EmailAuthBackend(ModelBackend):

    def authenticate(self, request, username=None, password=None, **kwargs):

        email = kwargs.get("email") or username

        if email is None or password is None:

            return None

        try:

            user = User.objects.get(email__iexact=email)

        except User.DoesNotExist:

            User().set_password(password)

            return None

        if user.check_password(password) and self.user_can_authenticate(user):

            return user

        return None



    def get_user(self, user_id):

        try:

            return User.objects.get(pk=user_id)

        except User.DoesNotExist:

            return None

