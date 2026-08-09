from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.chatbot_service import ChatbotService
from core.permissions import HasModulePermission


class ChatbotQueryView(APIView):
    """POST /api/v1/chatbot/query/ — org-scoped inventory Q&A."""

    module_permission = "forecasting"
    permission_classes = [HasModulePermission]

    def post(self, request):
        message = request.data.get("message") or request.data.get("query") or ""
        if not str(message).strip():
            return Response(
                {"success": False, "error": "message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        org = request.user.organization
        if not org and not request.user.is_superuser:
            return Response(
                {"success": False, "error": "No organization associated with this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = ChatbotService.ask(organization=org, message=str(message))
        return Response({"success": True, "data": result})
