# Scripts Setup Guide

This directory contains Python scripts for plant analysis and computer vision processing.

## Prerequisites

- Python 3.10 or higher (including Python 3.13)
- pip (Python package manager)
- Ubuntu packages for venv support (typically `python3-venv`)

## Installation

### Option 1: Using Virtual Environment (Recommended for Development)

```bash
cd scripts

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On Linux/macOS:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Windows-only creation command (alternative):

```bash
py -3.13 -m venv .venv
```

### Option 2: Direct Installation (Production/Ubuntu)

```bash
# Ubuntu server example
sudo apt update
sudo apt install -y python3-venv

cd scripts
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Required Environment Variables

Create a `.env` file in the **project root** (not in scripts/):

```
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite-preview
CV_TIMEOUT_MS=60000
```

The scripts will automatically load this file.

`GEMINI_MODEL` is optional. If not set, the default is `gemini-3.1-flash-lite-preview`.
`CV_TIMEOUT_MS` is optional. Increase it if API/network latency is high.

## Node.js Integration

When called from the Node app, `scripts/cv_analyze.js` resolves Python in this order:

1. `PYTHON_PATH` environment variable (if set)
2. `scripts/.venv/Scripts/python.exe` (Windows) or `scripts/.venv/bin/python` (Linux/macOS)
3. `./.venv/Scripts/python.exe` (Windows) or `./.venv/bin/python` (Linux/macOS)
4. System `python`/`python3`

For consistent behavior, install dependencies into `scripts/.venv` and run the server with that same environment available.

## Running Scripts

After installing dependencies:

```bash
# Run plant analysis
python analyze.py /path/to/image.jpg

# Windows without activation
.venv\Scripts\python analyze.py C:\path\to\image.jpg
```

## Troubleshooting

### Module not found errors
- Make sure virtual environment is activated (if using one)
- Verify `requirements.txt` was installed: `python -m pip list`
- Try reinstalling: `python -m pip install --upgrade -r requirements.txt`
- If using Python 3.13, ensure you are not pinning old Pillow versions (10.x)
- Confirm install/run interpreter match:
	- Windows: `.venv\Scripts\python -m pip list`
	- Ubuntu: `.venv/bin/python -m pip list`

### GEMINI_API_KEY not found
- Check that `.env` file exists in project root
- Verify you have the correct API key
- Make sure it's set as `GEMINI_API_KEY=<your-key>`

## Dependencies

- **python-dotenv**: Load environment variables from .env file
- **google-genai**: Google's Generative AI library for Gemini API
- **pillow**: Python Imaging Library for image processing
- **numpy**: Numerical operations used by CV scoring
- **opencv-python-headless**: OpenCV runtime for image processing
