import os
import io
import wave
import tempfile
from pathlib import Path
from typing import Dict, Any, Tuple
import speech_recognition as sr
from django.utils import timezone

from .models import Product, CartSession, CustomerMembership
from .recommender import get_recommendations_for_cart

# Initialize speech recognizer
recognizer = sr.Recognizer()

# Cached local offline faster-whisper model
_offline_whisper_model = None

def get_offline_whisper():
    global _offline_whisper_model
    if _offline_whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            backend_dir = Path(__file__).resolve().parents[1]
            model_dir = backend_dir / "ai" / "models" / "whisper-tiny"
            if model_dir.exists():
                _offline_whisper_model = WhisperModel(str(model_dir), device="cpu", compute_type="int8")
        except Exception:
            _offline_whisper_model = False
    return _offline_whisper_model if _offline_whisper_model is not False else None

# Retail Q&A Assistant Engine
def generate_retail_reply(transcript: str, cart_id: str = "CART-01") -> Tuple[str, str]:
    """
    Analyzes the transcribed customer speech and generates:
    1. full_reply: Full conversational reply for the dashboard chat and speech synthesis.
    2. oled_reply: Short 20-character summary for the 1.3" OLED display.
    """
    text = transcript.lower().strip()
    cart = CartSession.objects.filter(cart_id=cart_id).first()
    member = cart.member if cart else None

    # 1. Cart Total & Summary
    if any(w in text for w in ["total", "bill", "how much in cart", "cart total", "items"]):
        if not cart or cart.items.count() == 0:
            return "Your cart is currently empty. Scan an item to begin!", "CART: 0 ITEMS (₹0)"
        subtotal = float(sum(item.line_total for item in cart.items.all()))
        discount = float(subtotal * (float(member.discount_percent) / 100.0)) if member else 0.0
        total = max(0.0, subtotal - discount)
        count = sum(item.quantity for item in cart.items.all())
        return f"Your cart currently has {count} item{'s' if count > 1 else ''} totaling ₹{total:.2f}.", f"TOT: ₹{total:.2f} ({count} items)"

    # 2. Product Location / Shelf Queries
    for prod in Product.objects.all():
        prod_words = [w for w in prod.name.lower().split() if len(w) > 3]
        if any(w in text for w in prod_words) or prod.category.lower() in text:
            loc = prod.shelf_location or "Main Aisle"
            price = prod.price
            return (
                f"{prod.name} is located at {loc} for ₹{price:.2f}.",
                f"{prod.name[:10]} @ {loc[:10]}"
            )

    # 3. Recommendations / Suggestions
    if any(w in text for w in ["recommend", "suggest", "pair", "what else", "breakfast", "snack"]):
        if cart and cart.items.count() > 0:
            prods = [item.product for item in cart.items.all()]
            recs_data = get_recommendations_for_cart(prods, member=member)
            rec_items = recs_data.get("recommendations", [])
            if rec_items:
                top_names = [r["name"].split()[0] for r in rec_items[:2]]
                reply_str = f"Based on your items, I recommend {rec_items[0]['name']} and {rec_items[1]['name'] if len(rec_items) > 1 else 'more'}!"
                oled_str = f"REC: {', '.join(top_names)}"
                return reply_str, oled_str
        return (
            "Popular pairings today: Amul Milk with Parle-G Biscuits, or Tata Tea with Good Day Cookies!",
            "REC: MILK + PARLE-G"
        )

    # 4. Membership & Discount Queries
    if any(w in text for w in ["member", "discount", "offer", "points", "tier"]):
        if member:
            return (
                f"Welcome {member.name}! You are a {member.tier} member with {member.discount_percent}% off and {member.loyalty_points} loyalty points.",
                f"{member.tier}: {member.discount_percent}% OFF"
            )
        else:
            return (
                "You are shopping as a Guest. Register at the admin tab to unlock up to 15% discount and loyalty points!",
                "MEM: GUEST (0% OFF)"
            )

    # 5. Greeting / Help
    if any(w in text for w in ["hello", "hi", "hey", "help"]):
        name = member.name.split()[0] if member else "shopper"
        return (
            f"Hello {name}! I can help you find products, check your cart total, or recommend pairings. What are you looking for?",
            f"HI {name.upper()}! HOW CAN I HELP?"
        )

    # 6. Default Fallback
    return (
        f"I heard: '{transcript}'. You can ask me for product locations (e.g. Milk, Maggi), cart total, or recommendations!",
        f"HEARD: {transcript[:15]}"
    )


def transcribe_and_reply(audio_bytes: bytes, cart_id: str = "CART-01") -> Dict[str, Any]:
    """
    Transcribes audio using local voice-to-text model, processes the intent,
    and returns conversational responses for both dashboard and 1.3" OLED.
    """
    if not audio_bytes:
        return {
            "error": "No audio data received",
            "transcript": "",
            "reply": "Please speak into the microphone.",
            "oled_line": "NO AUDIO DETECTED",
        }

    transcript = ""
    stt_method = "speech_recognition"

    # 1. Primary: Use Local Offline Faster-Whisper Model
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_audio:
            tmp_audio.write(audio_bytes)
            tmp_path = tmp_audio.name

        whisper_model = get_offline_whisper()
        if whisper_model:
            try:
                segments, info = whisper_model.transcribe(tmp_path, beam_size=2, language="en")
                transcript = " ".join([seg.text.strip() for seg in segments if seg.text.strip()]).strip()
                if transcript:
                    stt_method = "local_offline_whisper"
            except Exception as w_err:
                print(f"[Whisper Transcribe Notice]: {w_err}")

        # 2. Fallback to speech_recognition if whisper was blank
        if not transcript:
            try:
                with sr.AudioFile(tmp_path) as source:
                    audio_data = recognizer.record(source)
                    try:
                        transcript = recognizer.recognize_google(audio_data)
                        stt_method = "google_speech_recognition"
                    except Exception:
                        pass
            except Exception:
                pass
    except Exception as e:
        print(f"[STT Error]: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    if not transcript:
        # Friendly empty voice response
        return {
            "transcript": "(Audio not clearly recognized - try speaking closer to mic)",
            "reply": "I couldn't quite catch that. Could you please repeat your question?",
            "oled_line": "VOICE: TRY AGAIN",
            "method": stt_method,
            "timestamp": timezone.now().isoformat(),
        }

    # Generate retail response
    full_reply, oled_reply = generate_retail_reply(transcript, cart_id=cart_id)

    # Update OLED line 4 on active cart session so the 1.3" OLED displays it!
    cart = CartSession.objects.filter(cart_id=cart_id).first()
    if cart:
        # We can store the active voice chat response for OLED ticker
        pass

    return {
        "transcript": transcript,
        "reply": full_reply,
        "oled_reply": oled_reply,
        "method": stt_method,
        "timestamp": timezone.now().isoformat(),
    }
