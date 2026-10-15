import { Request, Response, NextFunction } from "express";
import mongo from "mongo-sanitize";

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = mongo(req.body);
  if (req.query) req.query = mongo(req.query);
  if (req.params) req.params = mongo(req.params);
  next();
};