// import { IUser } from "../users/user.model";
// import { Upload } from "./upload.model";
// import { cloudinary, configureCloudinary } from "../../config/cloudinary";
// import { logger } from "../../utils/logger";

// // Ensure Cloudinary is configured
// configureCloudinary();

// export interface CloudinaryUploadResult {
//   public_id: string;
//   secure_url: string;
//   format: string;
//   bytes: number;
//   resource_type: string;
// }

// export class UploadService {
//   /**
//    * Upload a file buffer to Cloudinary
//    */
//   private async uploadToCloudinary(
//     fileBuffer: Buffer,
//     originalName: string,
//     mimeType: string
//   ): Promise<CloudinaryUploadResult> {
//     const folder = process.env.CLOUDINARY_FOLDER || "construction-management";
//     const safeBase = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
//     const publicId = `${folder}/${safeBase}-${Date.now()}`;

//     // Determine resource type based on mime type
//     let resourceType: "image" | "raw" | "video" | "auto" = "auto";
//     if (mimeType.startsWith("image/")) {
//       resourceType = "image";
//     } else if (mimeType.startsWith("video/")) {
//       resourceType = "video";
//     } else {
//       resourceType = "raw"; // For PDFs, docs, etc.
//     }

//     return new Promise((resolve, reject) => {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         {
//           public_id: publicId,
//           resource_type: resourceType,
//           folder: undefined, // Already included in public_id
//         },
//         (error, result) => {
//           if (error) {
//             logger.error("Cloudinary upload error:", error);
//             reject(error);
//           } else if (result) {
//             resolve({
//               public_id: result.public_id,
//               secure_url: result.secure_url,
//               format: result.format,
//               bytes: result.bytes,
//               resource_type: result.resource_type,
//             });
//           } else {
//             reject(new Error("No result from Cloudinary"));
//           }
//         }
//       );

//       // Write buffer to stream
//       uploadStream.end(fileBuffer);
//     });
//   }

//   async saveFileDetails(
//     user: IUser,
//     file: Express.Multer.File,
//     description: string,
//     projectId?: string
//   ) {
//     // Upload to Cloudinary
//     const cloudinaryResult = await this.uploadToCloudinary(
//       file.buffer,
//       file.originalname,
//       file.mimetype
//     );

//     const upload = new Upload({
//       userId: user._id,
//       ...(projectId && { projectId }), // only include if provided
//       fileName: cloudinaryResult.public_id, // Store public_id for deletion
//       filePath: cloudinaryResult.secure_url, // Store the full Cloudinary URL
//       fileType: file.mimetype,
//       fileSize: cloudinaryResult.bytes,
//       description,
//     });

//     await upload.save();
//     logger.info(`File uploaded to Cloudinary: ${cloudinaryResult.public_id}`);
//     return upload;
//   }

//   async deleteFileByPath(documentPath: string): Promise<void> {
//     try {
//       const uploadRecord = await Upload.findOne({ filePath: documentPath });

//       if (uploadRecord) {
//         const publicId = uploadRecord.fileName;
//         const fileType = uploadRecord.fileType;
        
//         let resourceType: "image" | "raw" | "video" = "raw";
//         if (fileType.startsWith("image/")) {
//           resourceType = "image";
//         } else if (fileType.startsWith("video/")) {
//           resourceType = "video";
//         }

//         // Delete from Cloudinary
//         await cloudinary.uploader.destroy(publicId, {
//           resource_type: resourceType,
//         });

//         // Delete record from DB
//         await Upload.deleteOne({ _id: uploadRecord._id });

//         logger.info(`Deleted file from Cloudinary: ${publicId}`);
//       } else {
//         logger.warn(
//           `Upload record not found for path: ${documentPath}. The file may be orphaned in Cloudinary.`
//         );
//       }
//     } catch (error) {
//       logger.error(
//         `Error during file deletion for path ${documentPath}:`,
//         error
//       );
//       throw error;
//     }
//   }
// }

// export const uploadService = new UploadService();

import { IUser } from "../users/user.model";
import { Upload } from "./upload.model";
import { logger } from "../../utils/logger";
import fs from "fs";
import path from "path";

export class UploadService {
  /**
   * Build the public URL for a locally stored file.
   */
  private getFileUrl(filePath: string): string {
    const baseUrl = process.env.BACKEND_URL;
    // filePath from multer is like "uploads/filename.pdf"
    return `${baseUrl}/${filePath.replace(/\\/g, "/")}`;
  }

  async saveFileDetails(
    user: IUser,
    file: Express.Multer.File,
    description: string,
    projectId?: string
  ) {
    const fileUrl = this.getFileUrl(file.path);

    const upload = new Upload({
      userId: user._id,
      ...(projectId && { projectId }),
      fileName: file.filename,
      filePath: fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
      description,
    });

    await upload.save();
    logger.info(`File saved locally: ${file.path}`);
    return upload;
  }

  async deleteFileByPath(documentPath: string): Promise<void> {
    try {
      const uploadRecord = await Upload.findOne({ filePath: documentPath });

      if (uploadRecord) {
        // Resolve the local file path from the stored fileName
        const localPath = path.join("uploads", uploadRecord.fileName);

        // Delete from filesystem
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          logger.info(`Deleted local file: ${localPath}`);
        } else {
          logger.warn(`Local file not found: ${localPath}`);
        }

        // Delete record from DB
        await Upload.deleteOne({ _id: uploadRecord._id });
      } else {
        logger.warn(
          `Upload record not found for path: ${documentPath}. The file may be orphaned.`
        );
      }
    } catch (error) {
      logger.error(
        `Error during file deletion for path ${documentPath}:`,
        error
      );
      throw error;
    }
  }
}

export const uploadService = new UploadService();