import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { auditService } from "@/modules/audit/audit.service";

export const auditWrite = (resource: string, action: "CREATE" | "UPDATE" | "DELETE") => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        auditService.log({
          userId: req.user.id,
          action,
          resource,
          resourceId: req.params.id || body?.data?._id || "unknown",
          newData: action !== "DELETE" ? req.body : undefined,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
      }
      return originalJson(body);
    };

    next();
  };
};