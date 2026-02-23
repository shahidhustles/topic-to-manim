#!/usr/bin/env python3
"""
Render Manim animations with watermark overlay.

Usage:
    python scripts/render.py <animation.py> <SceneName> [options]

Options:
    -q, --quality   Render quality: l (low), m (medium), h (high), k (4k)
    -w, --watermark Watermark text (default: "© Vibe Ask")
    -o, --output    Output directory (default: same as input file)
    --no-watermark  Render without watermark
    --keep-original Keep the original non-watermarked video

Example:
    python scripts/render.py generated/xxx/pythagorean_animation.py PythagoreanTheorem -q h
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()


def create_watermark_image(
    text: str = "© Vibe Ask",
    font_size: int = 24,
    opacity: float = 0.7,
    output_path: Path | None = None,
) -> Path:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("Error: PIL/Pillow is required. Install with: pip install Pillow")
        sys.exit(1)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size
            )
        except (OSError, IOError):
            font = ImageFont.load_default()

    dummy_img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    padding = 4
    img_width = int(text_width + 2 * padding)
    img_height = int(text_height + 2 * padding)

    img = Image.new("RGBA", (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    alpha = int(opacity * 255)
    text_color = (255, 255, 255, alpha)

    draw.text((padding, padding), text, font=font, fill=text_color)

    if output_path is None:
        output_path = SCRIPT_DIR / "watermark.png"

    img.save(output_path, "PNG")
    return output_path


def find_video_file(output_dir: Path, scene_name: str, quality: str) -> Path | None:
    quality_map = {"l": "480p15", "m": "720p30", "h": "1080p60", "k": "2160p60"}
    quality_suffix = quality_map.get(quality, "1080p60")

    media_dir = output_dir / "media" / "videos"
    if not media_dir.exists():
        return None

    for video_file in media_dir.rglob(f"{scene_name}.mp4"):
        if quality_suffix in str(video_file):
            return video_file

    video_files = list(media_dir.rglob(f"{scene_name}.mp4"))
    if video_files:
        return video_files[0]

    return None


def render_manim(py_file: Path, scene_name: str, quality: str) -> bool:
    quality_flags = {"l": "-pql", "m": "-pqm", "h": "-pqh", "k": "-pqk"}
    flag = quality_flags.get(quality, "-pqh")

    cmd = ["manim", flag, str(py_file), scene_name]
    print(f"\n[1/2] Rendering with Manim: {' '.join(cmd)}")

    result = subprocess.run(cmd, cwd=py_file.parent, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Manim render failed:\n{result.stderr}")
        return False

    print("Manim render completed successfully")
    return True


def add_watermark(
    input_video: Path,
    output_video: Path,
    watermark_text: str = "© Vibe Ask",
    font_size: int = 24,
    opacity: float = 0.7,
    watermark_image: Path | None = None,
) -> bool:
    if watermark_image is None:
        watermark_image = create_watermark_image(
            text=watermark_text,
            font_size=font_size,
            opacity=opacity,
        )

    if not watermark_image.exists():
        print(f"Error: Watermark image not found: {watermark_image}")
        return False

    filter_str = f"[1:v]format=rgba,colorchannelmixer=aa={opacity}[wm];[0:v][wm]overlay=W-w-10:H-h-10"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_video),
        "-i",
        str(watermark_image),
        "-filter_complex",
        filter_str,
        "-c:a",
        "copy",
        str(output_video),
    ]

    print(f"\n[2/2] Adding watermark with FFmpeg...")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"FFmpeg watermark failed:\n{result.stderr}")
        return False

    print(f"Watermark added successfully: {output_video}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Render Manim animations with watermark overlay",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("animation_file", help="Path to the Manim Python file")
    parser.add_argument("scene_name", help="Name of the Scene class to render")
    parser.add_argument(
        "-q",
        "--quality",
        choices=["l", "m", "h", "k"],
        default="h",
        help="Render quality: l (480p), m (720p), h (1080p), k (4k)",
    )
    parser.add_argument(
        "-w",
        "--watermark",
        default="© Vibe Ask",
        help='Watermark text (default: "© Vibe Ask")',
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Output directory (default: same as input file)",
    )
    parser.add_argument(
        "--no-watermark",
        action="store_true",
        help="Render without watermark",
    )
    parser.add_argument(
        "--keep-original",
        action="store_true",
        help="Keep the original non-watermarked video",
    )
    parser.add_argument(
        "--font-size",
        type=int,
        default=24,
        help="Watermark font size (default: 24)",
    )
    parser.add_argument(
        "--opacity",
        type=float,
        default=0.7,
        help="Watermark opacity 0.0-1.0 (default: 0.7)",
    )

    args = parser.parse_args()

    py_file = Path(args.animation_file).resolve()
    if not py_file.exists():
        print(f"Error: File not found: {py_file}")
        sys.exit(1)

    output_dir = Path(args.output).resolve() if args.output else py_file.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    if not render_manim(py_file, args.scene_name, args.quality):
        sys.exit(1)

    video_file = find_video_file(py_file.parent, args.scene_name, args.quality)
    if not video_file:
        print(f"Error: Could not find rendered video for scene {args.scene_name}")
        sys.exit(1)

    print(f"Found video: {video_file}")

    if args.no_watermark:
        final_output = output_dir / f"{args.scene_name}.mp4"
        if video_file != final_output:
            import shutil

            shutil.copy2(video_file, final_output)
        print(f"\nDone! Output: {final_output}")
    else:
        final_output = output_dir / f"{args.scene_name}.mp4"
        if not add_watermark(
            video_file,
            final_output,
            watermark_text=args.watermark,
            font_size=args.font_size,
            opacity=args.opacity,
        ):
            sys.exit(1)

        if not args.keep_original:
            try:
                video_file.unlink()
                print(f"Removed original: {video_file}")
            except Exception as e:
                print(f"Warning: Could not remove original: {e}")

        print(f"\nDone! Output: {final_output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
