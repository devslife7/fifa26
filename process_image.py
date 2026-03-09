from PIL import Image
import math

def clean_scoring_image(in_path, out_path):
    img = Image.open(in_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            brightness = max(r, g, b)
            
            # The faded background has brightness < 80
            # We want to remove the background entirely (make it #f8f8f5 or transparent).
            # But the text needs to be dark so it's readable on a light background.
            # If brightness > 150, it's text.
            
            if brightness < 60:
                # Remove dark background
                pixels[x, y] = (0, 0, 0, 0)
            elif brightness < 150:
                # Anti-aliasing or watermark. Fade it out.
                # Only keep it if it's very bright (text edges)
                alpha = int(max(0, (brightness - 100) / 50.0 * 255))
                # For anti-aliased edge, we map it to dark slate color (30, 41, 59)
                pixels[x, y] = (30, 41, 59, alpha)
            else:
                # Opaque Text
                # Let's map white (and yellow) to dark slate: #1e293b -> (30, 41, 59)
                # Or if we want to keep yellow, we can check if it's yellow
                # Yellow is High R, High G, Low B.
                if b < 150 and r > 200 and g > 180:
                    # Keep yellow but darken it slightly for contrast: amber-600 #d97706 (217, 119, 6)
                    # Actually, the user's primary is #f9d406. Let's keep it primary but maybe add drop shadow in HTML.
                    pixels[x, y] = (r, g, b, 255)
                else:
                    # White text becomes dark slate
                    pixels[x, y] = (30, 41, 59, 255)

    img.save(out_path)

clean_scoring_image('public/images/scoring.png', 'public/images/scoring_clean.png')
print("Image processing complete.")
