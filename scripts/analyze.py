import sys
import json
import os
import shutil
import re
from pathlib import Path


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

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")


def run_cv(image_path):
    save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
    pipeline = PlantHealthCV(rows=2, cols=3, save_dir=save_dir)
    return pipeline.process_frame(image_path)


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


def run_gemini(image_path, cv_score):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("Warning: GEMINI_API_KEY not set in .env file", file=sys.stderr)
        return None, "missing_api_key", None

    try:
        from google import genai
        from google.genai import types
        import PIL.Image
    except ImportError as e:
        print(f"Error: Failed to import required libraries: {e}", file=sys.stderr)
        return None, "import_error", None

    client = genai.Client(api_key=api_key)

    prompt = f"""You are a plant health analyst. Look at this greenhouse image.
The computer vision system scored the overall health at {cv_score:.2f} (0=dead, 1=perfect).

Based on what you see in the image, provide your own health score from 0.00 to 1.00.
Respond with ONLY a decimal number, nothing else. Example: 0.73"""

    try:
        img = PIL.Image.open(image_path)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, img],
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=10,
            ),
        )

        text = (response.text or "").strip()
        value, parse_mode = parse_score(text)
        if value is None:
            print(f"Warning: Gemini response could not be parsed as score. Raw text: {text}", file=sys.stderr)
            return None, "parse_error", text

        return value, f"ok_{parse_mode}", text
    except Exception as e:
        print(f"Error calling Gemini API: {e}", file=sys.stderr)
        return None, "request_error", None


def analyze(image_path):
    results = run_cv(image_path)

    plant_zones = [r for r in results if r["category"] != "no_plant"]
    cv_score = float(round(sum(r["value"] for r in plant_zones) / len(plant_zones), 4)) if plant_zones else 0.0
    worst = min(plant_zones, key=lambda r: r["value"]) if plant_zones else None

    overview_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
    
    # Find the overview image BEFORE cleaning up
    overview_files = sorted([f for f in os.listdir(overview_dir) if f.startswith("overview_")]) if os.path.exists(overview_dir) else []
    overview_path = os.path.join(overview_dir, overview_files[-1]) if overview_files else image_path

    # Send to Gemini (use overview if available, otherwise use original image)
    image_to_analyze = overview_path if os.path.exists(overview_path) else image_path
    llm_score, llm_status, llm_raw = run_gemini(image_to_analyze, cv_score)

    # Clean up captures folder after we're done using it
    if os.path.exists(overview_dir):
        shutil.rmtree(overview_dir)

    if llm_score is not None:
        final_score = float(round(cv_score * 0.6 + llm_score * 0.4, 4))
    else:
        final_score = cv_score

    return {
        "score": final_score,
        "cv_score": cv_score,
        "llm_score": llm_score,
        "llm_used": llm_score is not None,
        "llm_status": llm_status,
        "llm_model": GEMINI_MODEL,
        "llm_raw": llm_raw,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 analyze.py <image_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    print(json.dumps(analyze(image_path)))