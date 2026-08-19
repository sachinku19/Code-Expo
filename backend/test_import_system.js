/**
 * Comprehensive Automated Test Suite for CodeExpo Room-Aware Import System
 */
const assert = require("assert");
const {
  MAX_ROOM_STORAGE,
  MAX_FILES_PER_IMPORT,
  MAX_FOLDER_DEPTH,
  ROOM_TYPE_EXTENSIONS,
  normalizeRoomLanguage,
  getAllowedExtensions,
  isExcludedPath,
  isSensitiveFile,
  sanitizeRelativePath,
  isExtensionSupported
} = require("./utils/importRules");

console.log("🚀 Starting CodeExpo Import System Unit Tests...\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// 1. Room-Type Rules Tests
test("JavaScript room allows .js, .jsx, .json, .mjs, .cjs", () => {
  const allowed = getAllowedExtensions("javascript");
  assert.deepStrictEqual(allowed, [".js", ".jsx", ".json", ".mjs", ".cjs"]);
  assert.strictEqual(isExtensionSupported("app.jsx", "javascript").isSupported, true);
  assert.strictEqual(isExtensionSupported("config.json", "javascript").isSupported, true);
  assert.strictEqual(isExtensionSupported("script.py", "javascript").isSupported, false);
});

test("Python room allows .py, .pyw, .json, .txt", () => {
  const allowed = getAllowedExtensions("python");
  assert.deepStrictEqual(allowed, [".py", ".pyw", ".json", ".txt"]);
  assert.strictEqual(isExtensionSupported("main.py", "python").isSupported, true);
  assert.strictEqual(isExtensionSupported("input.txt", "python").isSupported, true);
  assert.strictEqual(isExtensionSupported("Main.java", "python").isSupported, false);
  assert.strictEqual(isExtensionSupported("app.cpp", "python").isSupported, false);
});

test("C++ room allows .cpp, .cc, .cxx, .c, .h, .hpp", () => {
  const allowed = getAllowedExtensions("cpp");
  assert.deepStrictEqual(allowed, [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"]);
  assert.strictEqual(isExtensionSupported("main.cpp", "cpp").isSupported, true);
  assert.strictEqual(isExtensionSupported("header.hpp", "cpp").isSupported, true);
  assert.strictEqual(isExtensionSupported("app.py", "cpp").isSupported, false);
});

test("Java room allows .java, .properties, .xml", () => {
  const allowed = getAllowedExtensions("java");
  assert.deepStrictEqual(allowed, [".java", ".properties", ".xml"]);
  assert.strictEqual(isExtensionSupported("Main.java", "java").isSupported, true);
  assert.strictEqual(isExtensionSupported("pom.xml", "java").isSupported, true);
  assert.strictEqual(isExtensionSupported("index.html", "java").isSupported, false);
});

test("HTML/CSS/JS (Web) room allows .html, .htm, .css, .js, .json, .jpg, .jpeg, .png", () => {
  const allowed = getAllowedExtensions("html");
  assert.deepStrictEqual(allowed, [".html", ".htm", ".css", ".js", ".json", ".jpg", ".jpeg", ".png"]);
  assert.strictEqual(isExtensionSupported("index.html", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("style.css", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("app.js", "web").isSupported, true);
  assert.strictEqual(isExtensionSupported("logo.png", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("hero.jpg", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("main.py", "html").isSupported, false);
});

// 2. Excluded Directories Tests
test("Excludes node_modules, .git, build, dist directories", () => {
  assert.strictEqual(isExcludedPath("node_modules/react/index.js").isExcluded, true);
  assert.strictEqual(isExcludedPath(".git/config").isExcluded, true);
  assert.strictEqual(isExcludedPath("dist/bundle.js").isExcluded, true);
  assert.strictEqual(isExcludedPath("build/static/app.js").isExcluded, true);
  assert.strictEqual(isExcludedPath(".DS_Store").isExcluded, true);
  assert.strictEqual(isExcludedPath("src/components/App.jsx").isExcluded, false);
});

// 3. Sensitive Files & Secrets Detection Tests
test("Blocks .env, credentials.json, and private keys", () => {
  assert.strictEqual(isSensitiveFile(".env").isSensitive, true);
  assert.strictEqual(isSensitiveFile(".env.local").isSensitive, true);
  assert.strictEqual(isSensitiveFile(".env.production").isSensitive, true);
  assert.strictEqual(isSensitiveFile("credentials.json").isSensitive, true);
  assert.strictEqual(isSensitiveFile("service-account.json").isSensitive, true);
  assert.strictEqual(isSensitiveFile("id_rsa").isSensitive, true);
  assert.strictEqual(isSensitiveFile("server.key").isSensitive, true);
  assert.strictEqual(isSensitiveFile("cert.pem").isSensitive, true);

  const mockPrivKeyBlock = ["-----BEGIN ", "RSA ", "PRIVATE KEY-----\nMOCK\n-----END ", "RSA ", "PRIVATE KEY-----"].join("");
  const mockGhToken = ["ghp", "_", "sampleDummyTokenForScannerTest123456"].join("");
  assert.strictEqual(isSensitiveFile("config.js", "config.js", mockPrivKeyBlock).isSensitive, true);
  assert.strictEqual(isSensitiveFile("config.js", "config.js", `const token = '${mockGhToken}';`).isSensitive, true);
  assert.strictEqual(isSensitiveFile("App.jsx", "src/App.jsx", "export default function App() {}").isSensitive, false);
});

// 4. Path Traversal & Security Validation Tests
test("Blocks path traversal, absolute paths, and invalid characters", () => {
  assert.strictEqual(sanitizeRelativePath("../../server.js").isValid, false);
  assert.strictEqual(sanitizeRelativePath("../../../.env").isValid, false);
  assert.strictEqual(sanitizeRelativePath("..\\..\\server.js").isValid, false);
  assert.strictEqual(sanitizeRelativePath("/etc/passwd").isValid, false);
  assert.strictEqual(sanitizeRelativePath("C:\\Windows\\System32").isValid, false);
  assert.strictEqual(sanitizeRelativePath("foo\0bar.js").isValid, false);
  assert.strictEqual(sanitizeRelativePath("CON.js").isValid, false);
  assert.strictEqual(sanitizeRelativePath("NUL.txt").isValid, false);
  assert.strictEqual(sanitizeRelativePath("a/b/c/d/e/f/g/deep.js").isValid, false); // Depth > 5

  const valid = sanitizeRelativePath("src/components/Button.jsx");
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.cleanPath, "src/components/Button.jsx");
  assert.strictEqual(valid.fileName, "Button.jsx");
  assert.deepStrictEqual(valid.folderSegments, ["src", "components"]);
});

// 5. Storage Constant Verification
test("Authoritative 10 MB Room Workspace Storage is exactly 10,485,760 bytes", () => {
  assert.strictEqual(MAX_ROOM_STORAGE, 10 * 1024 * 1024);
  assert.strictEqual(MAX_ROOM_STORAGE, 10485760);
});

// 6. Max Files & Structural Limit Tests
test("Enforces maximum files per import (100)", () => {
  assert.strictEqual(MAX_FILES_PER_IMPORT, 100);
});

test("Enforces maximum folder depth (5)", () => {
  assert.strictEqual(MAX_FOLDER_DEPTH, 5);
  const depth5 = sanitizeRelativePath("a/b/c/d/e/file.js");
  assert.strictEqual(depth5.isValid, true);
  assert.strictEqual(depth5.folderSegments.length, 5);

  const depth6 = sanitizeRelativePath("a/b/c/d/e/f/file.js");
  assert.strictEqual(depth6.isValid, false);
});

test("Sanitizes backslashes to standard forward slashes", () => {
  const winPath = sanitizeRelativePath("src\\components\\modal\\Dialog.jsx");
  assert.strictEqual(winPath.isValid, true);
  assert.strictEqual(winPath.cleanPath, "src/components/modal/Dialog.jsx");
  assert.strictEqual(winPath.fileName, "Dialog.jsx");
});

test("Detects secret API keys and private keys in content scan", () => {
  const mockAwsKey = ["AKIA", "TEST", "MOCK", "KEY", "12345678"].join("");
  const mockStripeKey = ["sk", "_", "live", "_", "dummyTestKeyForImportScan12345678"].join("");

  assert.strictEqual(isSensitiveFile("config.py", "config.py", `AWS_KEY = '${mockAwsKey}'`).isSensitive, true);
  assert.strictEqual(isSensitiveFile("stripe.js", "stripe.js", `const key = '${mockStripeKey}';`).isSensitive, true);
  assert.strictEqual(isSensitiveFile("regular.js", "regular.js", "console.log('Hello world');").isSensitive, false);
});

// 7. Image Asset Support Tests (HTML/CSS/JS Room Only)
const { isImageExtension, getImageMimeType, validateImageMagicBytes } = require("./utils/importRules");

test("HTML/CSS/JS (Web) room allows .jpg, .jpeg, .png image assets", () => {
  const allowed = getAllowedExtensions("html");
  assert.strictEqual(allowed.includes(".jpg"), true);
  assert.strictEqual(allowed.includes(".jpeg"), true);
  assert.strictEqual(allowed.includes(".png"), true);
  assert.strictEqual(isExtensionSupported("logo.png", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("hero.jpg", "html").isSupported, true);
  assert.strictEqual(isExtensionSupported("banner.jpeg", "web").isSupported, true);
});

test("Python, Java, C++, and JS-only rooms strictly REJECT image assets", () => {
  assert.strictEqual(isExtensionSupported("logo.png", "javascript").isSupported, false);
  assert.strictEqual(isExtensionSupported("logo.jpg", "javascript").isSupported, false);
  assert.strictEqual(isExtensionSupported("image.png", "python").isSupported, false);
  assert.strictEqual(isExtensionSupported("banner.jpg", "python").isSupported, false);
  assert.strictEqual(isExtensionSupported("photo.png", "cpp").isSupported, false);
  assert.strictEqual(isExtensionSupported("photo.jpeg", "cpp").isSupported, false);
  assert.strictEqual(isExtensionSupported("icon.png", "java").isSupported, false);
  assert.strictEqual(isExtensionSupported("icon.jpg", "java").isSupported, false);
});

test("isImageExtension and getImageMimeType helper functions", () => {
  assert.strictEqual(isImageExtension(".png"), true);
  assert.strictEqual(isImageExtension(".jpg"), true);
  assert.strictEqual(isImageExtension(".jpeg"), true);
  assert.strictEqual(isImageExtension(".js"), false);
  assert.strictEqual(isImageExtension(".html"), false);

  assert.strictEqual(getImageMimeType(".png"), "image/png");
  assert.strictEqual(getImageMimeType(".jpg"), "image/jpeg");
  assert.strictEqual(getImageMimeType(".jpeg"), "image/jpeg");
});

test("Image magic bytes signature validation for PNG and JPEG", () => {
  // Valid PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
  const pngCheck = validateImageMagicBytes(validPngBuffer, ".png");
  assert.strictEqual(pngCheck.valid, true);
  assert.strictEqual(pngCheck.mimeType, "image/png");

  // Valid JPEG signature: FF D8 FF
  const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const jpegCheck = validateImageMagicBytes(validJpegBuffer, ".jpg");
  assert.strictEqual(jpegCheck.valid, true);
  assert.strictEqual(jpegCheck.mimeType, "image/jpeg");

  // Corrupted / fake PNG buffer (e.g. text file renamed to .png)
  const fakePngBuffer = Buffer.from("console.log('malicious payload');");
  const fakeCheck = validateImageMagicBytes(fakePngBuffer, ".png");
  assert.strictEqual(fakeCheck.valid, false);

  // Corrupted / fake JPEG buffer
  const fakeJpegBuffer = Buffer.from("<html><body>Malicious script</body></html>");
  const fakeJpegCheck = validateImageMagicBytes(fakeJpegBuffer, ".jpeg");
  assert.strictEqual(fakeJpegCheck.valid, false);
});

console.log(`\n================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
