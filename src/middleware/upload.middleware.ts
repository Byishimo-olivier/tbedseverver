import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError, ErrorType } from "../utils/exceptions";

// Use disk storage - files will be saved to the uploads directory
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join("uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeBase = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    const ext = path.extname(file.originalname);
    const uniqueName = `${safeBase}-${timestamp}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(
    file.originalname.toLowerCase().split(".").pop() || ""
  );

  if (mimetype || extname) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Only images and documents are allowed (jpeg, jpg, png, pdf, doc, docx, xls, xlsx)",
        400,
        ErrorType.VALIDATION
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});