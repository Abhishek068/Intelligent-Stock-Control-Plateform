from django.contrib.auth.models import AbstractUser

from django.db import models



from core.models import Organization





class User(AbstractUser):

    class Role(models.TextChoices):

        ADMIN = "admin", "Admin"

        MANAGER = "manager", "Manager"

        STAFF = "staff", "Staff"



    email = models.EmailField(unique=True)

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)

    organization = models.ForeignKey(

        Organization,

        on_delete=models.CASCADE,

        related_name="users",

    )

    department = models.CharField(max_length=100, blank=True)

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)



    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = ["username", "first_name", "last_name"]



    class Meta:

        ordering = ["email"]

        indexes = [

            models.Index(fields=["organization", "role"]),

        ]



    def __str__(self):

        return self.email



    @property

    def is_admin_role(self):

        return self.role == self.Role.ADMIN



    @property

    def is_manager_role(self):

        return self.role == self.Role.MANAGER



    @property

    def is_staff_role(self):

        return self.role == self.Role.STAFF



    @property

    def display_name(self):

        full = self.get_full_name().strip()

        return full or self.email

