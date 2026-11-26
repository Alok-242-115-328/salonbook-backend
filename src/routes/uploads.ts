import { Router, type Request, type Response } from "express";
import multer from "multer";
import { env } from "../env";
import { ApiError } from "../utils/http";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!file.mimetype.startsWith("image/")) return done(new ApiError(400, "Only image files are allowed."));
    done(null, true);
  },
});

const attempts = new Map<string, number[]>();

function rateLimit(req: Request, _res: Response, next: (error?: unknown) => void) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 12) return next(new ApiError(429, "Too many uploads. Try again later."));
  recent.push(now);
  attempts.set(key, recent);
  next();
}

uploadRouter.post("/", rateLimit, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "Choose an image to upload.");
    if (!env.IMGBB_API_KEY) throw new ApiError(503, "IMGBB_API_KEY is not configured on the server.");

    const body = new URLSearchParams({
      key: env.IMGBB_API_KEY,
      image: req.file.buffer.toString("base64"),
    });
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      success?: boolean;
      data?: { url?: string; delete_url?: string };
      error?: { message?: string };
    };
    if (!response.ok || !payload.success || !payload.data?.url) {
      throw new ApiError(502, payload.error?.message || "Image upload failed. Please try again.");
    }
    res.json({
      success: true,
      url: payload.data.url,
      deleteUrl: payload.data.delete_url,
      message: "Image uploaded successfully.",
    });
  } catch (error) {
    next(error);
  }
});
