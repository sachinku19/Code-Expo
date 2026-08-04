// Helper: Normalize and resolve relative paths
const resolveRelativePath = (basePath, relativePath) => {
  if (!relativePath) return "";
  
  if (
    relativePath.startsWith("http://") || 
    relativePath.startsWith("https://") || 
    relativePath.startsWith("data:") || 
    relativePath.startsWith("blob:")
  ) {
    return relativePath; // absolute URL
  }
  
  // Strip leading slash for absolute root specifiers
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

// Helper: Get premium file extension emoji icons
const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "html" || ext === "htm") return "🌐";
  if (ext === "css") return "🎨";
  if (ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx") return "📜";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "🖼";
  if (ext === "svg") return "🖼";
  if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "🎬";
  if (["mp3", "wav", "aac", "flac"].includes(ext)) return "🎵";
  if (["woff", "woff2", "ttf", "otf", "eot"].includes(ext)) return "🔤";
  if (ext === "json") return "📄";
  return "📄";
};

class PathAutocompleteService {
  constructor() {
    this.items = [];
    this.activeFileId = null;
    this.dirCache = {};  // folderPath (e.g. "" or "css") -> array of children items
    this.itemIdMap = {}; // id -> item
  }

  updateItems(items = [], activeFileId = null) {
    this.items = items;
    this.activeFileId = activeFileId;
    this.rebuildCache();
  }

  rebuildCache() {
    this.dirCache = {};
    this.itemIdMap = {};

    // 1. Build map of ID -> Item with empty path
    this.items.forEach(item => {
      this.itemIdMap[String(item._id)] = {
        ...item,
        path: "" // computed recursively
      };
    });

    // Helper: Compute absolute path recursively
    const computePath = (itemId) => {
      const item = this.itemIdMap[itemId];
      if (!item) return "";
      if (item.path) return item.path;

      if (!item.parentId) {
        item.path = item.name;
      } else {
        const parentPath = computePath(String(item.parentId));
        item.path = parentPath ? (parentPath + "/" + item.name) : item.name;
      }
      return item.path;
    };

    // 2. Compute path for all items
    Object.keys(this.itemIdMap).forEach(id => {
      computePath(id);
    });

    // 3. Populate directory children cache
    Object.values(this.itemIdMap).forEach(item => {
      let parentFolderPath = "";
      if (item.parentId) {
        const parent = this.itemIdMap[String(item.parentId)];
        if (parent) {
          parentFolderPath = parent.path;
        }
      }

      if (!this.dirCache[parentFolderPath]) {
        this.dirCache[parentFolderPath] = [];
      }
      this.dirCache[parentFolderPath].push(item);
    });
  }

  // Detect context type by reading lines backwards
  detectContext(model, position) {
    const currentLine = model.getLineContent(position.lineNumber);
    let textToParse = currentLine.substring(0, position.column - 1);
    
    // Scan up to 8 lines backwards to get multi-line HTML contexts
    let row = position.lineNumber;
    let linesToRead = 8;
    while (row > 1 && linesToRead > 0 && !textToParse.includes("<") && !textToParse.includes("@import")) {
      row--;
      linesToRead--;
      textToParse = model.getLineContent(row) + "\n" + textToParse;
    }
    
    const textLower = textToParse.toLowerCase();
    
    if (textLower.includes("<link") && textLower.includes("stylesheet")) {
      return "css";
    }
    if (textLower.includes("<script")) {
      return "js";
    }
    if (textLower.includes("<img")) {
      return "image";
    }
    if (textLower.includes("<video") || (textLower.includes("<source") && textLower.includes("video"))) {
      return "video";
    }
    if (textLower.includes("<audio") || (textLower.includes("<source") && textLower.includes("audio"))) {
      return "audio";
    }
    if (textLower.includes("@font-face") || textLower.includes("font-face")) {
      return "font";
    }
    if (textLower.includes("@import")) {
      return "css";
    }
    if (textLower.includes("import ") || textLower.includes("from ") || textLower.includes("export ")) {
      return "js";
    }
    if (textLower.includes("<a")) {
      return "html";
    }
    
    return "default";
  }

  // Filter list based on context rules
  filterByContext(item, contextType) {
    if (item.type === "folder") return true; // folders must always be shown to allow deep traversal
    
    const ext = item.name.split(".").pop().toLowerCase();
    
    switch (contextType) {
      case "css":
        return ext === "css";
      case "js":
        return ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx";
      case "image":
        return ["png", "jpg", "jpeg", "webp", "svg", "gif", "ico"].includes(ext);
      case "video":
        return ["mp4", "webm", "ogg"].includes(ext);
      case "audio":
        return ["mp3", "wav", "ogg", "aac", "flac"].includes(ext);
      case "font":
        return ["woff", "woff2", "ttf", "otf", "eot"].includes(ext);
      default:
        return true; // show all files in default mode
    }
  }

  // Sort priorities: Folders first, context preferred files next, other files last
  getSortText(item, contextType) {
    if (item.type === "folder") {
      return "00_" + item.name;
    }
    
    const ext = item.name.split(".").pop().toLowerCase();
    
    if (contextType === "html" && (ext === "html" || ext === "htm")) {
      return "01_" + item.name;
    }
    if (contextType === "css" && ext === "css") {
      return "01_" + item.name;
    }
    if (contextType === "js" && (ext === "js" || ext === "jsx")) {
      return "01_" + item.name;
    }
    
    return "02_" + item.name;
  }

  // Provider callback method for Monaco
  provideSuggestions(model, position, monaco) {
    // Return early if no active file or if workspace tree is empty
    if (!this.activeFileId || this.items.length === 0) {
      return { suggestions: [] };
    }

    const currentLine = model.getLineContent(position.lineNumber);
    const currentText = currentLine.substring(0, position.column - 1);

    // Extract what path has been typed so far
    // Sourced dynamically ending at cursor, going backwards to a delimiter
    const pathRegex = /["'\(]\s*([a-zA-Z0-9\.\/_-]*)$/;
    const match = currentText.match(pathRegex);
    if (!match) {
      return { suggestions: [] };
    }

    const typedPath = match[1];

    // Determine prefix search string and folder directory path
    let parentTypedDir = "";
    let fileNamePrefix = typedPath;
    if (typedPath.includes("/")) {
      const lastSlashIndex = typedPath.lastIndexOf("/");
      parentTypedDir = typedPath.substring(0, lastSlashIndex);
      fileNamePrefix = typedPath.substring(lastSlashIndex + 1);
    }

    // Determine current active file folder path
    const activeItem = this.itemIdMap[String(this.activeFileId)];
    const activeFilePath = activeItem ? activeItem.path : "";
    const activeFileFolder = activeFilePath.includes("/")
      ? activeFilePath.substring(0, activeFilePath.lastIndexOf("/"))
      : "";

    // Resolve where to search relative to current file folder
    const absoluteFolderToScan = resolveRelativePath(activeFileFolder, parentTypedDir);

    // Fetch child nodes from cache
    const children = this.dirCache[absoluteFolderToScan] || [];

    // Detect tag context type
    const contextType = this.detectContext(model, position);

    // Filter, sort, and map items into Monaco CompletionItems list
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - fileNamePrefix.length,
      endColumn: position.column
    };

    const suggestions = children
      .filter(item => this.filterByContext(item, contextType))
      .map(item => {
        const isFolder = item.type === "folder";
        const emoji = isFolder ? "📁" : getFileIcon(item.name);
        const label = isFolder ? `${emoji} ${item.name}/` : `${emoji} ${item.name}`;
        
        // Select folder automatically appends trailing slash '/'
        const insertText = isFolder ? `${item.name}/` : item.name;

        return {
          label: label,
          kind: isFolder 
            ? monaco.languages.CompletionItemKind.Folder 
            : monaco.languages.CompletionItemKind.File,
          insertText: insertText,
          range: range,
          filterText: item.name,
          sortText: this.getSortText(item, contextType),
          detail: isFolder ? "Folder" : `File (${item.language || "unspecified"})`
        };
      });

    return { suggestions };
  }
}

// Export singleton path service
const pathAutocompleteService = new PathAutocompleteService();
export default pathAutocompleteService;
