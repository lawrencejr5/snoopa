/**
 * Prebuild script: copies convex/_generated into admin/convex/_generated
 * so that `convex/server` resolves from admin/node_modules/convex on Vercel.
 */

const fs = require("fs");
const path = require("path");

// __dirname = admin/scripts/
const src = path.resolve(__dirname, "..", "..", "convex", "_generated");
const dest = path.resolve(__dirname, "..", "convex", "_generated");

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(src)) {
  console.error(`✖ Source not found: ${src}`);
  process.exit(1);
}

copyDir(src, dest);
console.log(`✓ Copied convex/_generated → admin/convex/_generated`);
