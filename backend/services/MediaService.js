const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Extracts Cloudinary public_id from secure URL
 */
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const pathAfterUpload = parts[1];
    const pathParts = pathAfterUpload.split("/");
    const startIndex = pathParts[0].startsWith("v") ? 1 : 0;
    const filenameWithExtension = pathParts.slice(startIndex).join("/");
    const publicId = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf("."));
    return publicId;
  } catch (err) {
    console.error("Failed to parse Cloudinary URL public_id:", err);
    return null;
  }
};

/**
 * Validate file mime-type and size limits
 */
const validateFile = (file, options = {}) => {
  if (!file) throw new Error("No file provided for validation.");
  const allowedExtensions = options.allowedExtensions || /jpeg|jpg|png|webp|gif/;
  const allowedMimeTypes = options.allowedMimeTypes || /image\/jpeg|image\/png|image\/webp|image\/gif/;
  const maxLimit = options.maxSize || (10 * 1024 * 1024); // default 10MB

  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedMimeTypes.test(file.mimetype);
  const isExtValid = allowedExtensions.test(ext);

  if (!isMimeValid || !isExtValid) {
    throw new Error(`Upload rejected: Only formats matching ${allowedExtensions.toString()} are allowed!`);
  }

  const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
  if (fileSize > maxLimit) {
    throw new Error(`Upload rejected: File size exceeds the limit of ${maxLimit / (1024 * 1024)}MB.`);
  }

  return true;
};

/**
 * Upload single media buffer to Cloudinary or Local uploads
 */
const uploadMedia = async (fileBuffer, originalFilename, folder, options = {}) => {
  if (!fileBuffer) {
    throw new Error("Cannot upload empty file buffer.");
  }

  const folderName = folder || "codeexpo_general";

  if (isCloudinaryConfigured) {
    const uploadOptions = {
      folder: folderName,
      resource_type: options.resourceType || "auto",
      public_id: options.publicId || undefined,
      quality: options.quality || "auto",
      fetch_format: options.fetchFormat || "auto"
    };

    if (options.width || options.height) {
      uploadOptions.transformation = [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || "limit"
        }
      ];
    }

    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });
    };

    const result = await uploadToCloudinary();
    return {
      url: result.secure_url,
      publicId: result.public_id,
      originalFilename: originalFilename,
      folder: folderName,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      resourceType: result.resource_type,
      uploadedAt: new Date()
    };
  } else {
    // Local fallback
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${folderName.replace("/", "_")}-${Date.now()}-${sanitizedName}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, fileBuffer);

    let hostUrl = "http://localhost:5000";
    if (options.req) {
      hostUrl = `${options.req.protocol}://${options.req.get("host")}`;
    } else if (process.env.HOST_URL) {
      hostUrl = process.env.HOST_URL;
    }

    return {
      url: `${hostUrl}/uploads/${filename}`,
      publicId: filename,
      originalFilename: originalFilename,
      folder: folderName,
      width: options.width || 0,
      height: options.height || 0,
      format: path.extname(originalFilename).replace(".", ""),
      size: fileBuffer.length,
      resourceType: "image",
      uploadedAt: new Date()
    };
  }
};

/**
 * Replace media file: Uploads new, then deletes old
 */
const replaceMedia = async (oldMedia, newFileBuffer, originalFilename, folder, options = {}) => {
  const newMedia = await uploadMedia(newFileBuffer, originalFilename, folder, options);
  if (oldMedia) {
    await deleteMedia(oldMedia).catch((err) => {
      console.error("Failed to delete old media asset during replacement:", err.message);
    });
  }
  return newMedia;
};

/**
 * Deletes a single media file from Cloudinary or local storage
 */
const deleteMedia = async (media) => {
  if (!media) return { success: false, message: "No media provided for deletion" };

  let url = typeof media === "string" ? media : media.url;
  let publicId = typeof media === "object" && media.publicId ? media.publicId : null;

  if (!url && !publicId) {
    return { success: false, message: "Invalid media metadata" };
  }

  // Local uploads cleanup
  if (url && url.includes("/uploads/")) {
    const filename = url.split("/uploads/")[1];
    const uploadsDir = path.join(__dirname, "../uploads");
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return { success: true, message: `Deleted local file: ${filename}` };
      } catch (err) {
        console.error("Failed to delete local file:", err.message);
        return { success: false, error: err.message };
      }
    }
    return { success: true, message: "Local file did not exist" };
  }

  // Cloudinary cleanup
  if (!publicId && url) {
    publicId = getPublicIdFromUrl(url);
  }

  if (publicId && isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return { success: true, result };
    } catch (err) {
      console.error("Failed to delete Cloudinary file:", err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, message: "Cloudinary not configured or public ID not resolved" };
};

/**
 * Bulk delete an array of media documents or URLs
 */
const deleteMultipleMedia = async (medias) => {
  if (!medias || !Array.isArray(medias)) return { success: false };
  const results = await Promise.all(medias.map((m) => deleteMedia(m)));
  return { success: true, results };
};

/**
 * Bulk upload multiple files
 */
const uploadMultipleMedia = async (files, folder, options = {}) => {
  if (!files || !Array.isArray(files)) throw new Error("No files provided for bulk upload");
  const results = await Promise.all(
    files.map((file) => uploadMedia(file.buffer, file.originalname, folder, options))
  );
  return results;
};

/**
 * Reconciles editing media list (keeps unchanged, deletes removed, uploads new)
 */
const reconcileMediaList = async (oldMedias, newUrlsToKeep, newFilesToUpload, folder, options = {}) => {
  const urlsToKeepSet = new Set(newUrlsToKeep || []);
  
  // 1. Identify files to delete
  const toDelete = oldMedias.filter((m) => {
    const url = typeof m === "string" ? m : m.url;
    return !urlsToKeepSet.has(url);
  });

  // 2. Identify files to keep
  const kept = oldMedias.filter((m) => {
    const url = typeof m === "string" ? m : m.url;
    return urlsToKeepSet.has(url);
  });

  // 3. Delete removed files
  if (toDelete.length > 0) {
    await deleteMultipleMedia(toDelete);
  }

  // 4. Upload new files
  let newlyUploaded = [];
  if (newFilesToUpload && newFilesToUpload.length > 0) {
    newlyUploaded = await uploadMultipleMedia(newFilesToUpload, folder, options);
  }

  return [...kept, ...newlyUploaded];
};

/**
 * Retreive metadata of Cloudinary asset (if configured)
 */
const getMediaMetadata = async (publicId) => {
  if (isCloudinaryConfigured && publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (err) {
      console.error("Failed to retrieve Cloudinary asset metadata:", err.message);
      return null;
    }
  }
  return null;
};

/**
 * Moves media to a different folder
 */
const moveMedia = async (sourcePublicId, destinationFolder) => {
  if (isCloudinaryConfigured && sourcePublicId && destinationFolder) {
    try {
      const filename = sourcePublicId.substring(sourcePublicId.lastIndexOf("/") + 1);
      const destPublicId = `${destinationFolder}/${filename}`;
      const result = await cloudinary.uploader.rename(sourcePublicId, destPublicId);
      return result;
    } catch (err) {
      console.error("Failed to rename/move Cloudinary asset:", err.message);
      throw err;
    }
  }
  return null;
};

/**
 * Copies media to a different folder
 */
const copyMedia = async (sourcePublicId, destinationFolder) => {
  if (isCloudinaryConfigured && sourcePublicId && destinationFolder) {
    try {
      const meta = await getMediaMetadata(sourcePublicId);
      if (!meta) throw new Error("Source file metadata not found");
      const result = await uploadMedia(null, meta.original_filename, destinationFolder, {
        publicId: `${destinationFolder}/${meta.original_filename}`,
        resourceType: meta.resource_type
      });
      return result;
    } catch (err) {
      console.error("Failed to copy Cloudinary asset:", err.message);
      throw err;
    }
  }
  return null;
};

module.exports = {
  validateFile,
  uploadMedia,
  replaceMedia,
  deleteMedia,
  deleteMultipleMedia,
  uploadMultipleMedia,
  reconcileMediaList,
  getMediaMetadata,
  moveMedia,
  copyMedia,
  getPublicIdFromUrl
};
