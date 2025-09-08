import { Response, NextFunction } from "express";
import sharp from "sharp";
import cloudinary from "../configs/cloudinary";
import { MediaType } from "@prisma/client"
import { CustomRequest, CloudinaryFile } from "../utils/types";
import { CLOUDINARY_FOLDER } from "../secrets";
import { MediaDocumentSchema } from "../validations/schemas/media.schema";
// Function to upload a file to Cloudinary
export const uploadDocsCloudinary = async (file: Express.Multer.File) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "auto", folder: "documents" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(file.buffer);
  });
};

export const uploadToCloudinary = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || undefined;

    if (!files || Object.keys(files).length === 0) {
      req.body.cloudinaryUrls = [];
      req.body.cloudinaryVideoUrls = [];
      req.body.cloudinaryDocumentUrls = [];
      req.body.cloudinaryAudioUrls = [];
      return next();
    }

    const allFiles: CloudinaryFile[] = Object.values(files).flat() as CloudinaryFile[];

    if (!allFiles || allFiles.length === 0) {
      return next(new Error("No files provided"));
    }

    // Initialize arrays for storing URLs
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];
    const documentUrls: string[] = [];
    const audioUrls: string[] = [];

    const uploadPromises = allFiles.map(async (file) => {
      let fileBuffer: Buffer = file.buffer;
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      const isDocument = file.mimetype.startsWith("application/"); // PDFs, DOCs, etc.
      const isAudio = file.mimetype.startsWith("audio/"); // Audio files (MP3, WAV, etc.)

      if (isImage) {
        // Resize the image before upload
        fileBuffer = await sharp(file.buffer)
          .resize({ width: 800, height: 600, fit: "inside" })
          .toBuffer();
      }

      return new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: isImage ? "image" : isVideo ? "video" : isDocument ? "raw" : isAudio ? "video" : "auto",
            folder: CLOUDINARY_FOLDER,
            format: isImage ? "webp" : undefined,
          } as any,
          (err, result) => {
            if (err) {
              console.error("Cloudinary upload error:", err);
              return reject(err);
            }
            if (!result) {
              console.error("Cloudinary upload error: Result is undefined");
              return reject(new Error("Cloudinary upload result is undefined"));
            }
            resolve(result.secure_url);
          }
        );
        uploadStream.end(fileBuffer);
      }).then((url) => {
        if (isImage) {
          imageUrls.push(url);
        } else if (isVideo) {
          videoUrls.push(url);
        } else if (isDocument) {
          documentUrls.push(url);
        } else if (isAudio) {
          audioUrls.push(url);
        }
      });
    });

    await Promise.all(uploadPromises);
    // Attach URLs to the request body
    req.body.cloudinaryUrls = imageUrls;
    req.body.cloudinaryVideoUrls = videoUrls;
    req.body.cloudinaryDocumentUrls = documentUrls;
    req.body.cloudinaryAudioUrls = audioUrls;

    next();
  } catch (error) {
    console.error("Error in uploadToCloudinary middleware:", error);
    next(error);
  }
};


export const handlePropertyUploads = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {

  try {

    // Parse JSON parts if present
    ['residential', 'commercial', 'shortlet', 'typeSpecific'].forEach((field) => {
      if (req.body[field]) {
        req.body[field] = JSON.parse(req.body[field]);
      }
    });
    const files: Express.Multer.File[] = Object.values(req.files || {}).flat();
    if (!files.length) return res.status(400).json({ error: "No files provided" });


    // Normalize arrays from req.body
    const documentNames = req.body.documentName
      ? (Array.isArray(req.body.documentName) ? req.body.documentName : [req.body.documentName])
      : [];

    const docTypes = req.body.docType
      ? (Array.isArray(req.body.docType) ? req.body.docType : [req.body.docType])
      : [];

    const idTypes = req.body.idType
      ? (Array.isArray(req.body.idType) ? req.body.idType : [req.body.idType])
      : [];

    // Count how many of the files are documents
    const documentFiles = files.filter(
      (f) => !f.mimetype.startsWith("image/") && !f.mimetype.startsWith("video/")
    );

    // Validate count match
    // if (documentNames.length && documentNames.length !== documentFiles.length) {
    //   return res.status(400).json({
    //     error: `Number of documentNames (${documentNames.length}) does not match number of document files (${documentFiles.length})`,
    //   });
    // }
    // Validate count match only when documentNames are provided
    if (documentNames && documentNames.length > 0 && documentNames.length !== documentFiles.length) {
      return res.status(400).json({
        error: `Number of documentNames (${documentNames.length}) does not match number of uploaded files (${files.length})`,
        details: {
          documentNamesCount: documentNames.length,
          filesCount: files.length,
          message: "Please provide names for all uploaded files or leave documentNames empty"
        }
      });
    }
    let documentIndex = 0;
    const uploadedFiles: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadResult: any = await uploadDocsCloudinary(file);

      if (!uploadResult.secure_url) {
        return res.status(500).json({ error: `Upload failed for file ${file.originalname}` });
      }


      // Check type and validate
      if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
        // MEDIA file
        uploadedFiles.push({
          type: file.mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
          url: uploadResult.secure_url,
          fileType: file.mimetype,
          identifier: "MediaTable",
          isPrimary: false,
          caption: file.originalname || "",
        });
      } else {
        // DOCUMENT file
        const commonMeta = {
          documentName: documentNames[documentIndex] || file.originalname,
          docType: docTypes[documentIndex],
          idType: idTypes[documentIndex],
          type: file.mimetype,
          size: String(file.size),
        };
        const { error } = MediaDocumentSchema.validate(commonMeta);
        if (error) {
          return res.status(400).json({
            error: `Invalid document metadata for ${file.originalname}: ${error.message}`,
          });
        }

        uploadedFiles.push({
          ...commonMeta,
          identifier: "DocTable",
          documentUrl: [uploadResult.secure_url],
        });
        documentIndex++;
      }
    }

    // Attach to req for controller use
    req.body.uploadedFiles = uploadedFiles;
    console.log("Uploaded files:", uploadedFiles);

    // Clean up extra fields to prevent Prisma errors
    delete req.body.documentName;
    delete req.body.docType;
    delete req.body.idType;
    next();
  } catch (err) {
    console.error("Upload middleware error:", err);
    res.status(500).json({ error: "Failed to process uploads" });
  }
};


export const uploadToCloudinaryGeneric = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const filesObj = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

    // Flatten all uploaded files
    const allFiles: Express.Multer.File[] = Object.values(filesObj).flat();

    if (!allFiles || allFiles.length === 0) {
      req.body.uploadedDocuments = [];
      return next();
    }

    const documentTypes: string[] = Array.isArray(req.body.documentTypes)
      ? req.body.documentTypes
      : [];

    const uploadedDocuments: { url: string; type: string }[] = [];

    const uploadPromises = allFiles.map(async (file, index) => {
      let fileBuffer: Buffer = file.buffer;

      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      const isDocument = file.mimetype.startsWith("application/");
      const isAudio = file.mimetype.startsWith("audio/");

      // Resize images before upload
      if (isImage) {
        fileBuffer = await sharp(file.buffer)
          .resize({ width: 800, height: 600, fit: "inside" })
          .toBuffer();
      }

      return new Promise<void>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: isImage
              ? "image"
              : isVideo
              ? "video"
              : isDocument
              ? "raw"
              : isAudio
              ? "video"
              : "auto",
            folder: CLOUDINARY_FOLDER,
            format: isImage ? "webp" : undefined,
          },
          (err, result) => {
            if (err || !result) {
              console.error("Cloudinary upload error:", err);
              return reject(err || new Error("Cloudinary result undefined"));
            }

            const docType = documentTypes[index] || "UNSPECIFIED";
            uploadedDocuments.push({ url: result.secure_url, type: docType });

            resolve();
          }
        );

        uploadStream.end(fileBuffer);
      });
    });

    await Promise.all(uploadPromises);

    // Attach uploaded docs to body
    req.body.uploadedDocuments = uploadedDocuments;

    next();
  } catch (error) {
    console.error("Error in uploadToCloudinary middleware:", error);
    next(error);
  }
};
