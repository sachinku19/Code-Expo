const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const WorkspaceItem = require("../models/WorkspaceItem");

// Helper: Recursively search for files matching extension
const getFilesRecursively = (dir, ext) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  });
  return results;
};

// Helper: Delete directory recursively
const removeDirectoryRecursively = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
};

// Build workspace on disk
const buildWorkspaceDisk = async (roomId, executionDir) => {
  const items = await WorkspaceItem.find({ roomId });
  if (items.length === 0) return false;

  const itemsMap = new Map();
  items.forEach((item) => itemsMap.set(item._id.toString(), item));

  // Helper: compute relative path
  const getRelativePath = (item) => {
    const parts = [item.name];
    let parentId = item.parentId;
    while (parentId) {
      const parent = itemsMap.get(parentId.toString());
      if (!parent) break;
      parts.push(parent.name);
      parentId = parent.parentId;
    }
    return parts.reverse().join("/");
  };

  // Rebuild workspace folders and files
  for (const item of items) {
    const relativePath = getRelativePath(item);
    const absolutePath = path.join(executionDir, relativePath);

    if (item.type === "folder") {
      fs.mkdirSync(absolutePath, { recursive: true });
    } else {
      // Ensure folder directory exists first
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, item.content || "");
    }
  }

  return true;
};

const runWorkspaceCode = async (roomId, language, input) => {
  const executionId = `${roomId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const executionDir = path.join(__dirname, `../temp/${executionId}`);
  const inputPath = path.join(executionDir, "input.txt");

  try {
    // 1. Create temporary directory
    fs.mkdirSync(executionDir, { recursive: true });
    fs.writeFileSync(inputPath, input || "");

    // 2. Build disk project
    const hasWorkspace = await buildWorkspaceDisk(roomId, executionDir);
    if (!hasWorkspace) {
      removeDirectoryRecursively(executionDir);
      throw new Error("No files found in workspace to compile. Please create a file first.");
    }

    // 3. Find compilation/execution Entry Point
    const items = await WorkspaceItem.find({ roomId, type: "file" });
    let entryPoint = items.find((item) => item.isEntryPoint);

    // Fallbacks if no entry point configured
    if (!entryPoint) {
      const defaults = {
        javascript: "index.js",
        python: "main.py",
        cpp: "main.cpp",
        java: "Main.java"
      };
      const defaultName = defaults[language];
      entryPoint = items.find((item) => item.name === defaultName);
    }

    // If still no entry point, take first file of matching language extension
    if (!entryPoint) {
      const exts = {
        javascript: ".js",
        python: ".py",
        cpp: ".cpp",
        java: ".java"
      };
      const ext = exts[language];
      entryPoint = items.find((item) => item.name.endsWith(ext));
    }

    if (!entryPoint) {
      throw new Error(`No entry point selected or default file found for ${language}. Please select an entry point file.`);
    }

    // Determine entry point relative path
    const getRelativePathForFile = (file, allItems) => {
      const itemsMap = new Map(allItems.map(i => [i._id.toString(), i]));
      const parts = [file.name];
      let parentId = file.parentId;
      while (parentId) {
        const parent = itemsMap.get(parentId.toString());
        if (!parent) break;
        parts.push(parent.name);
        parentId = parent.parentId;
      }
      return parts.reverse().join("/");
    };

    const allRoomItems = await WorkspaceItem.find({ roomId });
    const entryRelativePath = getRelativePathForFile(entryPoint, allRoomItems);
    const entryPointAbsolutePath = path.join(executionDir, entryRelativePath);

    // 4. Build execution command based on language
    return new Promise((resolve, reject) => {
      if (language === "javascript") {
        exec(`node "${entryPointAbsolutePath}" < "${inputPath}"`, { timeout: 8000 }, (error, stdout, stderr) => {
          if (error) reject(stderr || error.message);
          else resolve(stdout);
        });
      } else if (language === "python") {
        exec(`python "${entryPointAbsolutePath}" < "${inputPath}"`, { timeout: 8000 }, (error, stdout, stderr) => {
          if (error) reject(stderr || error.message);
          else resolve(stdout);
        });
      } else if (language === "cpp") {
        const cppFiles = getFilesRecursively(executionDir, ".cpp");
        const exePath = path.join(executionDir, "workspace_executable");
        
        exec(`g++ "${cppFiles.join('" "')}" -o "${exePath}"`, (compileError, compileStdout, compileStderr) => {
          if (compileError) {
            return reject(compileStderr || compileError.message);
          }
          exec(`"${exePath}" < "${inputPath}"`, { timeout: 8000 }, (runError, runStdout, runStderr) => {
            if (runError) reject(runStderr || runError.message);
            else resolve(runStdout);
          });
        });
      } else if (language === "java") {
        const javaFiles = getFilesRecursively(executionDir, ".java");
        const binDir = path.join(executionDir, "bin");
        fs.mkdirSync(binDir, { recursive: true });

        exec(`javac -d "${binDir}" "${javaFiles.join('" "')}"`, (compileError, compileStdout, compileStderr) => {
          if (compileError) {
            return reject(compileStderr || compileError.message);
          }
          // Get Main class name (entry point file base name)
          const entryClassName = path.basename(entryPoint.name, ".java");
          exec(`java -cp "${binDir}" ${entryClassName} < "${inputPath}"`, { timeout: 8000 }, (runError, runStdout, runStderr) => {
            if (runError) reject(runStderr || runError.message);
            else resolve(runStdout);
          });
        });
      } else {
        reject(new Error(`Language ${language} execution not implemented.`));
      }
    });

  } finally {
    // 5. Cleanup temp directories in background
    setTimeout(() => {
      removeDirectoryRecursively(executionDir);
    }, 1000);
  }
};

module.exports = { runWorkspaceCode };
