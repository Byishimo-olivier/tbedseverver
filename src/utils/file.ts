import fs from 'fs';
import { logger } from './logger';

export const cleanupFile = (filePath: string | null): void => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up file: ${filePath}`);
    } catch (error) {
      logger.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
};