import fs from "fs";
import path from "path";

const src = path.resolve("node_modules/monaco-editor/min/vs");
const dest = path.resolve("public/monaco-editor/min/vs");

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    const stat = fs.statSync(srcFile);
    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

try {
  if (fs.existsSync(src)) {
    console.log("🚀 Copying Monaco Editor assets locally to public/monaco-editor/min/vs...");
    copyDir(src, dest);
    console.log("✅ Monaco Editor assets copied successfully!");
  } else {
    console.error("❌ Monaco Editor assets not found in node_modules! Run npm install first.");
  }
} catch (err) {
  console.error("❌ Error copying Monaco assets:", err);
}
