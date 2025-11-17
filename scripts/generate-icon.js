const fs = require('fs');
const path = require('path');

// Create an SVG icon with a checkmark
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with gradient -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#228be6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1971c2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Rounded rectangle background -->
  <rect width="192" height="192" rx="32" fill="url(#grad1)"/>

  <!-- Checkmark -->
  <path d="M 50 95 L 80 125 L 145 60"
        stroke="white"
        stroke-width="16"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"/>
</svg>`;

// Write SVG to public directory
const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(svgPath, svg);
console.log('✓ Created icon.svg in public directory');
console.log('\nTo convert to PNG, you can:');
console.log('1. Install sharp: npm install --save-dev sharp');
console.log('2. Or use an online converter like https://cloudconvert.com/svg-to-png');
console.log('3. Or open icon.svg in a browser and take a screenshot');
console.log('\nFor now, using the SVG as a fallback...');

// Copy SVG as icon-192.png placeholder (browsers support SVG)
// In production, you should convert this to actual PNG
fs.copyFileSync(svgPath, path.join(publicDir, 'icon-192.png'));
console.log('✓ Created icon-192.png (SVG format - consider converting to PNG)');
