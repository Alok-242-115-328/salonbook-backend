import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const err = error as {
    status?: number;
    message?: string;
    code?: number;
    name?: string;
    issues?: { message?: string }[];
  };
  let status = err.status ?? (err.code === 11000 ? 409 : 500);
  let message =
    err.code === 11000
      ? "A record with these details already exists."
      : err.message || "Something went wrong. Please try again.";

  if (err.name === "ZodError") {
    status = 400;
    message = err.issues?.map((issue) => issue.message).join(", ") || "Invalid request details.";
  } else if (err.name === "MulterError" || err.name === "ValidationError" || err.name === "CastError") {
    status = 400;
  } else if (err.name === "MongooseError" || err.name === "MongoServerError") {
    status = 503;
    message = "Database is temporarily unavailable. Please try again.";
  }

  if (status >= 500) console.error("[SalonBook API]", error);
  res.status(status).json({ success: false, message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "API route not found." });
}
