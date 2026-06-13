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

const runDockerWorkspaceCode = async (roomId, language, input) => {
  const executionId = `${roomId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const executionDir = path.resolve(path.join(__dirname, `../temp/${executionId}`));
  const inputPath = path.join(executionDir, "input.txt");

  try {
    // 1. Create temporary directory on host
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

    // 4. Format absolute path for Docker volume mounting (Windows/POSIX drive letter safety)
    const formattedVolumePath = executionDir.replace(/\\/g, "/");

    // 5. Construct Docker Execution command with security configurations
    // - Network: none
    // - CPU Limit: 0.5 cores
    // - Memory limit: 128m for scripting, 256m for compiling C++/Java
    // - process limit (pids): 64/128
    // - Non-root execution user: 1000:1000
    // - Auto cleanup: --rm
    
    let dockerCmd = "";
    
    if (language === "javascript") {
      dockerCmd = `docker run --rm --network none --read-only --tmpfs /tmp --memory="128m" --memory-swap="128m" --cpus="0.5" --pids-limit 64 --user 1000:1000 -v "${formattedVolumePath}:/workspace" -w /workspace node:18-alpine sh -c "node '/workspace/${entryRelativePath}' < /workspace/input.txt"`;
    } else if (language === "python") {
      dockerCmd = `docker run --rm --network none --read-only --tmpfs /tmp --memory="128m" --memory-swap="128m" --cpus="0.5" --pids-limit 64 --user 1000:1000 -v "${formattedVolumePath}:/workspace" -w /workspace python:3.10-alpine sh -c "python '/workspace/${entryRelativePath}' < /workspace/input.txt"`;
    } else if (language === "cpp") {
      // Compile all .cpp files inside workspace recursively, excluding secondary files with main()
      const entryPointAbsPath = path.resolve(path.join(executionDir, entryRelativePath));
      const cppFiles = getFilesRecursively(executionDir, ".cpp")
        .filter(f => {
          if (path.resolve(f) === entryPointAbsPath) return true;
          try {
            const content = fs.readFileSync(f, "utf8");
            // Strip comments to avoid false matches inside descriptions
            const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
            const hasMain = /\b(int|void)?\s*main\s*\(/.test(cleanContent);
            return !hasMain;
          } catch (err) {
            console.error(`Error filtering C++ file ${f}:`, err);
            return true;
          }
        })
        .map(f => {
          const rel = path.relative(executionDir, f).replace(/\\/g, "/");
          return `'/workspace/${rel}'`;
        });
      
      dockerCmd = `docker run --rm --network none --read-only --tmpfs /tmp --memory="256m" --memory-swap="256m" --cpus="0.5" --pids-limit 128 --user 1000:1000 -v "${formattedVolumePath}:/workspace" -w /workspace gcc:alpine sh -c "g++ -O3 ${cppFiles.join(' ')} -o /workspace/program && /workspace/program < /workspace/input.txt"`;
    } else if (language === "java") {
      const javaFiles = getFilesRecursively(executionDir, ".java").map(f => {
        const rel = path.relative(executionDir, f).replace(/\\/g, "/");
        return `'/workspace/${rel}'`;
      });
      const entryClassName = path.basename(entryPoint.name, ".java");
      
      dockerCmd = `docker run --rm --network none --read-only --tmpfs /tmp --memory="256m" --memory-swap="256m" --cpus="0.5" --pids-limit 128 --user 1000:1000 -v "${formattedVolumePath}:/workspace" -w /workspace eclipse-temurin:17-alpine sh -c "javac -d /workspace ${javaFiles.join(' ')} && java -cp /workspace ${entryClassName} < /workspace/input.txt"`;
    } else {
      throw new Error(`Language ${language} sandbox execution is not implemented.`);
    }

    console.log(`[Docker Sandbox] Executing command: ${dockerCmd}`);

    // Await promise to prevent the race condition where executionDir is deleted while running
    const result = await new Promise((resolve, reject) => {
      // Execute with a strict 7-second runtime timeout
      exec(dockerCmd, { timeout: 7000 }, (error, stdout, stderr) => {
        if (error) {
          // If killed by exec timeout
          if (error.killed) {
            reject(new Error("Execution Timed Out (Max limit 7 seconds exceeded). Check for infinite loops in code."));
          } else {
            reject(stderr || error.message);
          }
        } else {
          resolve(stdout);
        }
      });
    });

    return result;

  } finally {
    // 6. Cleanup temp host files safely after execution completes
    removeDirectoryRecursively(executionDir);
  }
};

module.exports = { runDockerWorkspaceCode };
