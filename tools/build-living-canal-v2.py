import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import scipy.ndimage as ndi

def create_displacement_map(size=512):
    """
    Creates a seamless 512x512 displacement normal map for PixiJS DisplacementFilter.
    Combines multiple organic wave harmonics at gentle angles with horizontal drift bias.
    """
    x = np.linspace(0, 2 * np.pi, size, endpoint=False)
    y = np.linspace(0, 2 * np.pi, size, endpoint=False)
    X, Y = np.meshgrid(x, y)

    # Multi-octave sinusoidal wave harmonics with natural water dispersion
    # Horizontal waves travel slightly faster and have longer wavelengths
    w1 = np.sin(X * 3.0 + Y * 1.5)
    w2 = np.sin(X * 5.0 - Y * 2.0 + 1.3) * 0.6
    w3 = np.cos(X * 2.0 + Y * 4.0 + 2.7) * 0.4
    w4 = np.sin(X * 8.0 - Y * 5.0 + 0.9) * 0.25
    w5 = np.cos(X * 12.0 + Y * 8.0 + 3.4) * 0.15

    height = w1 + w2 + w3 + w4 + w5
    
    # Calculate gradients: R = horizontal displacement (dx), G = vertical displacement (dy)
    dx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)

    # Scale to produce subtle, smooth displacement around neutral 128
    # Gentle amplitude: approximately 1-4 pixels at filter scale
    dx_norm = np.clip(128.0 + dx * 48.0, 0, 255).astype(np.uint8)
    dy_norm = np.clip(128.0 + dy * 36.0, 0, 255).astype(np.uint8)
    b_channel = np.full((size, size), 128, dtype=np.uint8)
    a_channel = np.full((size, size), 255, dtype=np.uint8)

    disp = np.stack([dx_norm, dy_norm, b_channel, a_channel], axis=2)
    return Image.fromarray(disp)

def create_radial_glow(size=256):
    """
    Creates a soft radial light texture with inverse-square falloff and smooth edge
    for realistic lantern and moon halos.
    """
    c = size / 2.0
    y, x = np.ogrid[:size, :size]
    dist = np.sqrt((x - c)**2 + (y - c)**2) / c
    # Smooth inverse square falloff
    falloff = np.clip(1.0 - dist, 0.0, 1.0)
    falloff = falloff ** 2.2

    # Warm white-gold core fading to amber
    r = np.full((size, size), 255, dtype=np.uint8)
    g = np.clip(220 + falloff * 35, 0, 255).astype(np.uint8)
    b = np.clip(140 + falloff * 90, 0, 255).astype(np.uint8)
    a = (falloff * 255).astype(np.uint8)

    glow = np.stack([r, g, b, a], axis=2)
    return Image.fromarray(glow)

def create_organic_mist(width=1536, height=1024, seed=42):
    """
    Synthesizes a soft, painterly, non-elliptical mist layer using multi-octave noise.
    """
    rng = np.random.default_rng(seed)
    # Low resolution noise upscaled with Gaussian blur creates soft organic puffs
    noise1 = rng.random((32, 48))
    noise2 = rng.random((64, 96))
    noise3 = rng.random((128, 192))

    n1_img = Image.fromarray((noise1 * 255).astype(np.uint8)).resize((width, height), Image.Resampling.BICUBIC)
    n2_img = Image.fromarray((noise2 * 255).astype(np.uint8)).resize((width, height), Image.Resampling.BICUBIC)
    n3_img = Image.fromarray((noise3 * 255).astype(np.uint8)).resize((width, height), Image.Resampling.BICUBIC)

    a1 = np.array(n1_img, dtype=float) / 255.0
    a2 = np.array(n2_img, dtype=float) / 255.0
    a3 = np.array(n3_img, dtype=float) / 255.0

    combined = a1 * 0.5 + a2 * 0.35 + a3 * 0.15
    combined = ndi.gaussian_filter(combined, sigma=8.0)

    # Vertical band mask: mist hovers over the canal basin (y from 300 to 750)
    y_indices = np.arange(height)[:, None]
    band = np.exp(-((y_indices - 480) / 160.0)**2)

    mist_alpha = np.clip(combined * band * 1.8 - 0.15, 0.0, 1.0)
    mist_alpha = ndi.gaussian_filter(mist_alpha, sigma=6.0)

    r = np.full((height, width), 215, dtype=np.uint8)
    g = np.full((height, width), 232, dtype=np.uint8)
    b = np.full((height, width), 240, dtype=np.uint8)
    a = (mist_alpha * 120).astype(np.uint8)

    mist_arr = np.stack([r, g, b, a], axis=2)
    return Image.fromarray(mist_arr)

def main():
    src_img = 'public/images/background_art_a/คลองหมอกจันทร์กับเงาอสูรใต้น้ำ.png'
    clean_gen_img = '/Users/oyl-mac_m1/.gemini/antigravity/brain/93cc4f91-ff80-422d-b5a2-9a749d86eefc/canal_backplate_clean_1790438174667.jpg'
    out_dir = 'public/theme_games/village-canal-v2'
    os.makedirs(out_dir, exist_ok=True)

    orig = Image.open(src_img).convert('RGBA')
    w, h = orig.size
    print(f"Source size: {w}x{h}")

    gen = Image.open(clean_gen_img).convert('RGBA')
    gen = gen.resize((w, h), Image.Resampling.LANCZOS)

    o_arr = np.array(orig, dtype=float)
    g_arr = np.array(gen, dtype=float)

    # 1. Authoritative Polygon Mask for Foreground Left (Dock, Lantern, Moss, Piling, Water Lily)
    mask_left_img = Image.new('L', (w, h), 0)
    draw_left = ImageDraw.Draw(mask_left_img)
    pts_left = [
        (0, 0), (130, 0), (150, 100), (180, 160), (220, 220), (280, 270),
        (292, 370), (298, 480), (288, 595), (245, 605), (185, 620),
        (190, 725), (145, 745), (85, 755), (0, 765)
    ]
    draw_left.polygon(pts_left, fill=255)
    # Smooth 2px anti-aliased edge
    mask_left = ndi.gaussian_filter(np.array(mask_left_img, dtype=float) / 255.0, sigma=1.8)

    # 2. Authoritative Polygon Mask for Foreground Right (Scratched Post & Tall Reeds)
    mask_right_img = Image.new('L', (w, h), 0)
    draw_right = ImageDraw.Draw(mask_right_img)
    pts_right = [
        (1536, 0), (1400, 0), (1350, 80), (1280, 110), (1230, 110),
        (1150, 130), (1110, 170), (1080, 300), (1080, 420), (1060, 520),
        (1050, 640), (1020, 760), (960, 850), (980, 930), (1040, 1024), (1536, 1024)
    ]
    draw_right.polygon(pts_right, fill=255)
    mask_right = ndi.gaussian_filter(np.array(mask_right_img, dtype=float) / 255.0, sigma=2.0)

    # 3. Clean Backplate:
    # Original image for sky, moon, bridge, stilt houses, lanterns, and center canal.
    # Inpainted with gen water and riverbank behind the dock (left) and scratched post/reeds (right).
    inpaint_region = np.clip(mask_left * 1.6 + mask_right * 1.6, 0.0, 1.0)
    inpaint_blend = ndi.gaussian_filter(inpaint_region, sigma=3.5)

    backplate_arr = o_arr * (1.0 - inpaint_blend[:, :, None]) + g_arr * inpaint_blend[:, :, None]
    backplate_img = Image.fromarray(np.clip(backplate_arr, 0, 255).astype(np.uint8))
    backplate_img.save(f"{out_dir}/backplate.webp", 'WEBP', quality=95)
    backplate_img.save(f"{out_dir}/backplate.png", 'PNG')
    print("Saved backplate.webp & png")

    # 4. Foreground Left Cutout
    fg_left_arr = o_arr.copy()
    fg_left_arr[:, :, 3] = np.clip(mask_left * 255.0, 0, 255)
    fg_left_img = Image.fromarray(fg_left_arr.astype(np.uint8))
    fg_left_img.save(f"{out_dir}/foreground-left.webp", 'WEBP', quality=95)
    fg_left_img.save(f"{out_dir}/foreground-left.png", 'PNG')
    print("Saved foreground-left.webp & png")

    # 5. Foreground Right Cutout
    fg_right_arr = o_arr.copy()
    fg_right_arr[:, :, 3] = np.clip(mask_right * 255.0, 0, 255)
    fg_right_img = Image.fromarray(fg_right_arr.astype(np.uint8))
    fg_right_img.save(f"{out_dir}/foreground-right.webp", 'WEBP', quality=95)
    fg_right_img.save(f"{out_dir}/foreground-right.png", 'PNG')
    print("Saved foreground-right.webp & png")

    # 6. Precise Water Mask
    # Strictly covers canal water. Does NOT touch houses, bridge, dock, or land.
    water_mask_img = Image.new('L', (w, h), 0)
    draw_water = ImageDraw.Draw(water_mask_img)
    # Canal polygon following water waterline:
    # Begins under arched bridge at y=300
    # Left shoreline runs along bank/dock pilings
    # Right shoreline runs along right stilt house pilings and bank
    pts_water = [
        (420, 290), (490, 280), (580, 280), (660, 290),
        # Right bank shoreline:
        (720, 310), (760, 340), (840, 380), (880, 460),
        (920, 560), (960, 680), (990, 800), (1050, 920), (1120, 1024),
        # Bottom edge of canal:
        (0, 1024), (0, 770), (80, 760), (145, 745), (185, 720),
        (185, 620), (240, 600), (285, 590), (292, 470), (285, 370),
        (260, 330), (320, 310)
    ]
    draw_water.polygon(pts_water, fill=255)
    water_mask_arr = ndi.gaussian_filter(np.array(water_mask_img, dtype=float) / 255.0, sigma=2.0)
    
    water_mask_out = np.zeros((h, w, 4), dtype=np.uint8)
    water_mask_out[:, :, 0] = 255
    water_mask_out[:, :, 1] = 255
    water_mask_out[:, :, 2] = 255
    water_mask_out[:, :, 3] = np.clip(water_mask_arr * 255.0, 0, 255).astype(np.uint8)
    water_mask_file = Image.fromarray(water_mask_out)
    water_mask_file.save(f"{out_dir}/water-mask.webp", 'WEBP', quality=95)
    water_mask_file.save(f"{out_dir}/water-mask.png", 'PNG')
    print("Saved water-mask.webp & png")

    # 7. Water Source Texture
    # Actual painted water pixels from the original painting, clipped to water mask
    water_source_arr = o_arr.copy()
    water_source_arr[:, :, 3] = np.clip(water_mask_arr * 255.0, 0, 255)
    water_source_img = Image.fromarray(water_source_arr.astype(np.uint8))
    water_source_img.save(f"{out_dir}/water-source.webp", 'WEBP', quality=95)
    water_source_img.save(f"{out_dir}/water-source.png", 'PNG')
    print("Saved water-source.webp & png")

    # 8. Reflection Source & Mask
    # Isolate the bright moonlight reflection column down x ~ 580..680 and warm lantern reflections
    brightness = (o_arr[:, :, 0] * 0.299 + o_arr[:, :, 1] * 0.587 + o_arr[:, :, 2] * 0.114)
    # Bright water highlights inside the water mask
    refl_intensity = np.clip((brightness - 50.0) / 140.0, 0.0, 1.0) * water_mask_arr
    refl_intensity = ndi.gaussian_filter(refl_intensity, sigma=1.5)

    refl_arr = np.zeros((h, w, 4), dtype=np.uint8)
    refl_arr[:, :, 0] = np.clip(o_arr[:, :, 0] * 1.25, 0, 255).astype(np.uint8)
    refl_arr[:, :, 1] = np.clip(o_arr[:, :, 1] * 1.25, 0, 255).astype(np.uint8)
    refl_arr[:, :, 2] = np.clip(o_arr[:, :, 2] * 1.25, 0, 255).astype(np.uint8)
    refl_arr[:, :, 3] = np.clip(refl_intensity * 255.0, 0, 255).astype(np.uint8)

    refl_img = Image.fromarray(refl_arr)
    refl_img.save(f"{out_dir}/reflection-source.webp", 'WEBP', quality=95)
    refl_img.save(f"{out_dir}/reflection-source.png", 'PNG')
    print("Saved reflection-source.webp & png")

    refl_mask_out = np.zeros((h, w, 4), dtype=np.uint8)
    refl_mask_out[:, :, :3] = 255
    refl_mask_out[:, :, 3] = np.clip(refl_intensity * 255.0, 0, 255).astype(np.uint8)
    Image.fromarray(refl_mask_out).save(f"{out_dir}/reflection-mask.webp", 'WEBP', quality=95)
    Image.fromarray(refl_mask_out).save(f"{out_dir}/reflection-mask.png", 'PNG')
    print("Saved reflection-mask.webp & png")

    # 9. Displacement Map (512x512 seamless)
    disp_img = create_displacement_map(512)
    disp_img.save(f"{out_dir}/displacement-water.webp", 'WEBP', quality=95)
    disp_img.save(f"{out_dir}/displacement-water.png", 'PNG')
    print("Saved displacement-water.webp & png")

    # 10. Soft Radial Glow Texture for Lanterns & Moon
    glow_img = create_radial_glow(256)
    glow_img.save(f"{out_dir}/lantern-glow.webp", 'WEBP', quality=95)
    glow_img.save(f"{out_dir}/lantern-glow.png", 'PNG')
    print("Saved lantern-glow.webp & png")

    # 11. Soft Organic Mist Textures (Far & Near)
    mist_far = create_organic_mist(w, h, seed=101)
    mist_far.save(f"{out_dir}/mist-far.webp", 'WEBP', quality=90)
    mist_far.save(f"{out_dir}/mist-far.png", 'PNG')

    mist_near = create_organic_mist(w, h, seed=202)
    mist_near.save(f"{out_dir}/mist-near.webp", 'WEBP', quality=90)
    mist_near.save(f"{out_dir}/mist-near.png", 'PNG')
    print("Saved mist-far and mist-near.webp & png")

    print("\nAll production living canal v2 assets successfully created!")

if __name__ == '__main__':
    main()
