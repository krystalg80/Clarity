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

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG icons from clarityicon.png
const generateIcons = async () => {
  try {
    console.log('🔄 Generating PWA icons from clarityicon.png...');
    
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }

    // Generate favicon sizes
    const faviconSizes = [16, 32];
    for (const size of faviconSizes) {
      const outputPath = path.join(iconsDir, `favicon-${size}x${size}.png`);
      
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated favicon-${size}x${size}.png`);
    }

    // Generate Apple touch icons
    const appleSizes = [152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`);
      
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated apple-touch-icon-${size}x${size}.png`);
    }

    // Generate shortcut icons
    const shortcutIcons = ['meditation', 'water', 'workout'];
    for (const name of shortcutIcons) {
      const outputPath = path.join(iconsDir, `${name}-shortcut.png`);
      
      await sharp(sourceIcon)
        .resize(96, 96)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name}-shortcut.png`);
    }

    console.log('🎉 All PWA icons generated successfully from clarityicon.png!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
};

generateIcons(); 