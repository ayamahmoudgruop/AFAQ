import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// بينسخ الصور الموجودة في أول المشروع (hero.jpg, favicon.png, icon-*.png ...)
// لفولدر dist وقت الـ build، عشان تفضلي حاطّاها جنب باقي الملفات من غير فولدر public.
function copyRootImages() {
  return {
    name: "copy-root-images",
    closeBundle() {
      const root = process.cwd();
      const out = path.join(root, "dist");
      if (!fs.existsSync(out)) return;
      for (const f of fs.readdirSync(root)) {
        if (/\.(png|jpe?g|webp|svg|ico|gif)$/i.test(f)) {
          fs.copyFileSync(path.join(root, f), path.join(out, f));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyRootImages()],
});
