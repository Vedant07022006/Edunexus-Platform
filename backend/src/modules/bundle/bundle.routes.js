import { Router } from "express";
import {
  createBundle,
  getMyBundles,
  publishBundle,
  getBundleById,
  getAllBundles,
} from "./bundle.controller.js";
import verifyJWT from "../../middlewares/auth.middleware.js";
import { isInstructor } from "../../middlewares/role.middleware.js";

const router = Router();

// PUBLIC
router.get("/", getAllBundles);

// INSTRUCTOR — static paths before /:bundleId
router.get("/my/bundles", verifyJWT, isInstructor, getMyBundles);
router.post("/", verifyJWT, isInstructor, createBundle);
router.patch("/:bundleId/publish", verifyJWT, isInstructor, publishBundle);

router.get("/:bundleId", getBundleById);

export default router;
