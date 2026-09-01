from importlib import import_module


class PaddleOcrAdapter:
    def __init__(self, language: str = "en") -> None:
        try:
            paddleocr = import_module("paddleocr")
        except ModuleNotFoundError as error:
            raise RuntimeError("PaddleOCR is optional and not installed. Install it in a separate compatible process.") from error
        self.engine = paddleocr.PaddleOCR(lang=language, use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)

    def read(self, image) -> list:
        return self.engine.predict(image)