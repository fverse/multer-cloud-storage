import { Request } from "express";
import multer, { StorageEngine, FileFilterCallback } from "multer";

export interface File extends Express.Multer.File {
  bucket: string;
  key: string;
  location: string;
  etag: string;
}

export interface StorageParams {
  fileFilter?(
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ): void;
  key?(req: Request, file: Express.Multer.File): string;
  fieldName?: string;
  maxCount?: number;
  bucket: string;
  endpoint: string;
  apiKeyId: string;
  serviceInstanceId: string;
  signatureVersion?: string;
}

export interface StorageParamError {
  param: string;
  message: string;
}

export class IbmCosStorage implements StorageEngine {
  constructor(opts: StorageParams);
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, objectInfo?: Partial<File>) => void
  ): void;
  _removeFile(
    req: Request,
    file: File,
    callback: (error: Error | null) => void
  ): void;
}

export function cosMultipleUpload(params: StorageParams): multer.Multer;
export function cosSingleUpload(params: StorageParams): multer.Multer;
export function CosStorage(opts: StorageParams): IbmCosStorage;
