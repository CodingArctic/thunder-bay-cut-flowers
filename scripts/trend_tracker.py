import json
import os
from datetime import datetime

HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trend_history.json")
MAX_ENTRIES = 240 # Assuming 6 entry per hour, this keeps at least 4 days of history per zone


def _load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def record(zone_results):
    """Record per-zone color values and scores from a single analysis run."""
    history = _load_history()
    timestamp = datetime.now().isoformat()

    for r in zone_results:
        zone_id = r["zone_id"]
        if zone_id not in history:
            history[zone_id] = []

        entry = {
            "time": timestamp,
            "score": r["value"],
            "category": r["category"],
            "green_pct": r["cv_details"]["green_pct"],
            "brown_pct": r["cv_details"]["brown_pct"],
            "yellow_pct": r["cv_details"]["yellow_pct"],
            "pigment_pct": r["cv_details"]["pigment_pct"],
        }
        history[zone_id].append(entry)

        # Keep only the last MAX_ENTRIES
        if len(history[zone_id]) > MAX_ENTRIES:
            history[zone_id] = history[zone_id][-MAX_ENTRIES:]

    _save_history(history)
    return history


def analyze_trends(zone_results, min_entries=3):
    """Analyze trends across recent history for each zone.

    Returns a dict with:
      - trend_penalty: float (0.0 to 0.15) to subtract from the final score
      - zone_trends: per-zone trend info
      - declining_zones: count of zones with negative trends
    """
    history = _load_history()
    zone_trends = {}
    declining_zones = 0

    for r in zone_results:
        zone_id = r["zone_id"]
        if r["category"] == "no_plant":
            continue

        entries = history.get(zone_id, [])
        if len(entries) < min_entries:
            zone_trends[zone_id] = {"trend": "insufficient_data", "entries": len(entries)}
            continue

        recent = entries[-min_entries:]

        # Track score decline
        scores = [e["score"] for e in recent]
        score_change = scores[-1] - scores[0]

        # Track brown/yellow increase (signs of decay)
        brown_vals = [e["brown_pct"] for e in recent]
        brown_change = brown_vals[-1] - brown_vals[0]

        yellow_vals = [e["yellow_pct"] for e in recent]
        yellow_change = yellow_vals[-1] - yellow_vals[0]

        # Track green decrease (loss of healthy tissue)
        green_vals = [e["green_pct"] for e in recent]
        green_change = green_vals[-1] - green_vals[0]

        # Determine if this zone is declining
        is_declining = False
        reasons = []

        # Score dropped by more than 0.10 over the window
        if score_change < -0.10:
            is_declining = True
            reasons.append(f"score dropped {abs(score_change):.2f}")

        # Brown increased by more than 3 percentage points
        if brown_change > 3.0:
            is_declining = True
            reasons.append(f"brown +{brown_change:.1f}%")

        # Yellow increased by more than 5 percentage points
        if yellow_change > 5.0:
            is_declining = True
            reasons.append(f"yellow +{yellow_change:.1f}%")

        # Green decreased by more than 10 percentage points
        if green_change < -10.0:
            is_declining = True
            reasons.append(f"green {green_change:.1f}%")

        if is_declining:
            declining_zones += 1

        zone_trends[zone_id] = {
            "trend": "declining" if is_declining else "stable",
            "reasons": reasons,
            "score_change": round(score_change, 4),
            "brown_change": round(brown_change, 1),
            "yellow_change": round(yellow_change, 1),
            "green_change": round(green_change, 1),
            "entries": len(entries),
        }

    # Calculate penalty based on how many zones are declining
    plant_zones = [r for r in zone_results if r["category"] != "no_plant"]
    if plant_zones and declining_zones > 0:
        trend_penalty = (declining_zones / len(plant_zones)) * 0.15
    else:
        trend_penalty = 0.0

    return {
        "trend_penalty": round(trend_penalty, 4),
        "zone_trends": zone_trends,
        "declining_zones": declining_zones,
    }


def get_zone_adjustments(min_entries=3):
    """Compute per-zone severity multipliers from trend history.

    Returns a dict of zone_id -> float multiplier (1.0 = normal, >1.0 = harsher).
    Feed these into CVScorer so it adapts penalty weights for declining zones.
    """
    history = _load_history()
    adjustments = {}

    for zone_id, entries in history.items():
        if len(entries) < min_entries:
            adjustments[zone_id] = 1.0
            continue

        recent = entries[-min_entries:]

        scores = [e["score"] for e in recent]
        score_change = scores[-1] - scores[0]

        brown_vals = [e["brown_pct"] for e in recent]
        brown_change = brown_vals[-1] - brown_vals[0]

        yellow_vals = [e["yellow_pct"] for e in recent]
        yellow_change = yellow_vals[-1] - yellow_vals[0]

        green_vals = [e["green_pct"] for e in recent]
        green_change = green_vals[-1] - green_vals[0]

        # Build a severity multiplier based on how bad the trend is
        severity = 1.0

        # Score declining: up to +0.2 severity
        if score_change < -0.10:
            severity += min(0.2, abs(score_change))

        # Brown increasing: up to +0.15 severity
        if brown_change > 3.0:
            severity += min(0.15, brown_change / 100)

        # Yellow increasing: up to +0.1 severity
        if yellow_change > 5.0:
            severity += min(0.1, yellow_change / 100)

        # Green decreasing: up to +0.15 severity
        if green_change < -10.0:
            severity += min(0.15, abs(green_change) / 100)

        # Cap at 1.5x
        adjustments[zone_id] = round(min(1.5, severity), 4)

    return adjustments
