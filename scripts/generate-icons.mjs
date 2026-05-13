import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

const SRC_SVG = path.join(PUBLIC_DIR, "app-icon.svg");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SRC_SVG))) {
    throw new Error(`Missing ${SRC_SVG}`);
  }
  const svg = await fs.readFile(SRC_SVG);

  // Standard square icons
  const targets = [
    { name: "app-icon-192.png", size: 192 },
    { name: "app-icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const t of targets) {
    const out = path.join(PUBLIC_DIR, t.name);
    await sharp(svg, { density: 384 })
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(out);
  }

  // Maskable icon: add safe padding so it survives masking.
  // We create a larger canvas and center the resized icon.
  const maskableOut = path.join(PUBLIC_DIR, "app-icon-maskable-512.png");
  const inner = 360; // ~70% of 512
  const innerBuf = await sharp(svg, { density: 384 })
    .resize(inner, inner)
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      // Very light background so transparent edges don’t look “dirty” on some launchers.
      background: { r: 236, g: 239, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: innerBuf, left: Math.round((512 - inner) / 2), top: Math.round((512 - inner) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(maskableOut);

  // Maskable monochrome (optional): same as above but no background; useful for some platforms.
  // We keep it transparent for flexibility.
  const monoOut = path.join(PUBLIC_DIR, "app-icon-maskable-512-transparent.png");
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: innerBuf, left: Math.round((512 - inner) / 2), top: Math.round((512 - inner) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(monoOut);

  console.log("Generated icons in public/:");
  console.log(targets.map((t) => `- ${t.name}`).join("\n"));
  console.log("- app-icon-maskable-512.png");
  console.log("- app-icon-maskable-512-transparent.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

