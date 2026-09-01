from urllib.parse import urlparse

from django.http import HttpResponse


class LocalDevelopmentCorsMiddleware:
    """Allow the local dashboard to call this edge backend during development."""

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def is_local_origin(origin: str | None) -> bool:
        if not origin:
            return False
        parsed = urlparse(origin)
        return parsed.scheme in {"http", "https"} and parsed.hostname in {"localhost", "127.0.0.1"}

    def __call__(self, request):
        origin = request.headers.get("Origin")
        is_local = self.is_local_origin(origin)
        if request.method == "OPTIONS" and is_local:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if is_local:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
        return response