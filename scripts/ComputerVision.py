import cv2
import numpy as np
import json
import os
from datetime import datetime, timedelta
from collections import deque

class GridZoneManager:
    def __init__(self, rows=2, cols=3, margin=10):
        self.rows = rows
        self.cols = cols
        self.margin = margin
        self.zones = []

    def setup(self, frame):
        h, w = frame.shape[:2]
        cell_w = (w - self.margin * (self.cols + 1)) // self.cols
        cell_h = (h - self.margin * (self.rows + 1)) // self.rows

        self.zones = []
        for r in range(self.rows):
            for c in range(self.cols):
                x = self.margin + c * (cell_w + self.margin)
                y = self.margin + r * (cell_h + self.margin)
                self.zones.append({
                    "zone_id": f"R{r+1}C{c+1}",
                    "row": r + 1, "col": c + 1,
                    "x": x, "y": y, "w": cell_w, "h": cell_h,
                })
        return self.zones

    def crop(self, frame, zone):
        return frame[zone["y"]:zone["y"]+zone["h"],
                     zone["x"]:zone["x"]+zone["w"]]

    def crop_all(self, frame):
        if not self.zones:
            self.setup(frame)
        return [(z, self.crop(frame, z)) for z in self.zones]

    def draw_grid(self, frame, scores=None):
        vis = frame.copy()
        for z in self.zones:
            if scores and z["zone_id"] in scores:
                s = scores[z["zone_id"]]
                if s <= 0.0:     color = (128, 128, 128) 
                elif s >= 0.80:  color = (0, 200, 0)
                elif s >= 0.60:  color = (0, 200, 200)
                elif s >= 0.40:  color = (0, 120, 255)
                else:            color = (0, 0, 255)
            else:
                color = (200, 200, 200)

            cv2.rectangle(vis, (z["x"], z["y"]),
                          (z["x"]+z["w"], z["y"]+z["h"]), color, 3)
            label = z["zone_id"]
            if scores and z["zone_id"] in scores:
                label += f" {scores[z['zone_id']]:.2f}"
            cv2.putText(vis, label, (z["x"]+10, z["y"]+30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        return vis

def white_balance(image):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    l, a, b = cv2.split(lab) # Forgot to add the L in LAB for white balance.
    l_mean = float(l.mean()) # L mean measures overall luminance 
    if 25.0 <= l_mean < 110.0:
        gain = min(1.20, 110.0 / l_mean) # if the image is dim, increase L gain by 1.2 to better expose details
        l = np.clip(l * gain, 0, 255)
    a = np.clip(a + (128 - np.mean(a)), 0, 255)
    b = np.clip(b + (128 - np.mean(b)), 0, 255)
    return cv2.cvtColor(cv2.merge([l, a, b]).astype(np.uint8), cv2.COLOR_LAB2BGR)


class CVScorer:
    def __init__(self):
        self.baselines = {}
        self.baseline_colors = {}
        self.baseline_times = {}
        self.zone_adjustments = {}

    def set_zone_adjustments(self, adjustments):
        """Set per-zone severity multipliers from trend history.
        adjustments: dict of zone_id -> float (1.0 = normal, >1.0 = harsher)
        """
        self.zone_adjustments = adjustments

    def set_baseline(self, zone_id, image):
        self.baselines[zone_id] = image.copy()
        self.baseline_colors[zone_id] = self._color_ratios(
            cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        )
        self.baseline_times[zone_id] = datetime.now()

    def score(self, zone_id, image):
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        cur = self._color_ratios(hsv)
        severity = self.zone_adjustments.get(zone_id, 1.0)

        abs_score, abs_cat = self._absolute_score(cur, severity)

        if zone_id not in self.baselines:
            self.set_baseline(zone_id, image)
            details = self._build_details(cur, abs_score=abs_score)
            return abs_score, abs_cat, details

        baseline = self.baselines[zone_id]
        base_colors = self.baseline_colors[zone_id]

        if image.shape != baseline.shape:
            image = cv2.resize(image, (baseline.shape[1], baseline.shape[0]))

        base_hsv = cv2.cvtColor(baseline, cv2.COLOR_BGR2HSV)

        green_ret = min(1.0, cur["green"] / base_colors["green"]) if base_colors["green"] > 0.01 else 1.0
        pigment_ret = min(1.0, cur["pigment"] / base_colors["pigment"]) if base_colors["pigment"] > 0.01 else 1.0
        brown_pen = min(1.0, max(0, cur["brown"] - base_colors["brown"]) / (0.20 / severity))
        yellow_pen = min(1.0, max(0, cur["yellow"] - base_colors["yellow"]) / (0.30 / severity))
        hist_sim = self._hist_sim(base_hsv, hsv)
        texture_sim = self._ssim(baseline, image)
        spot_score = self._spot_detect(baseline, image)

        rel_score = (
            pigment_ret * 0.30 +
            (1.0 - brown_pen) * 0.20 +
            (1.0 - yellow_pen) * 0.10 +
            hist_sim * 0.15 +
            texture_sim * 0.15 +
            (1.0 - spot_score) * 0.10
        )
        rel_score = max(0.0, min(1.0, rel_score))

        health = round(min(abs_score, rel_score), 4)

        if abs_cat == "no_plant":
            cat = "no_plant"
        elif health >= 0.80:
            cat = "healthy"
        elif spot_score > 0.3 or (brown_pen > 0.5 and spot_score > 0.15):
            cat = "disease"
        elif abs_cat in ("dehydration", "disease"):
            cat = abs_cat
        elif green_ret < 0.7 and (yellow_pen > 0.3 or brown_pen > 0.3):
            cat = "dehydration"
        elif pigment_ret < 0.7:
            cat = "stress"
        elif health < 0.60:
            cat = "stress"
        else:
            cat = "watch"

        details = self._build_details(cur, abs_score=abs_score, rel_score=rel_score,
                                       pigment_ret=pigment_ret, green_ret=green_ret,
                                       brown_pen=brown_pen, yellow_pen=yellow_pen,
                                       hist_sim=hist_sim, texture_sim=texture_sim,
                                       spot_score=spot_score)
        return health, cat, details

    def _absolute_score(self, color_ratios, severity=1.0):
        g = color_ratios["green"]
        b = color_ratios["brown"]
        y = color_ratios["yellow"]
        pigment = color_ratios["pigment"]
        gq = color_ratios["green_quality"]
        plant_coverage = pigment + b + y

        if plant_coverage < 0.20:
            if plant_coverage < 0.08:
                return 0.0, "no_plant"
            elif (b + y) < 0.04 and pigment < 0.12:
                return 0.0, "no_plant"
            elif gq < 0.65 and pigment < 0.18: # addition of green quality analysis broke the No_plant detection. Fixed here by allowing low pigment zones to still be classified.
                return 0.0, "no_plant"

        pigment_score = min(1.0, pigment / 0.35)
        # Severity from trend history makes brown/yellow thresholds tighter
        brown_penalty = min(1.0, b / (0.05 / severity))
        yellow_penalty = min(1.0, y / (0.20 / severity))
        coverage_score = min(1.0, plant_coverage / 0.20)

        score = (
            pigment_score * 0.30 +
            gq * 0.15 +
            (1.0 - brown_penalty) * 0.35 +
            (1.0 - yellow_penalty) * 0.10 +
            coverage_score * 0.10
        )
        score = max(0.0, min(1.0, score))

        # Category
        if score >= 0.75:
            cat = "healthy"
        elif pigment < 0.05 and b > 0.05:
            cat = "dehydration" if y > b else "disease"
        elif score < 0.50:
            cat = "stress"
        else:
            cat = "watch"

        return round(score, 4), cat

    def _build_details(self, cur, abs_score=None, rel_score=None,
                       pigment_ret=None, green_ret=None,
                       brown_pen=None, yellow_pen=None,
                       hist_sim=None, texture_sim=None, spot_score=None):
        """Build details dict for a scored zone."""
        details = {
            "green_pct": round(cur["green"] * 100, 1),
            "green_quality_pct": round(cur["green_quality"] * 100, 1),
            "red_pct": round(cur["red"] * 100, 1),
            "magenta_pct": round(cur["magenta"] * 100, 1),
            "purple_pct": round(cur["purple"] * 100, 1),
            "pigment_pct": round(cur["pigment"] * 100, 1),
            "brown_pct": round(cur["brown"] * 100, 1),
            "yellow_pct": round(cur["yellow"] * 100, 1),
            "absolute_score": abs_score,
        }
        if rel_score is not None:
            details.update({
                "relative_score": round(rel_score, 4),
                "pigment_retention": round(pigment_ret, 4),
                "green_retention": round(green_ret, 4),
                "brown_penalty": round(brown_pen, 4),
                "yellow_penalty": round(yellow_pen, 4),
                "histogram_sim": round(hist_sim, 4),
                "texture_sim": round(texture_sim, 4),
                "spot_score": round(spot_score, 4),
            })
        return details

    def maybe_update_baseline(self, zone_id, image, score, hours=6):
        if zone_id not in self.baseline_times:
            self.set_baseline(zone_id, image)
            return True
        elapsed = (datetime.now() - self.baseline_times[zone_id]).total_seconds() / 3600
        if score >= 0.85 and elapsed >= hours:
            self.set_baseline(zone_id, image)
            return True
        return False

    def _color_ratios(self, hsv):
        t = hsv.shape[0] * hsv.shape[1]
        green_mask = cv2.inRange(hsv, np.array([25, 40, 40]), np.array([85, 255, 255]))
        g = np.sum(green_mask > 0) / t
        purple = np.sum(cv2.inRange(hsv, np.array([120, 30, 30]), np.array([140, 255, 255])) > 0) / t
        magenta = np.sum(cv2.inRange(hsv, np.array([140, 40, 40]), np.array([160, 255, 255])) > 0) / t
        red_hi = np.sum(cv2.inRange(hsv, np.array([160, 50, 40]), np.array([180, 255, 255])) > 0) / t
        red_lo = np.sum(cv2.inRange(hsv, np.array([0, 80, 40]), np.array([10, 255, 255])) > 0) / t

        b = np.sum(cv2.inRange(hsv, np.array([5, 20, 30]), np.array([25, 180, 220])) > 0) / t

        y = np.sum(cv2.inRange(hsv, np.array([15, 40, 50]), np.array([25, 255, 255])) > 0) / t

        pigment = g + red_lo + red_hi + magenta + purple

        green_quality = 1.0
        green_pixels = hsv[green_mask > 0]
        if len(green_pixels) > 100:
            v_median = float(np.median(hsv[:, :, 2])) # uses overall image brightness to create dynamic green quality threshold.
            v_thresh = max(60.0, v_median * 0.6)
            saturation_mean = np.mean(green_pixels[:, 1] >= 45)
            value_mean = np.mean(green_pixels[:, 2] >= v_thresh)
            green_quality = (saturation_mean * 0.5 + value_mean * 0.5)
            
        return {
            "green": g, "brown": b, "yellow": y,
            "red": red_lo + red_hi, "magenta": magenta, "purple": purple,
            "pigment": pigment,
            "green_quality": green_quality,
        }

    def _hist_sim(self, h1, h2):
        a = cv2.calcHist([h1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        b = cv2.calcHist([h2], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(a, a, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(b, b, 0, 1, cv2.NORM_MINMAX)
        return max(0, cv2.compareHist(a, b, cv2.HISTCMP_CORREL))

    def _ssim(self, i1, i2):
        g1 = cv2.cvtColor(i1, cv2.COLOR_BGR2GRAY).astype(np.float64)
        g2 = cv2.cvtColor(i2, cv2.COLOR_BGR2GRAY).astype(np.float64)
        g1 = (g1 - g1.mean()) / (g1.std() + 1e-6) # Normalize luminance so brightness offsets between baseline and
        g2 = (g2 - g2.mean()) / (g2.std() + 1e-6) # current frame don't tank the structural similarity score.
        g1 = np.clip(g1 * 64.0 + 128.0, 0, 255)
        g2 = np.clip(g2 * 64.0 + 128.0, 0, 255)
        C1, C2 = (0.01*255)**2, (0.03*255)**2
        m1 = cv2.GaussianBlur(g1, (11, 11), 1.5)
        m2 = cv2.GaussianBlur(g2, (11, 11), 1.5)
        s1 = cv2.GaussianBlur(g1**2, (11, 11), 1.5) - m1**2
        s2 = cv2.GaussianBlur(g2**2, (11, 11), 1.5) - m2**2
        s12 = cv2.GaussianBlur(g1*g2, (11, 11), 1.5) - m1*m2
        ssim = ((2*m1*m2+C1)*(2*s12+C2)) / ((m1**2+m2**2+C1)*(s1+s2+C2))
        return float(max(0, np.mean(ssim)))

    def _spot_detect(self, i1, i2): 
        g1 = cv2.cvtColor(i1, cv2.COLOR_BGR2GRAY) 
        g2 = cv2.cvtColor(i2, cv2.COLOR_BGR2GRAY) # removed thresholds to account for brightness 
        def _auto_canny(gray, sigma=0.33):
            m = float(np.median(gray))
            lo = int(max(0, (1.0 - sigma) * m))
            hi = int(min(255, (1.0 + sigma) * m))
            return cv2.Canny(gray, lo, hi)
        e1 = _auto_canny(g1)
        e2 = _auto_canny(g2)
        d1, d2 = np.sum(e1 > 0) / e1.size, np.sum(e2 > 0) / e2.size
        return min(1.0, max(0, (d2 - d1) / d1)) if d1 > 0 else 0
    
class PlantHealthCV:
    def __init__(self, rows=2, cols=3, monitor_id_start=1, save_dir="captures"):
        self.grid = GridZoneManager(rows=rows, cols=cols)
        self.cv = CVScorer()
        self.monitor_id_start = monitor_id_start
        self.save_dir = save_dir
        self.initialized = False
        os.makedirs(save_dir, exist_ok=True)

    def process_frame(self, image_path):
        frame = cv2.imread(image_path)
        if frame is None:
            raise FileNotFoundError(f"Cannot load: {image_path}")

        frame = white_balance(frame)

        if not self.initialized:
            self.grid.setup(frame)
            self.initialized = True

        timestamp = datetime.now()
        ts_str = timestamp.strftime("%Y-%m-%d_%H-%M")
        results = []
        scores_map = {}

        for i, (zone, cropped) in enumerate(self.grid.crop_all(frame)):
            zone_id = zone["zone_id"]
            monitor_id = self.monitor_id_start + i

            crop_path = os.path.join(self.save_dir, f"{zone_id}_{ts_str}.jpg")
            cv2.imwrite(crop_path, cropped)

            score, category, details = self.cv.score(zone_id, cropped)
            scores_map[zone_id] = score

            # Baseline update (skip empty zones)
            if category != "no_plant":
                self.cv.maybe_update_baseline(zone_id, cropped, score)

            results.append({
                "monitor_id": monitor_id,
                "time": timestamp.isoformat(),
                "value": score,
                "file_path": crop_path,
                "zone_id": zone_id,
                "category": category,
                "cv_details": details,
            })

        overview = self.grid.draw_grid(frame, scores_map)
        cv2.imwrite(os.path.join(self.save_dir, f"overview_{ts_str}.jpg"), overview)

        return results
