import fitz # PyMuPDF
from PIL import Image
import io
import os

pdf_path = "/home/aryan/.gemini/antigravity/brain/f5591afa-07ff-44a3-a163-ded3ba6c2f9a/.user_uploaded/media_1790662038233.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
image_list = page.get_images()

if image_list:
    xref = image_list[0][0]
    base_image = doc.extract_image(xref)
    image_bytes = base_image["image"]
    
    img = Image.open(io.BytesIO(image_bytes))
    
    # If the image has white margins, we can crop it or just use it directly.
    # Looking at the screenshot, the logo is centered on a white background. Let's crop it tightly to the visible content
    
    # Convert to RGB just in case
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        
    # Get bounding box of non-white pixels
    # Since background is white, we find non-white areas
    bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
    diff = Image.composite(img, bg, img)
    # Actually, the user provided an image that looks like it already has a rounded square bounding box on a white canvas.
    # Let's crop the white background out.
    # A simple way to crop white borders:
    bbox = img.convert("RGB").point(lambda x: 255 if x > 240 else 0).convert("L").getbbox()
    if not bbox:
        bbox = img.convert("L").point(lambda x: 255 if x < 250 else 0).getbbox()
    
    if bbox:
        # Pad slightly
        x1, y1, x2, y2 = bbox
        pad = 20
        x1 = max(0, x1 - pad)
        y1 = max(0, y1 - pad)
        x2 = min(img.width, x2 + pad)
        y2 = min(img.height, y2 + pad)
        img = img.crop((x1, y1, x2, y2))
        
    # Force to square
    size = max(img.width, img.height)
    new_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    # Paste in center
    new_img.paste(img, ((size - img.width) // 2, (size - img.height) // 2))
    img = new_img

    # Save to android res folders
    res_dir = "android/app/src/main/res"
    sizes = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192
    }
    
    for dpi, s in sizes.items():
        folder = os.path.join(res_dir, f"mipmap-{dpi}")
        os.makedirs(folder, exist_ok=True)
        # Resampling
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder, "ic_launcher.png"))
        resized.save(os.path.join(folder, "ic_launcher_round.png"))
        
    print("Successfully generated all mipmap icons.")
else:
    print("No images found in the PDF.")
