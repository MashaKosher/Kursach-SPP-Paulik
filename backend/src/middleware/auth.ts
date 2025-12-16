import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}


