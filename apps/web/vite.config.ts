import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { cpSync, createReadStream, existsSync, mkdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

const cesiumBuild = realpathSync(fileURLToPath(new URL("./node_modules/cesium/Build/Cesium", import.meta.url)));
const cesiumDirectories = ["Workers", "ThirdParty", "Assets", "Widgets"];

function cesiumAssets(): Plugin {
  return {
    name: "mission-studio-cesium-assets",
    configureServer(server) {
      const prefix = "/mission-studio-showcase/cesium/";
      const contentTypes: Record<string, string> = {
        ".css": "text/css", ".gif": "image/gif", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".js": "text/javascript", ".json": "application/json", ".png": "image/png",
        ".svg": "image/svg+xml", ".wasm": "application/wasm", ".xml": "application/xml"
      };
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (!pathname.startsWith(prefix)) return next();
        const assetPath = resolve(cesiumBuild, decodeURIComponent(pathname.slice(prefix.length)));
        if (!assetPath.startsWith(`${cesiumBuild}/`) || !existsSync(assetPath) || !statSync(assetPath).isFile()) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", contentTypes[extname(assetPath)] ?? "application/octet-stream");
        createReadStream(assetPath).pipe(response);
      });
    },
    writeBundle(outputOptions) {
      const outputDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)), outputOptions.dir ?? "dist");
      const cesiumOutput = resolve(outputDirectory, "cesium");
      rmSync(cesiumOutput, { recursive: true, force: true });
      mkdirSync(cesiumOutput, { recursive: true });
      for (const directory of cesiumDirectories) {
        cpSync(resolve(cesiumBuild, directory), resolve(cesiumOutput, directory), { recursive: true });
      }
    }
  };
}

export default defineConfig({
  base: "/mission-studio-showcase/",
  publicDir: "../../public",
  plugins: [
    react(),
    cesiumAssets()
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/mission-studio-showcase/cesium")
  },
  server: {
    fs: { allow: ["../.."] }
  }
});
