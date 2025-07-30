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



// Example form data usage
// formData.append("name", "My Property");
// formData.append("location", "Lagos");

// formData.append("documentName", "Passport");
// formData.append("docType", "ID");
// formData.append("idType", "PASSPORT");

// formData.append("documentName", "Tax File");
// formData.append("docType", "TAX_RETURN");
// formData.append("idType", ""); // Leave blank if not ID

// formData.append("files", file1);
// formData.append("files", file2);


export const handlePropertyUploads = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {

  if (req.body.residential) {
    req.body.residential = JSON.parse(req.body.residential);
  }
  if (req.body.commercial) {
    req.body.commercial = JSON.parse(req.body.commercial);
  }
  if (req.body.shortlet) {
    req.body.shortlet = JSON.parse(req.body.shortlet);
  }
  if (req.body.typeSpecific) {
    req.body.typeSpecific = JSON.parse(req.body.typeSpecific);
  }
  try {
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

    const uploadedFiles: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadResult: any = await uploadDocsCloudinary(file);

      if (!uploadResult.secure_url) {
        return res.status(500).json({ error: `Upload failed for file ${file.originalname}` });
      }

      const commonMeta = {
        documentName: documentNames[i] || file.originalname,
        docType: docTypes[i],
        idType: idTypes[i],
        type: file.mimetype,
        size: file.size,
        // url: uploadResult.secure_url
      };

      // Check type and validate
      if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
        // MEDIA file
        uploadedFiles.push({
          type: file.mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
          url: uploadResult.secure_url,
          fileType: file.mimetype,
          identifier: "MediaTable",
          isPrimary: false,
          caption: documentNames[i] || "",
        });
      } else {
        // DOCUMENT file
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
      }
    }

    // Attach to req for controller use
    req.body.uploadedFiles = uploadedFiles;
    console.log("Uploaded files:", uploadedFiles);
    next();
  } catch (err) {
    console.error("Upload middleware error:", err);
    res.status(500).json({ error: "Failed to process uploads" });
  }
};
