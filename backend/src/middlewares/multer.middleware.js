import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import ApiError from "../utils/ApiError.js";



const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const tempDir    = path.join(__dirname, "../../public/temp");


// Storage — save to disk with unique names

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});


const fileFilter = (req, file, cb) => {
  const allowedVideoTypes    = ["video/mp4", "video/mkv", "video/webm", "video/quicktime"];
  const allowedImageTypes    = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedResourceTypes = ["application/pdf"];

  const allAllowedTypes = [
    ...allowedVideoTypes,
    ...allowedImageTypes,
    ...allowedResourceTypes,
  ];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Only videos, images and PDFs allowed.`
      ),
      false
    );
  }
};


export const uploadThumbnail = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("thumbnail");


export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
}).single("video");

export const uploadCourseFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
}).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video",     maxCount: 1 },
]);


export const uploadResource = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
}).single("resource");