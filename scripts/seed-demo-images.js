/**
 * Generates placeholder JPEG images for development/testing.
 *
 * Each image has a solid background colour derived from the record's
 * health score value (green → yellow → orange → red) plus a progress bar
 * strip at the bottom indicating the value at a glance.
 *
 * Higher values are healthier (green); lower values indicate stress/dehydration (red).
 *
 * Images are placed in imgs/{monitorID}/ using the same timestamp-based
 * filename format that the real monitor upload endpoint produces.
 * The filenames here must stay in sync with ddl/SampleData.sql.
 *
 * Usage:
 *   npm run seed-images
 */

'use strict';

const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

// ── Configuration ─────────────────────────────────────────────────────────────

const IMG_W = 400;
const IMG_H = 300;
const BAR_H = 24; // value-progress bar strip at bottom of each image

// Fixed base time used to derive filenames (matches SampleData.sql)
const BASE = new Date('2026-01-15T10:00:00.000Z');

// Records mirroring ddl/SampleData.sql exactly.
// [monitorID, intervalMinutes, healthScore]
// Health score: 1.0 = fully healthy, 0.0 = severely stressed/dehydrated
const RECORDS = [
    // ── dehydrating_device (monitor 1) – 10-min intervals ──────────────────
    [1, 180, 0.35],
    [1, 170, 0.32],
    [1, 160, 0.28],
    [1, 150, 0.24],
    [1, 140, 0.20],
    [1, 130, 0.17],
    [1, 120, 0.14],
    [1, 110, 0.11],
    [1, 100, 0.09],
    [1,  90, 0.07],
    [1,  80, 0.05],
    [1,  70, 0.04],
    // ── healthy_device (monitor 2) – 20-min intervals ───────────────────────
    [2, 180, 0.90],
    [2, 160, 0.89],
    [2, 140, 0.91],
    [2, 120, 0.88],
    [2, 100, 0.90],
    [2,  80, 0.92],
    [2,  60, 0.91],
    [2,  40, 0.93],
    [2,  20, 0.94],
    // ── warning_device (monitor 3) – 20-min intervals ───────────────────────
    [3, 180, 0.58],
    [3, 160, 0.55],
    [3, 140, 0.52],
    [3, 120, 0.48],
    [3, 100, 0.45],
    [3,  80, 0.42],
    [3,  60, 0.39],
    [3,  40, 0.36],
    [3,  20, 0.32],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a health score (0.0–1.0) to an RGBA 32-bit integer.
 * 1.0 → lime green (healthy)  |  0.5 → amber/yellow  |  0.0 → deep red (stressed)
 */
function valueToColor(v) {
    // Invert so that high health score = green, low = red
    const d = 1 - v;
    let r, g, b;
    if (d <= 0.5) {
        r = Math.round(d * 2 * 220);
        g = 200;
        b = Math.round((1 - d * 2) * 100);
    } else {
        r = 220;
        g = Math.round((1 - (d - 0.5) * 2) * 180);
        b = 20;
    }
    // Build 0xRRGGBBAA without relying on signed 32-bit shifts
    return ((r * 256 + g) * 256 + b) * 256 + 255;
}

/**
 * Derives the image filename from its interval offset in the same way the
 * real monitor upload code does (ISO string with colons replaced by dashes).
 */
function intervalToFilename(intervalMins) {
    const t = new Date(BASE.getTime() - intervalMins * 60 * 1000);
    return t.toISOString().replace(/:/g, '-') + '.jpg';
}

/**
 * Writes a pixel directly into the image bitmap buffer.
 */
function setPixel(img, x, y, r, g, b, a = 255) {
    const idx = (y * img.bitmap.width + x) * 4;
    img.bitmap.data[idx]     = r;
    img.bitmap.data[idx + 1] = g;
    img.bitmap.data[idx + 2] = b;
    img.bitmap.data[idx + 3] = a;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const imgsRoot = path.join(__dirname, '..', 'imgs');
    let generated = 0;

    for (const [monitorID, intervalMins, value] of RECORDS) {
        const dir = path.join(imgsRoot, String(monitorID));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filename = intervalToFilename(intervalMins);
        const outPath  = path.join(dir, filename);

        // Solid background colour matching the dehydration value
        const bgColor = valueToColor(value);
        const img = new Jimp({ width: IMG_W, height: IMG_H, color: bgColor });

        // Value progress bar: bottom BAR_H rows
        // Filled portion (white) = proportion of the image width == value
        const filledPx = Math.round(value * IMG_W);
        const barY = IMG_H - BAR_H;
        for (let y = barY; y < IMG_H; y++) {
            for (let x = 0; x < IMG_W; x++) {
                if (x < filledPx) {
                    setPixel(img, x, y, 255, 255, 255);       // white fill
                } else {
                    setPixel(img, x, y, 30, 30, 30);          // dark remainder
                }
            }
        }

        await img.write(outPath);
        console.log(`  [monitor ${monitorID}]  ${filename}  (health=${value})`);    
        generated++;
    }

    console.log(`\nDone — ${generated} demo images written to imgs/`);
}

main().catch(err => {
    console.error('seed-demo-images failed:', err);
    process.exit(1);
});
