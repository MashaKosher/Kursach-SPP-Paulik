import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.js";

export function requireRole(role: string) {
  return function (req: AuthedRequest, res: Response, next: NextFunction) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.user.roles.includes(role)) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}


