const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for PWA
const createSVGIcon = (size) => {
  const color = '#6c5ce7';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6c5ce7;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#a29bfe;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
    <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.15}" fill="white" opacity="0.9"/>
    <circle cx="${size * 0.5}" cy="${size * 0.6}" r="${size * 0.1}" fill="white" opacity="0.7"/>
    <circle cx="${size * 0.5}" cy="${size * 0.75}" r="${size * 0.05}" fill="white" opacity="0.5"/>
  </svg>`;
};

// Icon sizes for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons
iconSizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Generate favicon files
const faviconSizes = [16, 32];
faviconSizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `favicon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Generate Apple touch icons
const appleSizes = [152, 167, 180];
appleSizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `apple-touch-icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Generate shortcut icons
const shortcutIcons = ['meditation', 'water', 'workout'];
shortcutIcons.forEach(name => {
  const svg = createSVGIcon(96);
  const filename = `${name}-shortcut.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Create safari pinned tab icon
const safariIcon = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="7" fill="#6c5ce7"/>
  <circle cx="8" cy="6" r="2" fill="white"/>
  <circle cx="8" cy="10" r="1.5" fill="white"/>
  <circle cx="8" cy="12" r="0.8" fill="white"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'safari-pinned-tab.svg'), safariIcon);
console.log('Generated safari-pinned-tab.svg');

console.log('All PWA icons generated successfully!'); 