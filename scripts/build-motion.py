"""Extract reviewed generated pose sheets and encode their GIFs with FFmpeg.

This performs format/crop assembly only; it never invents or morphs body poses.
Run from the repository root. Source sheets are produced with image_gen.
"""
import json
import pathlib
import subprocess
import sys
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
JOBS = ROOT / 'assets/motion/production-jobs.json'

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def build(job):
    n = len(job['labels'])
    target = ROOT / 'assets/motion' / job['key']
    target.mkdir(exist_ok=True)
    if 'frameSources' not in job:
        source = pathlib.Path(job['source'])
        info = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', str(source)))['streams'][0]
        cols, rows = (2, 2) if n == 4 else (3, 1)
        width, height = info['width'] // cols, info['height'] // rows
    for i in range(n):
        if 'frameSources' in job:
            shutil.copyfile(ROOT / job['frameSources'][i], target / f'{i+1}.png')
            continue
        # Trim only separators, preserve complete figure and apparatus.
        x, y = (i % cols) * width + 3, (i // cols) * height + 3
        crop = job.get('crops', [None] * n)[i]
        if crop: x, y, w, h = crop
        else: w, h = width - 6, height - 6
        run('ffmpeg', '-v', 'error', '-y', '-i', str(source), '-filter_complex',
            f'crop={w}:{h}:{x}:{y},scale=372:408:force_original_aspect_ratio=decrease,pad=372:408:(ow-iw)/2:(oh-ih)/2:white,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none',
            '-frames:v', '1', '-compression_level', '9', str(target / f'{i+1}.png'))
    sequence = job.get('sequence', list(range(n)) if n == 4 else [0, 1, 2, 1])
    durations = job.get('durations', [1100] * len(sequence))
    concat = ''.join(f"file '{target / f'{i+1}.png'}'\nduration {durations[k]/1000}\n" for k, i in enumerate(sequence))
    concat += f"file '{target / f'{sequence[-1]+1}.png'}'\n"
    manifest = target / 'frames.txt'
    manifest.write_text(concat)
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(manifest),
        '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none',
        '-loop', '0', str(target / 'loop.gif'))
    manifest.unlink()
    print(job['key'], n, 'frames', sum(p.stat().st_size for p in target.iterdir()), 'bytes')

jobs = json.loads(JOBS.read_text())
for job in jobs:
    if job['status'] in ('reviewed-awaiting-frame-QA', 'accepted') and (len(sys.argv) == 1 or job['key'] in sys.argv[1:]):
        build(job)
