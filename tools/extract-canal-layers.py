import os
import subprocess
import math

def main():
    src_img = 'public/images/background_art_a/คลองหมอกจันทร์กับเงาอสูรใต้น้ำ.png'
    out_dir = 'public/theme_games/village-canal'
    os.makedirs(out_dir, exist_ok=True)

    # Decode source image to raw RGBA
    p = subprocess.Popen(
        ['ffmpeg', '-i', src_img, '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )
    raw_bytes, _ = p.communicate()
    w, h = 1536, 1024
    if len(raw_bytes) != w * h * 4:
        raise ValueError(f"Expected {w*h*4} bytes, got {len(raw_bytes)}")

    # Helper to write PNG from RGBA buffer
    def write_png(raw_buf, out_path):
        p_out = subprocess.Popen(
            ['ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-i', '-',
             '-update', '1', '-frames:v', '1', '-c:v', 'png', out_path],
            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        p_out.communicate(input=bytes(raw_buf))
        print(f"Wrote {out_path}")

    # 1. Base image copy/link
    print("Base image is:", src_img)

    # 2. Foreground Right (Wooden post with scratches, ropes, and tall reeds)
    # Location in 1536x1024: x from ~1050 to 1536, y from ~120 to 1024.
    print("Extracting foreground-right.png...")
    fg_right = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            cutoff = 1140 - (y - 150) * 0.18 if y >= 150 else 1140
            feather = 40.0
            if x >= cutoff:
                alpha_factor = min(1.0, (x - cutoff) / feather)
                fg_right[idx] = raw_bytes[idx]
                fg_right[idx+1] = raw_bytes[idx+1]
                fg_right[idx+2] = raw_bytes[idx+2]
                fg_right[idx+3] = int(raw_bytes[idx+3] * alpha_factor)
            else:
                fg_right[idx+3] = 0
    write_png(fg_right, f'{out_dir}/foreground-right.png')

    # 3. Foreground Left (Dock planks, hanging lantern, water lily in corner)
    print("Extracting foreground-left.png...")
    fg_left = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            # Dock boundary:
            # At y=100: x <= 110
            # At y=300: x <= 200
            # At y=500: x <= 300
            # At y=800: x <= 380
            cutoff = 110 + (y - 100) * 0.38 if y >= 100 else 100
            feather = 35.0
            if y >= 90 and x <= cutoff + feather:
                alpha_factor = 1.0 if x <= cutoff else max(0.0, 1.0 - (x - cutoff) / feather)
                fg_left[idx] = raw_bytes[idx]
                fg_left[idx+1] = raw_bytes[idx+1]
                fg_left[idx+2] = raw_bytes[idx+2]
                fg_left[idx+3] = int(raw_bytes[idx+3] * alpha_factor)
            else:
                fg_left[idx+3] = 0
    write_png(fg_left, f'{out_dir}/foreground-left.png')

    # 4. Water mask and Reflection mask (1536x1024 grayscale)
    print("Generating water-mask and reflection-mask...")
    water_mask = bytearray(w * h * 4)
    reflection_mask = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            r = raw_bytes[idx]
            g = raw_bytes[idx+1]
            b = raw_bytes[idx+2]
            brightness = (r * 0.299 + g * 0.587 + b * 0.114)

            left_dock_x = 180 + (y - 260) * 0.33 if y >= 260 else 180
            right_bank_x = 1140 - (y - 150) * 0.18 if y >= 150 else 1140

            if y >= 260 and x >= left_dock_x and x <= right_bank_x:
                v_fade = min(1.0, (y - 260) / 40.0)
                h_fade_left = min(1.0, (x - left_dock_x) / 30.0)
                h_fade_right = min(1.0, (right_bank_x - x) / 30.0)
                water_alpha = int(255 * v_fade * h_fade_left * h_fade_right)
                water_mask[idx] = 255
                water_mask[idx+1] = 255
                water_mask[idx+2] = 255
                water_mask[idx+3] = water_alpha

                center_x = 520 + (y - 260) * 0.22
                dist_center = abs(x - center_x)
                if dist_center < 180 and brightness > 60:
                    col_factor = max(0.0, 1.0 - (dist_center / 180.0))
                    refl_val = min(255, int(brightness * col_factor * (water_alpha / 255.0) * 1.4))
                    reflection_mask[idx] = 255
                    reflection_mask[idx+1] = 255
                    reflection_mask[idx+2] = 255
                    reflection_mask[idx+3] = refl_val
                elif brightness > 70 and (r > 120 and g > 80 and b < 80):
                    reflection_mask[idx] = 255
                    reflection_mask[idx+1] = 220
                    reflection_mask[idx+2] = 160
                    reflection_mask[idx+3] = int(min(255, brightness * 1.2) * (water_alpha / 255.0))
    write_png(water_mask, f'{out_dir}/water-mask.png')
    write_png(reflection_mask, f'{out_dir}/reflection-mask.png')

    # 5. Near Camera Drifting Mist
    print("Generating mist-near.png...")
    mist = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            if 280 <= y <= 720:
                y_center = 480
                y_dist = abs(y - y_center) / 220.0
                band_alpha = max(0.0, 1.0 - y_dist**2)
                nx = math.sin(x * 0.008) * 0.5 + math.sin(x * 0.021 + y * 0.015) * 0.3 + math.cos(y * 0.012) * 0.2
                val = max(0.0, (band_alpha * (0.6 + nx * 0.4)))
                mist[idx] = 210
                mist[idx+1] = 230
                mist[idx+2] = 235
                mist[idx+3] = int(val * 140)
    write_png(mist, f'{out_dir}/mist-near.png')

    print("All layers extracted successfully in:", out_dir)

    print("All layers extracted successfully in:", out_dir)

if __name__ == '__main__':
    main()
