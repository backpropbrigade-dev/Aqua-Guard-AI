"""
Plastic detection: HOG features + LinearSVM, sliding-window inference, NMS.
Adapted for CLI + joblib export. Set ROBOFLOW_API_KEY to download the Roboflow dataset.

Original workflow: Roboflow dataset → patch positives/negatives → train → test images → runs/detect/predict_simple
"""

from __future__ import annotations

import argparse
import glob
import os
import random
import sys
from pathlib import Path

import cv2
import joblib
import numpy as np
from roboflow import Roboflow
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC
from skimage.feature import hog
from tqdm import tqdm

# --- Repo-relative paths ---
HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE / "models"
RUNS_DIR = HERE / "runs" / "detect" / "predict_simple"


def parse_yolo_labels(label_path: str, img_width: int, img_height: int) -> list[tuple[int, int, int, int]]:
    """YOLO txt: class x_center y_center w h (normalized). Returns (x1,y1,x2,y2) in pixels."""
    boxes: list[tuple[int, int, int, int]] = []
    if not os.path.exists(label_path):
        return boxes
    with open(label_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            x_center = float(parts[1]) * img_width
            y_center = float(parts[2]) * img_height
            w = float(parts[3]) * img_width
            h = float(parts[4]) * img_height
            x1 = int(x_center - w / 2)
            y1 = int(y_center - h / 2)
            x2 = int(x_center + w / 2)
            y2 = int(y_center + h / 2)
            boxes.append((x1, y1, x2, y2))
    return boxes


def sliding_window(image: np.ndarray, step_size: int, window_size: tuple[int, int]):
    win_w, win_h = window_size
    for y in range(0, image.shape[0] - win_h, step_size):
        for x in range(0, image.shape[1] - win_w, step_size):
            yield x, y, image[y : y + win_h, x : x + win_w]


def non_max_suppression(boxes: list | np.ndarray, overlap_thresh: float) -> np.ndarray:
    if len(boxes) == 0:
        return np.array([])
    boxes = np.array(boxes, dtype="float")
    pick: list[int] = []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    area = (x2 - x1 + 1) * (y2 - y1 + 1)
    idxs = np.argsort(y2)
    while len(idxs) > 0:
        last = len(idxs) - 1
        i = int(idxs[last])
        pick.append(i)
        xx1 = np.maximum(x1[i], x1[idxs[:last]])
        yy1 = np.maximum(y1[i], y1[idxs[:last]])
        xx2 = np.minimum(x2[i], x2[idxs[:last]])
        yy2 = np.minimum(y2[i], y2[idxs[:last]])
        w = np.maximum(0, xx2 - xx1 + 1)
        h = np.maximum(0, yy2 - yy1 + 1)
        overlap = (w * h) / area[idxs[:last]]
        idxs = np.delete(
            idxs,
            np.concatenate(([last], np.where(overlap > overlap_thresh)[0])),
        )
    return boxes[pick].astype("int")


def hog_vec(patch_gray: np.ndarray, patch_size: tuple[int, int]) -> np.ndarray:
    resized = cv2.resize(patch_gray, patch_size)
    return hog(
        resized,
        orientations=9,
        pixels_per_cell=(8, 8),
        cells_per_block=(2, 2),
        block_norm="L2-Hys",
        transform_sqrt=True,
    )


def download_dataset(api_key: str) -> str:
    rf = Roboflow(api_key=api_key)
    project = rf.workspace("digital-image-processing-k3cbl").project("plastic-detection-dataset")
    dataset = project.version(1).download("yolov8")
    return dataset.location


def prepare_training_data(
    dataset_path: str,
    patch_size: tuple[int, int],
    neg_samples_per_image: int,
) -> tuple[np.ndarray, np.ndarray]:
    data: list[np.ndarray] = []
    labels: list[int] = []
    train_images_path = os.path.join(dataset_path, "train", "images")
    train_labels_path = os.path.join(dataset_path, "train", "labels")
    image_files = glob.glob(os.path.join(train_images_path, "*.jpg"))
    pw, ph = patch_size

    for img_path in tqdm(image_files, desc="Training patches"):
        image = cv2.imread(img_path)
        if image is None:
            continue
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        if w < pw or h < ph:
            continue

        label_name = os.path.basename(img_path).replace(".jpg", ".txt")
        label_path = os.path.join(train_labels_path, label_name)
        gt_boxes = parse_yolo_labels(label_path, w, h)

        for x1, y1, x2, y2 in gt_boxes:
            positive = gray[y1:y2, x1:x2]
            if positive.size == 0:
                continue
            data.append(hog_vec(positive, patch_size))
            labels.append(1)

        attempts = 0
        added = 0
        while added < neg_samples_per_image and attempts < neg_samples_per_image * 20:
            attempts += 1
            rand_x = random.randint(0, w - pw)
            rand_y = random.randint(0, h - ph)
            overlaps = False
            for bx1, by1, bx2, by2 in gt_boxes:
                if not (
                    rand_x > bx2
                    or rand_x + pw < bx1
                    or rand_y > by2
                    or rand_y + ph < by1
                ):
                    overlaps = True
                    break
            if overlaps:
                continue
            neg = gray[rand_y : rand_y + ph, rand_x : rand_x + pw]
            data.append(hog_vec(neg, patch_size))
            labels.append(0)
            added += 1

    return np.array(data), np.array(labels)


def run_test_sliding_window(
    model_pipeline: Pipeline,
    dataset_path: str,
    patch_size: tuple[int, int],
    step_size: int,
    output_dir: Path,
) -> None:
    test_dir = os.path.join(dataset_path, "test", "images")
    output_dir.mkdir(parents=True, exist_ok=True)
    win_w, win_h = patch_size

    for test_image_path in glob.glob(os.path.join(test_dir, "*.jpg")):
        img = cv2.imread(test_image_path)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        detections: list[tuple[int, int, int, int]] = []

        for x, y, window in sliding_window(gray, step_size, (win_w, win_h)):
            if window.shape[0] != win_h or window.shape[1] != win_w:
                continue
            features = hog(
                window,
                orientations=9,
                pixels_per_cell=(8, 8),
                cells_per_block=(2, 2),
                block_norm="L2-Hys",
                transform_sqrt=True,
            )
            prediction = model_pipeline.predict(features.reshape(1, -1))
            if prediction[0] == 1:
                detections.append((x, y, x + win_w, y + win_h))

        final_boxes = non_max_suppression(detections, overlap_thresh=0.3)
        out = img.copy()
        for x1, y1, x2, y2 in final_boxes:
            cv2.rectangle(out, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                out,
                "Plastic",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
            )
        out_path = output_dir / os.path.basename(test_image_path)
        cv2.imwrite(str(out_path), out)
        print(f"Wrote {out_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Train HOG+SVM plastic detector and run test sliding window.")
    parser.add_argument(
        "--dataset",
        type=str,
        default="",
        help="Path to YOLOv8-format dataset root (train/images, train/labels, test/images). If empty, download via Roboflow.",
    )
    parser.add_argument("--neg-per-image", type=int, default=10)
    parser.add_argument("--step", type=int, default=16, help="Sliding window step on test images.")
    args = parser.parse_args()

    patch_size = (64, 128)  # (width, height) for cv2.resize / window

    if args.dataset:
        dataset_path = os.path.abspath(args.dataset)
        if not os.path.isdir(dataset_path):
            print(f"Dataset path not found: {dataset_path}", file=sys.stderr)
            return 1
    else:
        api_key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
        if not api_key:
            print(
                "Set ROBOFLOW_API_KEY or pass --dataset /path/to/Plastic-Detection-Dataset-1",
                file=sys.stderr,
            )
            return 1
        try:
            dataset_path = download_dataset(api_key)
            print(f"Dataset downloaded to: {dataset_path}")
        except Exception as e:
            print(f"Roboflow download failed: {e}", file=sys.stderr)
            return 1

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print("Preparing training data...")
    X, y = prepare_training_data(dataset_path, patch_size, args.neg_per_image)
    if len(X) < 10:
        print("Not enough training samples. Check dataset paths.", file=sys.stderr)
        return 1
    print(f"Total samples: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model_pipeline: Pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("svm", LinearSVC(C=1.0, random_state=42, tol=1e-5, max_iter=2000)),
        ]
    )
    print("Training LinearSVM...")
    model_pipeline.fit(X_train, y_train)

    y_pred = model_pipeline.predict(X_test)
    print("\n--- Classifier evaluation ---")
    print(classification_report(y_test, y_pred, target_names=["Not Plastic", "Plastic"]))
    print("Confusion matrix:\n", confusion_matrix(y_test, y_pred))

    model_path = MODEL_DIR / "hog_svm_plastic.joblib"
    joblib.dump(model_pipeline, model_path)
    print(f"\nSaved pipeline to {model_path}")

    print("\nRunning sliding-window prediction on test images...")
    run_test_sliding_window(model_pipeline, dataset_path, patch_size, args.step, RUNS_DIR)
    print(f"\nDone. Outputs in {RUNS_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
