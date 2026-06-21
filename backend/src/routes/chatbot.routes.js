import { Router } from "express";
import { askChatbot, getChatbotUsage } from "../controllers/chatbot.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isStudent } from "../middlewares/role.middleware.js";

const router = Router();

router.post("/ask",   verifyJWT, isStudent, askChatbot);
router.get("/usage",  verifyJWT, isStudent, getChatbotUsage);

export default router;