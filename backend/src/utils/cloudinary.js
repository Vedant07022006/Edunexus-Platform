import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


const getCloudinaryConfig = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};



export const uploadThumbnailOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    getCloudinaryConfig();

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: "edunexus/thumbnails",
      transformation: [
        { width: 1280, height: 720, crop: "fill", gravity: "auto" }, // 16:9 ratio
        { quality: "auto:good" },
        { fetch_format: "auto" }, // Auto WebP/AVIF for modern browsers
      ],
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("❌ Cloudinary thumbnail upload failed:", error.message);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


export const uploadVideoOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    getCloudinaryConfig();

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "video",
      folder: "edunexus/videos",
      chunk_size: 6000000, 
      eager: [
        { streaming_profile: "full_hd", format: "m3u8" }, 
      ],
      eager_async: true, 
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


export const uploadResourceOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    getCloudinaryConfig();

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw", // For PDFs, docs, zip etc.
      folder: "edunexus/resources",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};



export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;

    getCloudinaryConfig();

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType, // "image" | "video" | "raw"
    });
    return response;
  } catch (error) {
    return null;
  }
};


export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // Handles: https://res.cloudinary.com/<cloud>/image/upload/v123/edunexus/videos/abc.mp4
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
  return matches ? matches[1] : null;
};


export const getVideoThumbnailUrl = (videoPublicId, timeOffset = "auto") => {
  if (!videoPublicId) return null;

  getCloudinaryConfig();

  return cloudinary.url(videoPublicId, {
    resource_type: "video",
    format: "jpg",
    transformation: [
      { start_offset: timeOffset },          
      { width: 1280, height: 720, crop: "fill" },
      { quality: "auto:good" },
    ],
  });
};
