import * as workspaceService from "./workspaceService";

// Helper: Normalize and resolve relative paths
export const resolveRelativePath = (basePath, relativePath) => {
  if (!relativePath) return "";
  
  if (
    relativePath.startsWith("http://") || 
    relativePath.startsWith("https://") || 
    relativePath.startsWith("data:") || 
    relativePath.startsWith("blob:")
  ) {
    return relativePath;
  }
  
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }
  
  const baseParts = basePath ? basePath.split("/").filter(Boolean) : [];
  const relParts = relativePath.split("/").filter(Boolean);
  
  for (const part of relParts) {
    if (part === "." || part === "") {
      continue;
    } else if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  
  return baseParts.join("/");
};

// Helper: Inline CSS @import statements
export const inlineCSS = (cssContent, cssFolder, allFiles) => {
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;
  return cssContent.replace(importRegex, (match, importPath) => {
    const resolvedPath = resolveRelativePath(cssFolder, importPath);
    const importedFile = allFiles.find(f => f.path === resolvedPath);
    if (importedFile && importedFile.content) {
      const importedFolder = resolvedPath.includes("/") 
        ? resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) 
        : "";
      return inlineCSS(importedFile.content, importedFolder, allFiles);
    }
    return `/* Failed to import CSS: ${importPath} (resolved: ${resolvedPath}) */`;
  });
};

// Convert base64 image data to base64 data URL
export const getAssetDataUrl = (fileName, base64Content) => {
  const ext = fileName.split(".").pop().toLowerCase();
  let mime = "application/octet-stream";
  if (ext === "png") mime = "image/png";
  else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
  else if (ext === "gif") mime = "image/gif";
  else if (ext === "svg") mime = "image/svg+xml";
  else if (ext === "webp") mime = "image/webp";
  
  if (base64Content.startsWith("data:")) return base64Content;
  return `data:${mime};base64,${base64Content}`;
};

// Calculate full path tree
export const getFullPath = (item, allItems) => {
  if (!item) return "";
  let path = item.name;
  let current = item;
  const visited = new Set();
  while (current.parentId && !visited.has(String(current.parentId))) {
    visited.add(String(current.parentId));
    const parent = allItems.find((i) => String(i._id) === String(current.parentId));
    if (!parent) break;
    path = parent.name + "/" + path;
    current = parent;
  }
  return path;
};

/**
 * Shared Core Project Compiler Function
 * Compiles HTML/CSS/JS files into a standalone blob URL with ES Modules & asset resolution.
 */
export const compileWorkspaceProject = async ({
  roomId,
  activeHTMLPath = "index.html",
  tabs = [],
  activeCode = "",
  activeFileId = null,
  activeBlobUrlsRef = { current: {} }
}) => {
  // Clean up previous blob URLs
  if (activeBlobUrlsRef && activeBlobUrlsRef.current) {
    Object.values(activeBlobUrlsRef.current).forEach((url) => {
      try { URL.revokeObjectURL(url); } catch(e) {}
    });
    activeBlobUrlsRef.current = {};
  }

  // 1. Fetch DB workspace contents & tree
  const data = await workspaceService.getWorkspaceContents(roomId);
  const dbFiles = data.files || [];

  const treeData = await workspaceService.getWorkspaceTree(roomId);
  const allItems = treeData.items || [];

  // 2. Map file paths and overlay dirty contents from open tabs / active editor
  const allFiles = dbFiles.map((file) => {
    const matchingTreeItem = allItems.find((i) => String(i._id) === String(file._id));
    const path = getFullPath(matchingTreeItem || file, allItems);
    
    let content = file.content || "";
    const openTab = tabs.find((t) => String(t._id) === String(file._id));
    if (openTab) {
      content = openTab.content || "";
    }
    if (activeFileId && String(file._id) === String(activeFileId)) {
      content = activeCode;
    }

    return {
      ...file,
      path,
      content
    };
  });

  const foundHtmlFiles = allFiles.filter((f) => f.name.endsWith(".html"));

  let targetHtmlPath = activeHTMLPath;
  let activeHtmlFile = allFiles.find((f) => f.path === targetHtmlPath);
  if (!activeHtmlFile) {
    const entry = allFiles.find((f) => f.isEntryPoint);
    const indexHtml = allFiles.find((f) => f.path === "index.html");
    activeHtmlFile = entry || indexHtml || foundHtmlFiles[0];
    
    if (activeHtmlFile) {
      targetHtmlPath = activeHtmlFile.path;
    }
  }

  if (!activeHtmlFile) {
    throw new Error("No HTML file found in workspace. Create index.html to run the preview.");
  }

  const activeHTMLFolder = targetHtmlPath.includes("/") 
    ? targetHtmlPath.substring(0, targetHtmlPath.lastIndexOf("/")) 
    : "";

  const cssBlobUrls = {};
  const jsBlobUrls = {};
  const assetUrls = {};

  allFiles.forEach((file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (ext === "css") {
      const cssFolder = file.path.includes("/") 
        ? file.path.substring(0, file.path.lastIndexOf("/")) 
        : "";
      const inlined = inlineCSS(file.content, cssFolder, allFiles);
      const blob = new Blob([inlined], { type: "text/css" });
      const url = URL.createObjectURL(blob);
      cssBlobUrls[file.path] = url;
      if (activeBlobUrlsRef && activeBlobUrlsRef.current) activeBlobUrlsRef.current[file.path] = url;
    } else if (ext === "js" || ext === "jsx") {
      const blob = new Blob([file.content], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      jsBlobUrls[file.path] = url;
      if (activeBlobUrlsRef && activeBlobUrlsRef.current) activeBlobUrlsRef.current[file.path] = url;
    } else if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "json"].includes(ext)) {
      let url;
      if (ext === "json") {
        const blob = new Blob([file.content], { type: "application/json" });
        url = URL.createObjectURL(blob);
      } else if (ext === "svg") {
        const blob = new Blob([file.content], { type: "image/svg+xml" });
        url = URL.createObjectURL(blob);
      } else {
        url = getAssetDataUrl(file.name, file.content);
      }
      assetUrls[file.path] = url;
      if (!url.startsWith("data:") && activeBlobUrlsRef && activeBlobUrlsRef.current) {
        activeBlobUrlsRef.current[file.path] = url;
      }
    }
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(activeHtmlFile.content, "text/html");

  const interceptorScript = doc.createElement("script");
  interceptorScript.textContent = `
    (function() {
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalTable = console.table;
      
      const sendLog = (type, args) => {
        try {
          const serialized = Array.from(args).map(arg => {
            if (arg === null) return "null";
            if (arg === undefined) return "undefined";
            if (typeof arg === 'object') {
              try { return JSON.stringify(arg); } catch(e) { return String(arg); }
            }
            return String(arg);
          });
          window.parent.postMessage({ type: 'console', logType: type, content: serialized }, '*');
        } catch (e) {}
      };
      
      console.log = function() { sendLog('log', arguments); originalLog.apply(console, arguments); };
      console.warn = function() { sendLog('warn', arguments); originalWarn.apply(console, arguments); };
      console.error = function() { sendLog('error', arguments); originalError.apply(console, arguments); };
      console.table = function(data) { sendLog('table', [data]); originalTable.apply(console, arguments); };
      
      window.addEventListener('error', function(e) {
        if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG')) {
          const url = e.target.src || e.target.href;
          window.parent.postMessage({ type: 'error', message: 'Failed to load resource (' + e.target.tagName + '): ' + url }, '*');
        } else {
          window.parent.postMessage({ type: 'error', message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno }, '*');
        }
      }, true);
      
      window.addEventListener('unhandledrejection', function(e) {
        window.parent.postMessage({ type: 'error', message: 'Unhandled Promise Rejection: ' + String(e.reason) }, '*');
      });
    })();
    
    document.addEventListener('click', function(e) {
      const anchor = e.target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//') && !href.startsWith('#')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'navigate', path: href }, '*');
        }
      }
    });
  `;
  doc.head.insertBefore(interceptorScript, doc.head.firstChild);

  const imports = {};
  allFiles.forEach((file) => {
    if (file.name.endsWith(".js") || file.name.endsWith(".jsx")) {
      const fileBlobURL = jsBlobUrls[file.path];
      if (fileBlobURL) {
        imports[file.path] = fileBlobURL;
        imports["./" + file.path] = fileBlobURL;
        imports["/" + file.path] = fileBlobURL;
        
        const parts = file.path.split("/");
        const name = parts[parts.length - 1];
        imports[name] = fileBlobURL;
        imports["./" + name] = fileBlobURL;
        
        const relativeToHtml = file.path.replace(activeHTMLFolder + "/", "");
        imports[relativeToHtml] = fileBlobURL;
        imports["./" + relativeToHtml] = fileBlobURL;
      }
    }
  });

  const importMapScript = doc.createElement("script");
  importMapScript.type = "importmap";
  importMapScript.textContent = JSON.stringify({ imports }, null, 2);
  doc.head.insertBefore(importMapScript, doc.head.firstChild);

  doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href) {
      const resolvedPath = resolveRelativePath(activeHTMLFolder, href);
      const cssBlobURL = cssBlobUrls[resolvedPath];
      if (cssBlobURL) {
        link.setAttribute("href", cssBlobURL);
      }
    }
  });

  doc.querySelectorAll("script").forEach((script) => {
    const src = script.getAttribute("src");
    if (src) {
      const resolvedPath = resolveRelativePath(activeHTMLFolder, src);
      const jsBlobURL = jsBlobUrls[resolvedPath];
      if (jsBlobURL) {
        script.setAttribute("src", jsBlobURL);
      }
    }
  });

  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) {
      const resolvedPath = resolveRelativePath(activeHTMLFolder, src);
      const assetUrl = assetUrls[resolvedPath];
      if (assetUrl) {
        img.setAttribute("src", assetUrl);
      }
    }
  });

  const finalHtmlString = new XMLSerializer().serializeToString(doc);
  const htmlBlob = new Blob([finalHtmlString], { type: "text/html" });
  const finalHtmlUrl = URL.createObjectURL(htmlBlob);

  return {
    previewUrl: finalHtmlUrl,
    htmlFiles: foundHtmlFiles,
    activeHTMLPath: targetHtmlPath
  };
};
