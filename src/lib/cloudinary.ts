import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

export class CloudinaryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryConfigurationError";
  }
}

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

export interface UploadedImage {
  public_id: string;
  secure_url: string;
}

let configured = false;

function configureCloudinary(): void {
  if (configured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigurationError(
      "Missing Cloudinary environment variables."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

export async function uploadImage(
  buffer: Buffer,
  eventId: string
): Promise<UploadedImage> {
  configureCloudinary();

  return await new Promise<UploadedImage>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `events/${eventId}/`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(new CloudinaryUploadError(error.message));
          return;
        }

        if (!result) {
          reject(
            new CloudinaryUploadError("Cloudinary upload returned no result.")
          );
          return;
        }

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
        });
      }
    );

    Readable.from([buffer]).on("error", reject).pipe(uploadStream);
  });
}