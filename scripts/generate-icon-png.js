const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'icon.svg');
  const pngPath192 = path.join(publicDir, 'icon-192.png');
  const pngPath512 = path.join(publicDir, 'icon-512.png');

  try {
    // Read the SVG
    const svgBuffer = fs.readFileSync(svgPath);

    // Convert to 192x192 PNG
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(pngPath192);

    console.log('✓ Created icon-192.png (192x192)');

    // Convert to 512x512 PNG for better quality
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(pngPath512);

    console.log('✓ Created icon-512.png (512x512)');
    console.log('\n✓ Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcon();
