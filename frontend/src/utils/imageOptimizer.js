/**
 * Dynamic Cloudinary image delivery optimization utility.
 * Optimizes quality, format, and dimensions for responsive viewports.
 */

/**
 * Optimizes a Cloudinary image URL by inserting delivery-time transformations.
 * If the URL is not a Cloudinary URL, it returns the original URL unchanged.
 * 
 * @param {string} url - The original image URL.
 * @param {object} [options] - Optimization options.
 * @param {string} [options.format="auto"] - The delivery format (e.g. 'auto', 'webp', 'png', 'jpg').
 * @param {string} [options.quality="auto:best"] - The delivery quality strategy (e.g. 'auto:best', 'auto', 'auto:good').
 * @param {number} [options.width] - Optional width transformation.
 * @param {number} [options.height] - Optional height transformation.
 * @param {string} [options.crop] - Optional crop mode (e.g. 'fill', 'limit', 'crop'). Defaults to 'limit' if width or height is provided.
 * @returns {string} The optimized image URL.
 */
export const optimizeCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return url;
  }

  // We want to insert transformations after '/upload/'
  const parts = url.split("/upload/");
  if (parts.length < 2) return url;

  const baseUrl = parts[0] + "/upload";
  const restOfUrl = parts[1];

  const transformParams = [];

  // Format selection
  if (options.format) {
    transformParams.push(`f_${options.format}`);
  } else {
    transformParams.push("f_auto");
  }

  // Quality selection (prioritizes visual quality as per requirements)
  if (options.quality) {
    if (options.quality === "best") {
      transformParams.push("q_auto:best");
    } else if (options.quality === "good") {
      transformParams.push("q_auto:good");
    } else if (options.quality === "eco") {
      transformParams.push("q_auto:eco");
    } else if (options.quality === "low") {
      transformParams.push("q_auto:low");
    } else {
      transformParams.push(`q_${options.quality}`);
    }
  } else {
    transformParams.push("q_auto:best");
  }

  // Sizing transformations
  if (options.width) {
    transformParams.push(`w_${options.width}`);
  }
  if (options.height) {
    transformParams.push(`h_${options.height}`);
  }

  // Cropping modes
  if (options.crop) {
    transformParams.push(`c_${options.crop}`);
  } else if (options.width || options.height) {
    transformParams.push("c_limit");
  }

  const transformStr = transformParams.join(",");
  return `${baseUrl}/${transformStr}/${restOfUrl}`;
};

/**
 * Generates a responsive srcSet string for Cloudinary images.
 * If the URL is not a Cloudinary URL, it returns undefined.
 * 
 * @param {string} url - The original image URL.
 * @param {object} [options] - Sizing and optimization options.
 * @returns {string|undefined} Responsive srcSet string or undefined.
 */
export const getCloudinarySrcSet = (url, options = {}) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return undefined;
  }

  const widths = [400, 800, 1200, 1600, 2000];
  const srcSetParts = widths.map((w) => {
    const optUrl = optimizeCloudinaryUrl(url, { ...options, width: w });
    return `${optUrl} ${w}w`;
  });

  return srcSetParts.join(", ");
};
