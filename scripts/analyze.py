import sys
import json
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ComputerVision import PlantHealthCV

GEMINI_MODEL = "gemini-3-flash-preview"


def run_cv(image_path):
    save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
    pipeline = PlantHealthCV(rows=2, cols=3, save_dir=save_dir)
    return pipeline.process_frame(image_path)


def run_gemini(image_path, cv_score):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types
        import PIL.Image
    except ImportError:
        return None

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
                temperature=0.1,
                max_output_tokens=10,
            ),
        )

        text = response.text.strip()
        value = float(text)
        return max(0.0, min(1.0, round(value, 4)))
    except Exception:
        return None


def analyze(image_path):
    results = run_cv(image_path)

    plant_zones = [r for r in results if r["category"] != "no_plant"]
    cv_score = float(round(sum(r["value"] for r in plant_zones) / len(plant_zones), 4)) if plant_zones else 0.0
    worst = min(plant_zones, key=lambda r: r["value"]) if plant_zones else None

    overview_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
    overview_files = sorted([f for f in os.listdir(overview_dir) if f.startswith("overview_")])
    overview_path = os.path.join(overview_dir, overview_files[-1]) if overview_files else image_path

    llm_score = run_gemini(
        overview_path if os.path.exists(overview_path) else image_path,
        cv_score
    )

    if llm_score is not None:
        final_score = float(round(cv_score * 0.6 + llm_score * 0.4, 4))
    else:
        final_score = cv_score

    return {
        "score": final_score
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