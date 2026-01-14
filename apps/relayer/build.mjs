import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abisPath = path.resolve(__dirname, "../../deployment/abi");
const outAbisPath = path.resolve(__dirname, "dist/abis");

// Copy ABIs
fs.copySync(abisPath, outAbisPath, { overwrite: true });

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  outfile: "dist/index.js",
  loader: {
    ".json": "json",
  },
});
