import ibm from "ibm-cos-sdk";
import multer, { StorageEngine, FileFilterCallback } from "multer";
import { Request } from "express";
import crypto from "crypto";

/** Extends Express.Multer.File with additional properties specific to IBM Cloud Object Storage. */
interface File extends Express.Multer.File {
  bucket: string;
  key: string;
  location: string;
  etag: string;
}

/** Interface defining the configuration options for Multer storage. */
interface StorageParams {
  /** Optional function to control which files are uploaded. This is called for every file that is processed. */
  fileFilter?(
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ): void;
  /** 
  An optional function to determine the storage key (file name) in the bucket.
  It receives the request (`req`) and the file (`file`), and should return a string representing the key.
   */
  key?(req: Express.Request, file: Express.Multer.File): string;
  /** The name of the field used for the file upload. Defaults to 'file' if not specified. */
  fieldName?: string;
  /** Maximum number of files to process. Defaults to infinity if not specified. */
  maxCount?: number;
  /** The name of the IBM Cloud Object Storage bucket where files will be stored. */
  bucket: string;
  /** The endpoint URL for the IBM Cloud Object Storage. */
  endpoint: string;
  /** The API key for accessing IBM Cloud Object Storage. */
  apiKeyId: string;
  /** The service instance ID of the IBM Cloud Object Storage. */
  serviceInstanceId: string;
  /** The version of the signature to be used for authentication. Defaults to 'iam'. */
  signatureVersion?: string;
}

/** Represents an error related to storage parameters. */
interface StorageParamError {
  /** Name of the parameter that caused the error. */
  param: string;
  /** Error message for the param. */
  message: string;
}

/** Generates a random hexadecimal filename. */
const getFilename = (req: any, file: any, cb: any) => {
  crypto.randomBytes(16, (err, buf) => {
    if (!err) {
      cb(err, buf.toString("hex"));
    } else {
      cb(err, null);
    }
  });
};

/** Validate the required params */
const validateStorageParams = (params: StorageParams) => {
  let errors: StorageParamError[] = [];

  if (!params.endpoint) {
    errors.push({
      param: "endpoint",
      message: "Failed to upload file: endpoint cannot be empty.",
    });
  }

  if (!params.bucket)
    errors.push({
      param: "bucket",
      message: "Failed to upload file: bucket name cannot be empty.",
    });

  if (!params.apiKeyId)
    errors.push({
      param: "apiKeyId",
      message:
        "Failed to upload file: Failed to upload file: API KEY ID cannot be empty.",
    });

  if (!params.serviceInstanceId)
    errors.push({
      param: "serviceInstanceId",
      message: "Failed to upload file: Service Instance Id cannot be empty.",
    });

  if (errors.length > 0) {
    throw errors;
  }
};

class CosStorage implements StorageEngine {
  private cos: ibm.S3;
  private bucket;
  private getObjectKey: any;

  constructor(opts: StorageParams) {
    validateStorageParams(opts);

    this.bucket = opts.bucket;
    this.getObjectKey = opts.key || getFilename;
    /** Constructs a service object */
    this.cos = new ibm.S3({
      endpoint: opts.endpoint,
      apiKeyId: opts.apiKeyId,
      serviceInstanceId: opts.serviceInstanceId,
      signatureVersion: opts.signatureVersion,
    });
  }

  /**
   * Processes file uploads to IBM Cloud Object Storage, then invoke the callback with
   * information about the stored file.
   *
   * @param {Request} req - The Express request object.
   * @param {Express.Multer.File} file - The file object to be uploaded.
   * @param {Function} callback - Callback to be executed after upload. Returns error or file info.
   */
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, objectInfo?: Partial<File>) => void
  ) {
    let key = this.getObjectKey(req, file);
    let fileSize = 0;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.stream,
    };
    const upload = this.cos.upload(params);

    upload.on("httpUploadProgress", (event) => {
      if (event.total) fileSize = event.total;
    });

    upload
      .promise()
      .then((res) =>
        callback(null, {
          etag: res.ETag,
          location: res.Location,
          key: res.Key,
          bucket: res.Bucket,
          size: fileSize,
        })
      )
      .catch((err: unknown) => callback(err));
  }

  /**
   * Deletes a file from IBM Cloud Object Storage.
   *
   * This is called in the event that an error occurs
   */
  _removeFile(
    req: Request,
    file: File,
    callback: (error: Error | null) => void
  ): void {
    const params = {
      Bucket: file.bucket,
      Key: file.key,
    };

    this.cos.deleteObject(params, function (err, data) {
      if (!err) {
        callback(null);
      }
      // TODO: Handle the error
      callback(err);
    });
  }
}

/**
 * Initializes a Multer instance for multiple file uploads to IBM Cloud Object Storage (COS).
 *
 * @param {StorageParams} params - Configuration options for COS and Multer.
 * @returns A Multer instance configured for multiple file uploads.
 *
 * This function sets up Multer with a custom `CosStorage` engine for handling
 * uploads directly to a specified COS bucket.
 *
 * It includes an optional file filter (defined in `opts.fileFilter`) to validate file types.
 * You could pass a multer fileFilter function to the `opts.fileFilter` param.
 *
 * The field name is customizable through `opts.fieldName`. Defaults to 'files' if not specified.
 *
 * Example usage:
 * ```
 * app.post('/upload', cosMultipleUpload({...params}), (req, res) => {});
 * ```
 */
export const cosMultipleUpload = (params: StorageParams) => {
  validateStorageParams(params);
  return multer({
    fileFilter: params.fileFilter,
    storage: new CosStorage({
      bucket: params.bucket,
      key: params.key,
      endpoint: params.endpoint,
      apiKeyId: params.apiKeyId,
      serviceInstanceId: params.serviceInstanceId,
      signatureVersion: params.signatureVersion || "iam",
    }),
  }).array(params.fieldName || "files", params.maxCount);
};

/**
 * Initializes a Multer instance for single file uploads to IBM Cloud Object Storage (COS).
 *
 * @param {StorageParams} params - Configuration options for COS and Multer.
 * @returns A Multer instance for single file uploads.
 *
 * The function configures Multer with a custom `CosStorage` engine and optional file filtering.
 * You could pass a multer fileFilter function to the `opts.fileFilter`.
 *
 * The field name is customizable through `opts.fieldName`. Defaults to 'file' if not specified.
 *
 * Example usage:
 * ```
 * app.post('/upload', cosSingleUpload({...options}), (req, res) => {});
 * ```
 */
export const cosSingleUpload = (params: StorageParams) => {
  validateStorageParams(params);
  return multer({
    fileFilter: params.fileFilter,
    storage: new CosStorage({
      bucket: params.bucket,
      key: params.key,
      endpoint: params.endpoint,
      apiKeyId: params.apiKeyId,
      serviceInstanceId: params.serviceInstanceId,
      signatureVersion: params.signatureVersion || "iam",
    }),
  }).single(params.fieldName || "file");
};

export default (opts: StorageParams) => new CosStorage(opts);
