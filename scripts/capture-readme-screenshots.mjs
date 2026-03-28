import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const assetsDir = path.join(root, "assets");

// Placeholder: replace with actual screenshot captures when ready.
// The README does not currently embed images.

await mkdir(assetsDir, { recursive: true });
console.log("Assets directory ready. No screenshots to generate.");
