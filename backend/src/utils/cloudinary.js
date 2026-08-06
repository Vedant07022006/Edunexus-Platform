import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import logger from "./logger.js";


let isConfigured = false;

const configureCloudinary = () => {
  if (isConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  isConfigured = true;
};



export const uploadThumbnailOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    configureCloudinary();

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: "edunexus/thumbnails",
      transformation: [
        { width: 1280, height: 720, crop: "fill", gravity: "auto" }, 
        { quality: "auto:good" },
        { fetch_format: "auto" }, 
      ],
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    logger.error("Cloudinary thumbnail upload failed:", error.message);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


export const uploadVideoOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    configureCloudinary();

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
    logger.error("Cloudinary video upload failed:", error.message);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


export const uploadResourceOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    configureCloudinary();

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw", 
      folder: "edunexus/resources",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    logger.error("Cloudinary resource upload failed:", error.message);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};



export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;

    configureCloudinary();

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType, 
    });
    return response;
  } catch (error) {
    return null;
  }
};


export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
  return matches ? matches[1] : null;
};


export const getVideoThumbnailUrl = (videoPublicId, timeOffset = "auto") => {
  if (!videoPublicId) return null;

  configureCloudinary();

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
