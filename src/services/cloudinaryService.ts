import { CloudinaryImage } from "./productService";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validates file type and size. Returns error string if invalid, or null if valid.
 */
export const validateImageFile = (file: File): string | null => {
  if (!file) return "No file provided.";
  const type = file.type?.toLowerCase();
  if (!type || !ALLOWED_MIME_TYPES.includes(type)) {
    return `Invalid image format (${file.type || "unknown"}). Allowed formats: JPG, PNG, WEBP.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return `File size (${sizeMb} MB) exceeds maximum allowed size of 5 MB.`;
  }
  return null;
};

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

/**
 * Fetches signed upload credentials from our secure server API endpoint.
 */
export const getSignedUploadParams = async (
  idToken: string,
  folder: string = "street-mode/products"
): Promise<UploadSignatureResponse> => {
  const res = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ folder }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to sign upload request (Status: ${res.status})`);
  }

  return await res.json();
};

/**
 * Performs direct client-to-Cloudinary signed upload using XMLHttpRequest to track 0-100% progress.
 */
export const uploadToCloudinary = async (
  file: File,
  idToken: string,
  onProgress?: (progress: number) => void,
  folder: string = "street-mode/products"
): Promise<CloudinaryImage> => {
  // 1. Validate file
  const valError = validateImageFile(file);
  if (valError) {
    throw new Error(valError);
  }

  // 2. Obtain signature from server
  const params = await getSignedUploadParams(idToken, folder);
  const { signature, timestamp, cloudName, apiKey, folder: targetFolder } = params;

  // 3. Prepare FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  console.log(`[CloudinaryService] Uploading "${file.name}" to Cloudinary folder "${folder}"...`);

  // 4. Send upload request with XHR progress monitoring
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          console.log(`[CloudinaryService] Upload succeeded for "${file.name}". Public ID: "${res.public_id}"`);
          resolve({
            url: res.secure_url,
            publicId: res.public_id,
          });
        } catch (err) {
          reject(new Error("Failed to parse Cloudinary upload response."));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          console.error(`[CloudinaryService] Upload error:`, errRes);
          reject(new Error(errRes.error?.message || `Cloudinary upload failed (Status: ${xhr.status})`));
        } catch {
          reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during Cloudinary image upload."));
    };

    xhr.send(formData);
  });
};

/**
 * Deletes a Cloudinary image asset by publicId via our server endpoint.
 */
export const deleteCloudinaryAsset = async (publicId: string, idToken: string): Promise<void> => {
  if (!publicId) return;
  try {
    const res = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ publicId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn(`[CloudinaryService] Asset deletion failed for "${publicId}":`, data.error);
    } else {
      console.log(`[CloudinaryService] Successfully deleted asset "${publicId}" from Cloudinary.`);
    }
  } catch (err) {
    console.error(`[CloudinaryService] Failed to delete Cloudinary asset (${publicId}):`, err);
  }
};

/**
 * Cleanup helper for multiple uploaded Cloudinary images if document publication fails.
 */
export const cleanupCloudinaryAssets = async (
  items: Array<{ publicId?: string }>,
  idToken: string
): Promise<void> => {
  const publicIds = items.map((i) => i.publicId).filter(Boolean) as string[];
  if (publicIds.length === 0) return;

  console.log(`[CloudinaryService] Cleaning up ${publicIds.length} uploaded assets...`);
  await Promise.allSettled(publicIds.map((id) => deleteCloudinaryAsset(id, idToken)));
  console.log("[CloudinaryService] Asset cleanup completed.");
};
