import argparse
import hashlib
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai.models.registry import ModelRegistry


def verify_checksum(path: Path, expected: str | None) -> None:
    if not expected:
        return
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected.lower():
        path.unlink(missing_ok=True)
        raise RuntimeError(f"Checksum mismatch for {path.name}: {digest}")


def download_model(name: str, registry: ModelRegistry) -> Path:
    entry = registry.entries[name]
    destination = registry.weights_path(name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        verify_checksum(destination, entry.get("sha256"))
        return destination
    if entry["provider"] == "ultralytics":
        from ultralytics.utils.downloads import attempt_download_asset

        downloaded = Path(attempt_download_asset(entry["filename"]))
        if downloaded.resolve() != destination.resolve():
            shutil.move(str(downloaded), destination)
    elif entry["provider"] == "huggingface":
        from huggingface_hub import hf_hub_download

        downloaded = Path(hf_hub_download(repo_id=entry["repository"], filename=entry["filename"]))
        shutil.copy2(downloaded, destination)
    else:
        raise ValueError(f"Unsupported provider: {entry['provider']}")
    verify_checksum(destination, entry.get("sha256"))
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description="Download a configured retail AI model.")
    parser.add_argument("model", choices=ModelRegistry().entries.keys())
    args = parser.parse_args()
    registry = ModelRegistry()
    path = download_model(args.model, registry)
    model = registry.load_yolo(args.model)
    model.predict(source=np.zeros((320, 320, 3), dtype="uint8"), device="cpu", verbose=False)
    print(f"Verified {args.model}: {path}")


if __name__ == "__main__":
    main()