import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        notFound: resolve(import.meta.dirname, "404.html"),
        privacy: resolve(import.meta.dirname, "privacy/index.html"),
        cookiePolicy: resolve(import.meta.dirname, "cookie-policy/index.html"),
        imprint: resolve(import.meta.dirname, "imprint/index.html"),
        terms: resolve(import.meta.dirname, "terms/index.html")
      }
    }
  }
});
