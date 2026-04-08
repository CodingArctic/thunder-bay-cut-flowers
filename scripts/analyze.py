import sys
import json
import os
import shutil
import re
import tempfile
from pathlib import Path
"Backup models in event a call gets rate limted"
GEMINI_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]

def check_dependencies():
    """Check for required packages and provide setup instructions if missing."""
    missing = []
    
    try:
        import dotenv
    except ImportError:
        missing.append("python-dotenv")
    
    try:
        import google.genai
    except ImportError:
        missing.append("google-genai")
    
    try:
        import PIL
    except ImportError:
        missing.append("pillow")
    
    if missing:
        script_dir = Path(__file__).parent
        req_file = script_dir / "requirements.txt"
        print(f"Error: Missing Python packages: {', '.join(missing)}", file=sys.stderr)
        print(f"\nTo install dependencies, run one of the following:", file=sys.stderr)
        print(f"\n1. Using requirements.txt (recommended for production):", file=sys.stderr)
        print(f"   pip install -r {req_file}", file=sys.stderr)
        print(f"\n2. Using virtual environment (recommended for development):", file=sys.stderr)
        print(f"   cd {script_dir}", file=sys.stderr)
        print(f"   python -m venv venv", file=sys.stderr)
        print(f"   source venv/bin/activate  # On Linux/Mac", file=sys.stderr)
        print(f"   venv\\Scripts\\activate   # On Windows", file=sys.stderr)
        print(f"   pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)


# Check dependencies before proceeding
check_dependencies()

# Load .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
except Exception as e:
    print(f"Warning: Could not load .env file: {e}", file=sys.stderr)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ComputerVision import PlantHealthCV
from trend_tracker import record, analyze_trends, get_zone_adjustments

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")


def run_cv(image_path):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    captures_root = os.path.join(script_dir, "captures")
    os.makedirs(captures_root, exist_ok=True)
    save_dir = tempfile.mkdtemp(prefix="run_", dir=captures_root)
    pipeline = PlantHealthCV(rows=2, cols=3, save_dir=save_dir)
    # Load trend-based severity adjustments so the CV scorer adapts per-zone
    adjustments = get_zone_adjustments()
    pipeline.cv.set_zone_adjustments(adjustments)
    return pipeline.process_frame(image_path), save_dir


def parse_score(text):
    cleaned = text.strip()
    try:
        return max(0.0, min(1.0, round(float(cleaned), 4))), "exact"
    except (TypeError, ValueError):
        pass

    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not match:
        return None, "none"

    try:
        value = float(match.group(0))
        return max(0.0, min(1.0, round(value, 4))), "regex"
    except ValueError:
        return None, "none"


def run_gemini(image_path):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("Warning: GEMINI_API_KEY not set in .env file", file=sys.stderr)
        return None, "missing_api_key", None, None

    try:
        from google import genai
        from google.genai import types
        import PIL.Image
    except ImportError as e:
        print(f"Error: Failed to import required libraries: {e}", file=sys.stderr)
        return None, "import_error", None, None

    client = genai.Client(api_key=api_key)

    prompt = """You are a plant health analyst. Look at this greenhouse image carefully.
Check for any signs of dead, brown, or wilting leaves, disease spots, discoloration, or other health issues.

Based on what you see in the image, provide a health score from 0.00 to 1.00 (0=dead, 1=perfect).
Respond with ONLY a decimal number, nothing else. Example: 0.73"""
    last_status = "all_models_failed"
    last_raw = None
    for model in GEMINI_MODELS:
        try:
            img = PIL.Image.open(image_path)
            response = client.models.generate_content(
                model=model,
                contents=[prompt, img],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=10,
                ),
            )

            text = (response.text or "").strip()
            value, parse_mode = parse_score(text)
            if value is None:
                print(f"Warning: Gemini response from model {model} could not be parsed as score. Raw text: {text}", file=sys.stderr)
                last_status = "parse_error"
                last_raw = text
                continue

            return value, f"ok_{parse_mode}", text, model
        except Exception as e:
            print(f"Error calling Gemini API with model {model}: {e}", file=sys.stderr)
            last_status = "request_error"
            continue
    return None, last_status, last_raw, None


def analyze(image_path):
    results, capture_dir = run_cv(image_path)

    plant_zones = [r for r in results if r["category"] != "no_plant"]
    if plant_zones:
        avg_score = sum(r["value"] for r in plant_zones) / len(plant_zones)
        worst_score = min(r["value"] for r in plant_zones)
        # Blend average with worst zone so localized problems aren't hidden
        cv_score = avg_score * 0.5 + worst_score * 0.5
        # Extra penalty for each unhealthy zone (score < 0.75)
        unhealthy = [r for r in plant_zones if r["value"] < 0.75]
        if unhealthy:
            penalty = len(unhealthy) / len(plant_zones) * 0.20
            cv_score = max(0.0, cv_score - penalty)
        cv_score = float(round(cv_score, 4))
    else:
        cv_score = 0.0
    worst = min(plant_zones, key=lambda r: r["value"]) if plant_zones else None

    overview_dir = capture_dir

    # Defaults keep scoring stable if trend persistence is temporarily unavailable.
    trend_data = {
        "trend_penalty": 0.0,
        "declining_zones": 0,
        "zone_trends": {},
    }

    try:
        # Find the overview image for this run only.
        overview_files = sorted([f for f in os.listdir(overview_dir) if f.startswith("overview_")]) if os.path.exists(overview_dir) else []
        overview_path = os.path.join(overview_dir, overview_files[-1]) if overview_files else image_path

        # Send to Gemini (use overview if available, otherwise use original image)
        image_to_analyze = overview_path if os.path.exists(overview_path) else image_path
        llm_score, llm_status, llm_raw, llm_model_used = run_gemini(image_to_analyze)

        # Record this run and check for declining trends
        try:
            record(results)
            trend_data = analyze_trends(results)
        except Exception as e:
            print(f"Warning: trend tracking unavailable: {e}", file=sys.stderr)
    finally:
        if os.path.exists(overview_dir):
            shutil.rmtree(overview_dir, ignore_errors=True)

    trend_penalty = trend_data["trend_penalty"]

    if llm_score is not None:
        combined = float(round(cv_score * 0.3 + llm_score * 0.7, 4))
    else:
        combined = cv_score

    final_score = float(round(max(0.0, combined - trend_penalty), 4))

    return {
        "score": final_score,
        "cv_score": cv_score,
        "llm_score": llm_score,
        "llm_used": llm_score is not None,
        "llm_status": llm_status,
        "llm_model": llm_model_used,
        "llm_raw": llm_raw,
        "trend_penalty": trend_penalty,
        "declining_zones": trend_data["declining_zones"],
        "zone_trends": trend_data["zone_trends"],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 analyze.py <image_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    try:
        print(json.dumps(analyze(image_path)))
    except Exception as e:
        print(f"Error: analyze pipeline failed: {e}", file=sys.stderr)
        print(json.dumps({
            "score": None,
            "cv_score": None,
            "llm_score": None,
            "llm_used": False,
            "llm_status": "analysis_exception",
            "llm_model": None,
            "llm_raw": None,
            "trend_penalty": 0.0,
            "declining_zones": 0,
            "zone_trends": {},
            "error": str(e),
        }))