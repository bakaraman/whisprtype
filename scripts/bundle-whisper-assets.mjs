import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const configDir = path.join(root, "config");
const manifestPath = path.join(configDir, "whisper-assets.json");

const manifest = {
  backend: {
    engine: "whisper.cpp",
    requiredBinaries: ["whisper-server", "whisper-cli"],
    cacheDir: "~/.cache/whisper-cpp",
  },
  models: [
    {
      id: "small",
      file: "ggml-small.bin",
      recommendedFor: "fast drafts and command dictation",
    },
    {
      id: "large-v3",
      file: "ggml-large-v3.bin",
      recommendedFor: "highest local accuracy",
    },
  ],
  source: "https://github.com/ggml-org/whisper.cpp",
};

await mkdir(configDir, { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifestPath}`);
