#!/usr/bin/env python3
"""Derive particle targets and traced SVGs from the supplied logo, without redesign."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt


def simplify(points, tolerance=1.05):
    """Ramer-Douglas-Peucker, preserving subpixel-faithful raster boundaries."""
    points = np.asarray(points, dtype=np.float64)
    if len(points) < 3:
        return points
    delta = points[-1] - points[0]
    norm = np.linalg.norm(delta)
    if norm == 0:
        distances = np.linalg.norm(points - points[0], axis=1)
    else:
        offset = points - points[0]
        distances = np.abs(delta[0] * offset[:, 1] - delta[1] * offset[:, 0]) / norm
    index = int(np.argmax(distances))
    if distances[index] > tolerance:
        return np.vstack((simplify(points[:index + 1], tolerance)[:-1],
                          simplify(points[index:], tolerance)))
    return points[[0, -1]]


def contours(mask):
    """Trace oriented pixel-cell boundary edges into exact closed contours."""
    m = np.pad(mask, 1)
    edges = {}
    for orientation, exposed in [
        ('top', m[1:-1, 1:-1] & ~m[:-2, 1:-1]),
        ('right', m[1:-1, 1:-1] & ~m[1:-1, 2:]),
        ('bottom', m[1:-1, 1:-1] & ~m[2:, 1:-1]),
        ('left', m[1:-1, 1:-1] & ~m[1:-1, :-2]),
    ]:
        yy, xx = np.nonzero(exposed)
        for y, x in zip(yy, xx):
            x, y = int(x), int(y)
            if orientation == 'top': a, b = (x, y), (x + 1, y)
            elif orientation == 'right': a, b = (x + 1, y), (x + 1, y + 1)
            elif orientation == 'bottom': a, b = (x + 1, y + 1), (x, y + 1)
            else: a, b = (x, y + 1), (x, y)
            edges.setdefault(a, []).append(b)
    result = []
    while edges:
        start = next(iter(edges))
        point, path = start, [start]
        while True:
            ends = edges[point]
            following = ends.pop()
            if not ends: del edges[point]
            point = following
            path.append(point)
            if point == start: break
        if len(path) > 8:
            result.append(simplify(path))
    return result


def path_data(paths):
    return ' '.join('M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in path) + ' Z'
                    for path in paths)


def sample(mask, count, rng):
    distance = distance_transform_edt(mask)
    yy, xx = np.nonzero(mask)
    # 55% near-edge weighted sampling, 45% uniform fill.
    weights = np.exp(-(distance[yy, xx] - 1) / 7)
    weights = .55 * weights / weights.sum() + .45 / len(weights)
    indices = rng.choice(len(xx), count, replace=True, p=weights)
    return np.column_stack((xx[indices] + rng.random(count),
                            yy[indices] + rng.random(count)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=Path(__file__).parent.parent / 'public/assets/logo-source.png')
    parser.add_argument('--output', type=Path, default=Path(__file__).parent)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    rgba = np.asarray(Image.open(args.input).convert('RGBA'))
    rgb = rgba[:, :, :3].astype(np.int16)
    dark = (rgb.max(axis=2) < 100) & (rgba[:, :, 3] > 127)
    red = (rgb[:, :, 0] > 180) & (rgb[:, :, 0] - rgb[:, :, 1] > 100) & (rgb[:, :, 0] - rgb[:, :, 2] > 100) & (rgba[:, :, 3] > 127)
    yy, xx = np.nonzero(dark | red)
    x0, y0, x1, y1 = int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1
    dark, red = dark[y0:y1, x0:x1], red[y0:y1, x0:x1]
    h, w = dark.shape
    scale = max(w, h)
    rng = np.random.default_rng(1374)
    n, n_red = 26000, 5460
    xy = np.concatenate((sample(dark, n - n_red, rng), sample(red, n_red, rng)))
    types = np.r_[np.zeros(n - n_red), np.ones(n_red)]
    xyz = np.column_stack(((xy[:, 0] - w / 2) * 2 / scale,
                           (h / 2 - xy[:, 1]) * 2 / scale,
                           rng.uniform(-.035, .035, n)))
    seeds = rng.random(n)
    sizes = .55 + 1.15 * rng.power(.7, n)
    brightness = np.clip(.22 + .55 * rng.random(n) + .15 * (sizes - .55), .22, 1)
    particles = np.column_stack((xyz, types, seeds, sizes, brightness)).astype('<f4')
    # Every 100-record block has exactly 79 white / 21 red, with random order.
    # Thus all requested 6,500 / 14,000 / 22,000-point prefixes retain the ratio.
    whites, reds = particles[:n - n_red].copy(), particles[n - n_red:].copy()
    rng.shuffle(whites)
    rng.shuffle(reds)
    for block in range(n // 100):
        batch = np.concatenate((whites[block * 79:(block + 1) * 79],
                                reds[block * 21:(block + 1) * 21]))
        rng.shuffle(batch)
        particles[block * 100:(block + 1) * 100] = batch
    particles.tofile(args.output / 'logo-particles.bin')
    lite = [[round(float(p[0]), 4), round(float(p[1]), 4), int(p[3])] for p in particles[:6200]]
    (args.output / 'logoTargetsLite.json').write_text(json.dumps(lite, separators=(',', ':')))

    paths = [contours(dark), contours(red)]
    for filename, dark_color in [('logo-mark-original.svg', '#070707'), ('logo-mark.svg', '#ffffff')]:
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none">\n'
        svg += f'<path fill="{dark_color}" fill-rule="evenodd" d="{path_data(paths[0])}"/>\n'
        svg += f'<path fill="#FF3131" fill-rule="evenodd" d="{path_data(paths[1])}"/>\n</svg>\n'
        (args.output / filename).write_text(svg)

    # The static fallback keeps the exact geometry, with fine grain and 7% stars.
    n_fallback, n_fallback_red = 2800, 588
    subset = np.r_[rng.choice(np.flatnonzero(particles[:, 3] == 0), n_fallback - n_fallback_red, replace=False),
                   rng.choice(np.flatnonzero(particles[:, 3] == 1), n_fallback_red, replace=False)]
    rng.shuffle(subset)
    chosen = particles[subset]
    vpw, vph, pad = w / scale * 1024, h / scale * 1024, 24
    unit_pad = pad / 512
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-w / scale - unit_pad:.6f} {-h / scale - unit_pad:.6f} {w / scale * 2 + 2 * unit_pad:.6f} {h / scale * 2 + 2 * unit_pad:.6f}" fill="none">\n'
    svg += '''<defs>
<radialGradient id="white-star"><stop stop-color="#fff" stop-opacity=".92"/><stop offset=".13" stop-color="#f6f6ff" stop-opacity=".63"/><stop offset=".32" stop-color="#eeeeff" stop-opacity=".19"/><stop offset=".61" stop-color="#e3e3ff" stop-opacity=".035"/><stop offset="1" stop-color="#e3e3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="red-star"><stop stop-color="#ff3934" stop-opacity=".95"/><stop offset=".13" stop-color="#FF3131" stop-opacity=".72"/><stop offset=".32" stop-color="#FF3131" stop-opacity=".26"/><stop offset=".61" stop-color="#FF3131" stop-opacity=".055"/><stop offset="1" stop-color="#FF3131" stop-opacity="0"/></radialGradient>
</defs>
'''
    bright = np.zeros(n_fallback, dtype=bool)
    bright[rng.choice(np.flatnonzero(chosen[:, 3] == 0), 155, replace=False)] = True
    bright[rng.choice(np.flatnonzero(chosen[:, 3] == 1), 41, replace=False)] = True
    radii = .35 + rng.power(1.25, n_fallback) * 1.6
    radii[bright] = 1.7 + rng.random(bright.sum()) * .95
    opacity = .32 + .66 * rng.power(1.5, n_fallback)
    is_red = chosen[:, 3] == 1
    opacity[is_red] = .67 + .33 * rng.power(1.5, is_red.sum())
    opacity[bright] = 1
    radii[is_red] *= 1.06
    glow_radii = 7.5 + rng.random(n_fallback) * 7.5
    # All glows precede all cores, so adjacent halos never mute a bright grain.
    for index in np.flatnonzero(bright):
        p = chosen[index]
        gradient = 'red-star' if p[3] else 'white-star'
        svg += f'<circle cx="{p[0]:.5f}" cy="{-p[1]:.5f}" r="{glow_radii[index] / 512:.5f}" fill="url(#{gradient})"/>\n'
    for index, p in enumerate(chosen):
        x, y = p[0], -p[1]
        color = '#FF3131' if p[3] else ('#ffffff' if bright[index] else '#f3f3ff')
        svg += f'<circle cx="{x:.5f}" cy="{y:.5f}" r="{radii[index] / 512:.5f}" fill="{color}" opacity="{opacity[index]:.2f}"/>\n'
    svg += '</svg>\n'
    (args.output / 'logo-particle-fallback.svg').write_text(svg)

    # A separate, exceptionally quiet background field; no filters or animations.
    background_rng = np.random.default_rng(8137)
    background = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" fill="none">\n'
    for index in range(500):
        x, y = background_rng.random(2) * [1600, 1000]
        radius = .23 + .65 * background_rng.power(.7)
        alpha = .035 + .145 * background_rng.power(.7)
        if index % 51 == 0:
            radius, alpha = 1.0, .19
        background += f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius:.2f}" fill="#c7c9e7" opacity="{alpha:.3f}"/>\n'
    background += '</svg>\n'
    (args.output / 'background-stars.svg').write_text(background)

    # Exact SVG rendering when the local Inkscape CLI is available.
    if shutil.which('inkscape'):
        subprocess.run(['inkscape', str(args.output / 'logo-particle-fallback.svg'),
                        '--export-type=png', '--export-width=1000',
                        f'--export-filename={args.output / "logo-particle-preview.png"}',
                        '--export-background=#080812', '--export-background-opacity=1'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Rasterize the traced paths to quantify contour fidelity at the original scale.
    ious = []
    for mask, traced in zip((dark, red), paths):
        reconstructed = Image.new('1', (w, h))
        painter = ImageDraw.Draw(reconstructed)
        for path in traced:
            painter.polygon([tuple(p) for p in path], fill=1)
        rec = np.asarray(reconstructed)
        ious.append(float((rec & mask).sum() / (rec | mask).sum()))
    metadata = {
        'source': str(args.input), 'source_size': list(rgba.shape[:2][::-1]),
        'source_crop_xyxy': [x0, y0, x1, y1], 'crop_size': [w, h],
        'count': n, 'white_count': n - n_red, 'red_count': n_red,
        'white_fraction': .79, 'red_fraction': .21,
        'binary': {'file': 'logo-particles.bin', 'dtype': 'little-endian float32',
                   'stride_floats': 7, 'stride_bytes': 28,
                   'fields': ['x', 'y', 'z', 'type', 'seed', 'size', 'brightness']},
        'coordinates': {'x': 'right', 'y': 'up', 'max_xy_dimension': 2,
                        'center': [0, 0, 0], 'z_range': [-.035, .035]},
        'type': {'0': 'white (source black geometry)', '1': 'red'},
        'seed_range': [0, 1], 'size_range': [.55, 1.70],
        'brightness_range': [.22, 1], 'random_seed': 1374,
        'sampling': '55% edge weighting with 7px decay; 45% uniform filled-mask sampling; subpixel jitter',
        'fallback_count': n_fallback, 'fallback_white_count': n_fallback - n_fallback_red,
        'fallback_red_count': n_fallback_red, 'fallback_luminous_stars': int(bright.sum()),
        'fallback_luminous_fraction': .07, 'background_star_count': 500,
        'prefix_counts': {str(k): {'white': int((particles[:k, 3] == 0).sum()), 'red': int((particles[:k, 3] == 1).sum())} for k in [6500, 14000, 22000, 26000]},
        'tracing': {'method': 'thresholded pixel boundaries, RDP tolerance 1.05 source pixels',
                    'dark_vertices': sum(len(p) for p in paths[0]),
                    'red_vertices': sum(len(p) for p in paths[1]),
                    'rasterized_iou_dark_red': ious},
    }
    (args.output / 'logo-particles.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    sys.setrecursionlimit(10000)
    main()
