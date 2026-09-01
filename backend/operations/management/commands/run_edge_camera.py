from django.core.management.base import BaseCommand, CommandError

from ai.models.registry import ModelNotAvailableError
from ai.pipeline import RetailVisionPipeline
from ai.sources.opencv_source import OpenCVVideoSource
from operations.ai_views import persist_analysis
from operations.models import Device, Store


class Command(BaseCommand):
    help = "Runs local inference against a webcam, phone stream, video file, or RTSP source."

    def add_arguments(self, parser) -> None:
        parser.add_argument("source", help="Camera index, HTTP/RTSP URL, or local video path")
        parser.add_argument("--store-id", type=int)
        parser.add_argument("--device-id", type=int)
        parser.add_argument("--frames", type=int, default=0, help="Stop after N frames; zero runs continuously")

    def handle(self, *args, **options) -> None:
        store = Store.objects.filter(id=options["store_id"]).first() if options["store_id"] else Store.objects.first()
        if store is None:
            raise CommandError("Create a store before starting the edge camera.")
        device = Device.objects.filter(id=options["device_id"], store=store).first() if options["device_id"] else None
        try:
            pipeline = RetailVisionPipeline.from_registry()
            with OpenCVVideoSource(options["source"]) as source:
                processed = 0
                while not options["frames"] or processed < options["frames"]:
                    analysis = pipeline.analyze(source.read())
                    persist_analysis(analysis, store, device)
                    processed += 1
                    self.stdout.write(f"frame={processed} people={len(analysis.people)} queue={analysis.queue_length} latency_ms={analysis.latency_ms}")
        except (ModelNotAvailableError, RuntimeError) as error:
            raise CommandError(str(error)) from error