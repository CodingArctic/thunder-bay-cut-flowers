
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
 
const CV_SCRIPT = path.join(__dirname, '..', 'scripts', 'analyze.py');
const CV_TIMEOUT_MS = Number.parseInt(process.env.CV_TIMEOUT_MS || '60000', 10);

function resolvePythonPath() {
    if (process.env.PYTHON_PATH) {    
        return process.env.PYTHON_PATH;
    }

    const isWindows = process.platform === 'win32';
    const candidates = [
        path.join(__dirname, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
        path.join(__dirname, '..', '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return isWindows ? 'python' : 'python3';
}

const PYTHON_PATH = resolvePythonPath();
 
/**
 * Run CV + optional Gemini analysis on an image.
 * Returns parsed JSON result or null on failure.
 */
function analyzeImage(imagePath) {
    return new Promise((resolve) => {
        execFile(PYTHON_PATH, [CV_SCRIPT, imagePath], { timeout: CV_TIMEOUT_MS }, (err, stdout, stderr) => {
            if (stderr && stderr.trim()) {
                console.warn(`[cv_analyze] Python stderr (${PYTHON_PATH}):\n${stderr.trim()}`);
            }

            if (err) {
                console.error(`[cv_analyze] CV analysis failed using ${PYTHON_PATH}: ${err.message}`);
                resolve(null);
                return;
            }

            try {
                resolve(JSON.parse(stdout.trim()));
            } catch (parseErr) {
                console.error(`[cv_analyze] Failed to parse CV output from ${PYTHON_PATH}: ${stdout}`);
                resolve(null);
            }
        });
    });
}
 
module.exports = { analyzeImage };