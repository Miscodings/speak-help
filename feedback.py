import os
from groq import Groq

_client = None


def _get_client():
    global _client
    if _client is None:
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            return None
        _client = Groq(api_key=key)
    return _client


def get_coaching_tip(transcript):
    """Return a short coaching tip based on the accumulated transcript, or None."""
    client = _get_client()
    if not client:
        return None

    words = transcript.strip().split()
    if len(words) < 10:
        return None

    # Feed only the most recent context — last ~60 words
    recent = " ".join(words[-60:])

    prompt = (
        "You are a real-time public speaking coach giving brief in-ear feedback. "
        "Read this recent speech snippet and respond with ONE coaching tip in 8–14 words. "
        "Focus on whatever is most relevant: pacing, filler words, clarity, pausing, or confidence. "
        "Be specific, direct, and encouraging. Reply with only the tip — no labels, no preamble.\n\n"
        f'Speech: "{recent}"'
    )

    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=40,
            temperature=0.6,
        )
        tip = resp.choices[0].message.content.strip().strip('"').strip("'")
        return tip if len(tip) > 8 else None
    except Exception as e:
        print(f"[FEEDBACK ERROR] {e}")
        return None
