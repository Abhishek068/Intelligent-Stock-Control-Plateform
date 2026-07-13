from rest_framework.views import exception_handler

from rest_framework.response import Response

from rest_framework import status





def custom_exception_handler(exc, context):

    response = exception_handler(exc, context)



    if response is not None:

        response.data = {

            "success": False,

            "error": response.data,

        }

        return response



    if isinstance(exc, ValueError):

        return Response(

            {"success": False, "error": str(exc)},

            status=status.HTTP_400_BAD_REQUEST,

        )



    return response

