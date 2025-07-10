import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'public', 'icons');
const sourceIcon = path.join(__dirname, 'src', 'assets', 'clarityicon.png');

// PWA icon sizes
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// How much to zoom in (0 = no zoom, 0.2 = crop 20% from each side)
const ZOOM = 0.15; // 15% crop for a tighter fit

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const cropAndResize = async (input, output, size) => {
  // Get metadata to determine crop
  const meta = await sharp(input).metadata();
  const minDim = Math.min(meta.width, meta.height);
  const cropSize = Math.floor(minDim * (1 - ZOOM * 2));
  const left = Math.floor((meta.width - cropSize) / 2);
  const top = Math.floor((meta.height - cropSize) / 2);

  await sharp(input)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(size, size)
    // Enhance the icon to make it more bold
    .modulate({
      brightness: 1.1,  // Slightly brighter
      contrast: 1.3,    // Increase contrast to make details more visible
      saturation: 1.1   // Slightly more saturated
    })
    .png()
    .toFile(output);
};

const generateIcons = async () => {
  try {
    console.log('🔄 Generating BOLD PWA icons from clarityicon.png...');
    
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await cropAndResize(sourceIcon, outputPath, size);
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }

    // Favicons
    const faviconSizes = [16, 32];
    for (const size of faviconSizes) {
      const outputPath = path.join(iconsDir, `favicon-${size}x${size}.png`);
      await cropAndResize(sourceIcon, outputPath, size);
      console.log(`✅ Generated favicon-${size}x${size}.png`);
    }

    // Apple touch icons
    const appleSizes = [152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`);
      await cropAndResize(sourceIcon, outputPath, size);
      console.log(`✅ Generated apple-touch-icon-${size}x${size}.png`);
    }

    // Shortcut icons
    const shortcutIcons = ['meditation', 'water', 'workout'];
    for (const name of shortcutIcons) {
      const outputPath = path.join(iconsDir, `${name}-shortcut.png`);
      await cropAndResize(sourceIcon, outputPath, 96);
      console.log(`✅ Generated ${name}-shortcut.png`);
    }

    console.log('🎉 All BOLD PWA icons generated successfully from clarityicon.png!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
};

generateIcons(); 