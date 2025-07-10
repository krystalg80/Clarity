import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'public', 'icons');

const iconsToConvert = [
  { svg: 'icon-192x192.svg', png: 'icon-192x192.png', size: 192 },
  { svg: 'icon-512x512.svg', png: 'icon-512x512.png', size: 512 },
  { svg: 'favicon-32x32.svg', png: 'favicon-32x32.png', size: 32 },
  { svg: 'favicon-16x16.svg', png: 'favicon-16x16.png', size: 16 },
  { svg: 'apple-touch-icon-180x180.svg', png: 'apple-touch-icon-180x180.png', size: 180 },
  { svg: 'apple-touch-icon-152x152.svg', png: 'apple-touch-icon-152x152.png', size: 152 },
  { svg: 'apple-touch-icon-167x167.svg', png: 'apple-touch-icon-167x167.png', size: 167 },
  { svg: 'icon-144x144.svg', png: 'icon-144x144.png', size: 144 },
];

(async () => {
  for (const icon of iconsToConvert) {
    const svgPath = path.join(iconsDir, icon.svg);
    const pngPath = path.join(iconsDir, icon.png);
    if (fs.existsSync(svgPath)) {
      await sharp(svgPath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(pngPath);
      console.log(`Converted ${icon.svg} to ${icon.png}`);
    } else {
      console.warn(`SVG not found: ${icon.svg}`);
    }
  }
  console.log('SVG to PNG conversion complete!');
})(); 