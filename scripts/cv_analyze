
const { execFile } = require('child_process');
const path = require('path');
 
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const CV_SCRIPT = path.join(__dirname, '..', 'scripts', 'analyze.py');
 
/**
 * Run CV + optional Gemini analysis on an image.
 * Returns parsed JSON result or null on failure.
 */
function analyzeImage(imagePath) {
    return new Promise((resolve) => {
        execFile(PYTHON_PATH, [CV_SCRIPT, imagePath], { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`CV analysis failed: ${err.message}`);
                if (stderr) console.error(stderr);
                resolve(null);
                return;j
            }
            try {
                resolve(JSON.parse(stdout.trim()));
            } catch (parseErr) {
                console.error(`Failed to parse CV output: ${stdout}`);
                resolve(null);
            }
        });
    });
}
 
module.exports = { analyzeImage };