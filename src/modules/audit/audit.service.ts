import { AuditLog, IAuditLog } from "./audit.model";
import { logger } from "@/utils/logger";

export class AuditService {
  async log(entry: Partial<IAuditLog>): Promise<void> {
    try {
      await new AuditLog(entry).save();
    } catch (error) {
      logger.error("Failed to write audit log:", error);
    }
  }
}

export const auditService = new AuditService();