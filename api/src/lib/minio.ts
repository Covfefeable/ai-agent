import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'super-agent';

// Ensure bucket exists on startup (optional, or just handle in upload)
// Note: In production, bucket creation usually happens via IaC or init scripts
// We'll just export the client and helper functions

export const uploadBuffer = async (
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> => {
  const metaData = {
    'Content-Type': contentType,
  };

  // Check if bucket exists, if not create it (safe check)
  const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
  if (!bucketExists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1'); // Region is required but often ignored for standalone MinIO
  }

  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, metaData);

  // Return the path or URL
  // If we want to return a directly accessible URL, we might need to construct it
  // For now, let's return the relative path in the bucket, 
  // and we can have a helper to get the full URL if needed.
  // Or, if the bucket is public, we can construct the URL.
  
  // Constructing public URL (assuming standard MinIO path style)
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
  const host = process.env.MINIO_ENDPOINT;
  
  // NOTE: If MINIO_ENDPOINT is 'minio' (docker internal), returning this URL to frontend won't work.
  // Ideally, we return the object path, and the API has an endpoint to proxy it, 
  // OR we configure a separate MINIO_PUBLIC_ENDPOINT env var.
  // For simplicity in this task, I'll return the object path, 
  // BUT the user request implies "replacing base64 with minio storage".
  // If I just return "avatars/xyz.png", the frontend needs to know how to fetch it.
  // Let's assume we return a full URL if possible, or relative path if we expect frontend to use a proxy.
  // Given the "localhost" default, let's return a relative URL that the frontend can prepend base URL to, 
  // or just the full URL if it's localhost.
  
  return `/${BUCKET_NAME}/${objectName}`;
};

export const getPublicUrl = (path: string) => {
  const publicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
  const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
  // path starts with /BUCKET_NAME/...
  return `${baseUrl}${path}`;
};

export const uploadBase64 = async (base64Data: string, pathPrefix: string): Promise<string | null> => {
  if (!base64Data || !base64Data.startsWith('data:image')) return null;
  
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        const ext = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${pathPrefix}.${ext}`;
        const path = await uploadBuffer(buffer, filename, `image/${ext}`);
        return getPublicUrl(path);
    }
  } catch (e) {
      console.error('Upload base64 failed', e);
  }
  return null;
};

export const getFileUrl = async (objectName: string): Promise<string> => {
    // Generate a presigned URL (valid for 7 days usually max, but here maybe 1 hour)
    // or just return public URL if bucket is public.
    // For avatars, usually we want public read access.
    // Assuming the bucket policy allows public read (we might need to set that).
    
    // For now, let's just return the path we stored.
    return `/${BUCKET_NAME}/${objectName}`;
}

export const deleteFile = async (objectName: string) => {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
    console.log(`Deleted file: ${objectName}`);
  } catch (err) {
    console.error(`Failed to delete file: ${objectName}`, err);
  }
};

export const extractPathFromUrl = (url: string): string | null => {
  if (!url) return null;
  // url format: http://domain:port/BUCKET_NAME/path/to/file
  // or /BUCKET_NAME/path/to/file
  
  try {
      // If it's a full URL
      if (url.startsWith('http')) {
          const urlObj = new URL(url);
          const path = urlObj.pathname; // /BUCKET_NAME/path/to/file
          const prefix = `/${BUCKET_NAME}/`;
          if (path.startsWith(prefix)) {
              return path.substring(prefix.length);
          }
      } else if (url.startsWith('/')) {
          const prefix = `/${BUCKET_NAME}/`;
          if (url.startsWith(prefix)) {
              return url.substring(prefix.length);
          }
      }
  } catch (e) {
      console.warn('Failed to parse URL for deletion:', url);
  }
  return null;
};

export { minioClient, BUCKET_NAME };
