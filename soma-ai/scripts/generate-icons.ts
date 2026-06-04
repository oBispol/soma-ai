import { writeFileSync } from "fs";
import { join } from "path";

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#22c55e"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">S</text>
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">SomaAI</text>
</svg>`;

const publicDir = join(__dirname, "public");

writeFileSync(join(publicDir, "icon-192x192.svg"), svgIcon);
writeFileSync(join(publicDir, "icon-512x512.svg"), svgIcon);

console.log("SVG icons created. Convert to PNG for production use.");
