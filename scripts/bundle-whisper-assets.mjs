import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const configDir = path.join(root, "config");
const manifestPath = path.join(configDir, "whisper-assets.json");

const manifest = {
  backend: {
    engine: "whisper.cpp",
    runtimeDir: "~/Library/Application Support/WhisprType/runtime/whispercpp",
    requiredBinaries: ["whisper-server", "whisper-cli"],
    source: {
      release: "v1.8.4",
      archiveUrl:
        "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-v1.8.4-xcframework.zip",
    },
  },
  models: [
    {
      id: "small",
      file: "ggml-small.bin",
      recommendedFor: "fast drafts and command dictation",
      downloadUrl:
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    },
    {
      id: "large-v3",
      file: "ggml-large-v3.bin",
      recommendedFor: "highest local accuracy",
      downloadUrl:
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
    },
  ],
  source: "https://github.com/ggml-org/whisper.cpp",
};

await mkdir(configDir, { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifestPath}`);
