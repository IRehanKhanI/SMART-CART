import json
import os
from pathlib import Path
from typing import Any

AI_ROOT = Path(__file__).resolve().parents[1]


class ModelNotAvailableError(RuntimeError):
    pass


class ModelRegistry:
    def __init__(self, registry_path: str | Path | None = None, models_dir: str | Path | None = None) -> None:
        self.registry_path = Path(registry_path or AI_ROOT / "models" / "registry.json")
        self.models_dir = Path(models_dir or os.environ.get("RETAIL_AI_MODELS_DIR", AI_ROOT / "models"))
        with self.registry_path.open(encoding="utf-8") as registry_file:
            self.entries: dict[str, dict[str, Any]] = json.load(registry_file)
        self._loaded: dict[str, Any] = {}

    def weights_path(self, name: str) -> Path:
        if name not in self.entries:
            raise KeyError(f"Unknown model: {name}")
        return self.models_dir / self.entries[name]["filename"]

    def load_yolo(self, name: str):
        if name in self._loaded:
            return self._loaded[name]
        path = self.weights_path(name)
        if not path.exists():
            raise ModelNotAvailableError(f"Model '{name}' is not downloaded. Run: python scripts/download_models.py {name}")
        from ultralytics import YOLO

        model = YOLO(str(path))
        self._loaded[name] = model
        return model

    def readiness(self) -> dict[str, dict[str, Any]]:
        return {name: {"available": self.weights_path(name).exists(), "path": str(self.weights_path(name)), **entry} for name, entry in self.entries.items()}