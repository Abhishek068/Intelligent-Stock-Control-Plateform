from rest_framework import viewsets





class OrganizationScopedViewSet(viewsets.ModelViewSet):

                                                                                     



    organization_field = "organization"



    def get_organization(self):

        return self.request.user.organization



    def get_queryset(self):

        queryset = super().get_queryset()

        return queryset.filter(**{self.organization_field: self.get_organization()})



    def perform_create(self, serializer):

        serializer.save(**{self.organization_field: self.get_organization()})

