const fs = require('fs');
const { createCanvas } = require('canvas');

const RED = '#DC2626';

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill with red
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, size, size);
  
  // Add "TM" text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TM', size / 2, size / 2);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`assets/${filename}`, buffer);
  console.log(`Created assets/${filename}`);
}

function createSplash() {
  const canvas = createCanvas(1284, 2778);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, 1284, 2778);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 200px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TM', 642, 1389);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('assets/splash.png', buffer);
  console.log('Created assets/splash.png');
}

// Install canvas first: npm install canvas
createIcon(1024, 'icon.png');
createIcon(1024, 'adaptive-icon.png');
createIcon(48, 'favicon.png');
createSplash();

console.log('\nAll icons created successfully!');
