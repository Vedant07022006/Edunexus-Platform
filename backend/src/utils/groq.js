/**
 * Shared Groq AI utilities.
 *
 * All controllers that call the Groq API import from here so that:
 *  - the GROQ_API_KEY is accessed in one place
 *  - common helpers (trimming, JSON parsing) stay DRY
 *  - swapping the underlying AI library only requires changes here
 */

import Groq from "groq-sdk";
import ApiError from "./ApiError.js";

// ─── Client ────────────────────────────────────────────────────────────────────

/**
 * Creates a new Groq client on each call (the SDK is lightweight; creating
 * it lazily means dotenv is always loaded before the constructor runs).
 */
export const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Text helpers ──────────────────────────────────────────────────────────────

/**
 * Trims a transcript to at most `maxChars` characters with a trailing ellipsis.
 * Keeps prompt size (and inference cost) predictable regardless of lecture length.
 */
export const trimTranscript = (text, maxChars = 6000) =>
  text.length <= maxChars ? text : text.slice(0, maxChars) + "...";

// ─── JSON response parser ──────────────────────────────────────────────────────

/**
 * Strips markdown code fences that some models wrap JSON in, then parses.
 * Throws an ApiError(500) with the supplied messages on failure.
 *
 * @param {string}   raw              - Raw text from the model
 * @param {function} validator        - (parsed) => true | throws ApiError
 * @param {string}   [parseErrMsg]    - Message used when JSON.parse fails
 * @returns {*}                       - The validated parsed value
 */
export const parseAiJsonResponse = (
  raw,
  validator,
  parseErrMsg = "AI returned invalid content. Please try again."
) => {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(500, parseErrMsg);
  }
  // validator throws its own ApiError if the shape is wrong
  validator(parsed);
  return parsed;
};
