const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
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

// Spawn interactive Docker workspace command
const spawnDockerWorkspaceCode = async (roomId, language, activeFileId = null) => {
  const executionId = `${roomId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const executionDir = path.resolve(path.join(__dirname, `../temp/${executionId}`));

  // 1. Create temporary directory on host
  fs.mkdirSync(executionDir, { recursive: true });

  try {
    // 2. Build disk project
    const hasWorkspace = await buildWorkspaceDisk(roomId, executionDir);
    if (!hasWorkspace) {
      removeDirectoryRecursively(executionDir);
      throw new Error("No files found in workspace to compile. Please create a file first.");
    }

    // 3. Find compilation/execution Entry Point
    const items = await WorkspaceItem.find({ roomId, type: "file" });
    let entryPoint;
    if (activeFileId) {
      entryPoint = items.find((item) => item._id.toString() === activeFileId.toString());
    }
    if (!entryPoint) {
      entryPoint = items.find((item) => item.isEntryPoint);
    }

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
      throw new Error(`No entry point selected or default file found for ${language}.`);
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
    const formattedVolumePath = executionDir.replace(/\\/g, "/");

    // Process limits based on language
    let memoryLimit = "128m";
    let pidsLimit = "64";
    if (language === "cpp" || language === "java") {
      memoryLimit = "256m";
      pidsLimit = "128";
    }

    const baseArgs = [
      "run",
      "-i", // keeps stdin open
      "--rm",
      "--network", "none",
      "--read-only",
      "--tmpfs", "/tmp",
      `--memory=${memoryLimit}`,
      `--memory-swap=${memoryLimit}`,
      "--cpus=0.5",
      "--pids-limit", pidsLimit,
      "--user", "1000:1000",
      "-v", `${formattedVolumePath}:/workspace`,
      "-w", "/workspace"
    ];

    let cmdArgs = [];
    if (language === "javascript") {
      baseArgs.push("node:18-alpine");
      cmdArgs = ["sh", "-c", `node '/workspace/${entryRelativePath}'`];
    } else if (language === "python") {
      baseArgs.push("python:3.10-alpine");
      // Use python -u for unbuffered stdout streaming
      cmdArgs = ["sh", "-c", `python -u '/workspace/${entryRelativePath}'`];
    } else if (language === "cpp") {
      const entryPointAbsPath = path.resolve(path.join(executionDir, entryRelativePath));
      const cppFiles = getFilesRecursively(executionDir, ".cpp")
        .filter(f => {
          if (path.resolve(f) === entryPointAbsPath) return true;
          try {
            const content = fs.readFileSync(f, "utf8");
            const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
            const hasMain = /\b(int|void)?\s*main\s*\(/.test(cleanContent);
            return !hasMain;
          } catch (err) {
            return true;
          }
        })
        .map(f => {
          const rel = path.relative(executionDir, f).replace(/\\/g, "/");
          return `'/workspace/${rel}'`;
        });
      
      baseArgs.push("gcc:alpine");
      cmdArgs = ["sh", "-c", `g++ -O3 ${cppFiles.join(' ')} -o /workspace/program && /workspace/program`];
    } else if (language === "java") {
      const javaFiles = getFilesRecursively(executionDir, ".java").map(f => {
        const rel = path.relative(executionDir, f).replace(/\\/g, "/");
        return `'/workspace/${rel}'`;
      });
      const entryClassName = path.basename(entryPoint.name, ".java");

      baseArgs.push("eclipse-temurin:17-alpine");
      cmdArgs = ["sh", "-c", `javac -d /workspace ${javaFiles.join(' ')} && java -cp /workspace ${entryClassName}`];
    } else {
      throw new Error(`Language ${language} not supported for interactive run.`);
    }

    const fullArgs = [...baseArgs, ...cmdArgs];
    console.log(`[Docker Streaming Compiler] Spawning docker command: docker ${fullArgs.join(" ")}`);
    
    const child = spawn("docker", fullArgs);

    return {
      child,
      executionDir
    };
  } catch (error) {
    removeDirectoryRecursively(executionDir);
    throw error;
  }
};

module.exports = { spawnDockerWorkspaceCode, removeDirectoryRecursively };
