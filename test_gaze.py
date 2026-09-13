import os
import random
import sys
import uuid
from datetime import datetime, timezone

import requests

# ---------------------------------
# Configuration
# ---------------------------------
API_BASE = os.environ.get("ML_API_BASE", "http://127.0.0.1:8000")
API_URL = f"{API_BASE.rstrip('/')}/save-data"
RESULT_URL = f"{API_BASE.rstrip('/')}/my-result"


def generate_fake_gaze_stream(num_points: int = 50) -> list[dict]:
    """Points must match server GazePoint: x, y, timestamp (seconds, >= 0)."""
    gaze_stream: list[dict] = []
    ts = 0.0
    x, y = 100.0, 200.0

    for _ in range(num_points):
        x += random.uniform(-5, 5)
        y += random.uniform(-5, 5)
        ts += random.uniform(0.05, 0.15)
        gaze_stream.append({"x": float(x), "y": float(y), "timestamp": float(ts)})

    return gaze_stream


def build_payload() -> tuple[str, dict]:
    session_id = f"smoke_{uuid.uuid4().hex[:12]}"
    score, total = 2, 4
    accuracy = score / total
    payload: dict = {
        "session_id": session_id,
        "user_id": "smoke-user-1",
        "game_type": "reading_comprehension",
        "difficulty": "medium",
        "score": score,
        "total": total,
        "accuracy": accuracy,
        "gaze_stream": generate_fake_gaze_stream(50),
        "fixation_stats": {"mean_duration": 180.0, "count": 10},
        "regressions": {"count": 1},
        "reading_speed_wpm": 130.0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "name": "Smoke Test",
        "age": 10,
        "grade": 5,
        "errors": [{"question_id": 1}, {"question_id": 2}],
        "saccade_stats": {"mean_amplitude": 0.03, "mean_velocity": 0.9},
        "scanpath_entropy": 2.1,
        "total_reading_time_ms": 8500,
        "task_timestamps": [{"event": "start", "t": 1}, {"event": "end", "t": 8501}],
        "interaction_events": [],
        "language": "en",
        "device_metadata": {"device_type": "Desktop", "screen_width": 1920, "screen_height": 1080},
        "calibration_data": {"calibration_quality": 0.95},
    }
    return session_id, payload


def main() -> int:
    session_id, payload = build_payload()

    try:
        response = requests.post(API_URL, json=payload, timeout=30)
    except requests.RequestException as exc:
        print(f"Request failed (is uvicorn running on {API_BASE}?): {exc}")
        return 1

    if response.status_code != 200:
        print("save-data failed:", response.status_code, response.text[:2000])
        return 1

    data = response.json()
    print(
        "save-data OK:",
        {
            "session_id": session_id,
            "risk": data.get("risk"),
            "risk_score": data.get("risk_score"),
            "confidence": data.get("confidence"),
            "detection_method": data.get("detection_method"),
            "message": data.get("message"),
        },
    )

    try:
        result_response = requests.get(f"{RESULT_URL}/{session_id}", timeout=15)
    except requests.RequestException as exc:
        print(f"my-result skipped (optional DB): {exc}")
        return 0

    if result_response.status_code == 200:
        print("my-result: OK (Postgres row found)")
    else:
        print(
            "my-result:",
            result_response.status_code,
            "(expected if Postgres is not configured)",
            result_response.text[:500],
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
