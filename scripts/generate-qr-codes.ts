// Generates high-resolution QR code PNGs for LSA launch event invitation cards

import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'qr-codes');

// Guest token map — mirrors src/config/launch-guests.ts
const GUESTS: Array<{ slug: string; token: string }> = [
  { slug: 'sandra',     token: 'X7kP9mQwRtY2sVnL4hJ8dF' },
  { slug: 'umut',       token: 'M3bN5xC1pK8qW2vT4zL9rA' },
  { slug: 'gabrielle',  token: 'J6fH2yD8sE4nU7wG1iO5kR' },
  { slug: 'guest-four', token: 'Q9tV3aP7lB6mX1cZ8jW5nY' },
  { slug: 'guest-five', token: 'R4uI8eK2gS6hL3oF7dN9wM' },
];

async function generateQrCodes(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const guest of GUESTS) {
    const url = `${BASE_URL}/explanation?token=${guest.token}`;
    const filename = `qr-${guest.slug}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    await QRCode.toFile(outputPath, url, {
      type: 'png',
      width: 1000,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#FFFFFF',  // white modules
        light: '#000000', // black background
      },
      margin: 2,
    });

    console.log(`✓ Generated: public/qr-codes/${filename}`);
  }

  console.log(`\nDone! ${GUESTS.length} QR codes generated in public/qr-codes/`);
}

generateQrCodes().catch((err: unknown) => {
  console.error('QR generation failed:', err);
  process.exit(1);
});
