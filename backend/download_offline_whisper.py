import os
import requests
from pathlib import Path

DEST_DIR = Path(__file__).resolve().parent / "ai" / "models" / "whisper-tiny"
DEST_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://huggingface.co/Systran/faster-whisper-tiny/resolve/main/"
FILES = ["config.json", "tokenizer.json", "vocabulary.txt", "model.bin"]

print("=" * 60)
print(f"DOWNLOADING LOCAL OFFLINE WHISPER MODEL TO: {DEST_DIR}")
print("=" * 60)

url = BASE_URL + "model.bin"
dest_path = DEST_DIR / "model.bin"
existing_bytes = dest_path.stat().st_size if dest_path.exists() else 0

total_len = 75538270  # exact size of model.bin

if existing_bytes >= total_len:
    print(f"[OK] model.bin already fully downloaded ({existing_bytes / (1024*1024):.2f} MB).")
else:
    headers = {"Range": f"bytes={existing_bytes}-"}
    print(f"Resuming model.bin from {existing_bytes / (1024*1024):.2f} MB to {total_len / (1024*1024):.2f} MB...")
    with requests.get(url, stream=True, headers=headers, timeout=120) as r:
        r.raise_for_status()
        downloaded = existing_bytes
        with open(dest_path, "ab") as f:
            for chunk in r.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    pct = (downloaded / total_len) * 100
                    print(f"\r  -> Progress: {pct:.1f}% ({downloaded / (1024*1024):.2f} / {total_len / (1024*1024):.2f} MB)", end="", flush=True)
    print("\n[DONE] Saved model.bin successfully.")



print("\nVerifying offline Whisper model loading...")
from faster_whisper import WhisperModel

model = WhisperModel(str(DEST_DIR), device="cpu", compute_type="int8")
print("SUCCESS: Local Offline Faster-Whisper Model Loaded Successfully from disk!")
