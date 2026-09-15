import sys
from PIL import Image

def crop_image(input_path, output_path, x, y, width, height):
    try:
        # Open the image
        img = Image.open(input_path)
        
        # Define the crop rectangle (left, upper, right, lower)
        left = float(x)
        upper = float(y)
        right = left + float(width)
        lower = upper + float(height)
        
        # Crop the image
        cropped_img = img.crop((left, upper, right, lower))
        
        # Save to output path
        cropped_img.save(output_path)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 7:
        print("Usage: python crop.py <input> <output> <x> <y> <width> <height>")
        sys.exit(1)
        
    crop_image(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
