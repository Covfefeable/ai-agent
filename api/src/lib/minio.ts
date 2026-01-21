import * as Minio from 'minio';
import * as crypto from 'crypto';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
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
  return `/${BUCKET_NAME}/${objectName}`;
};

const FILE_URL_SIGN_SECRET = process.env.FILE_URL_SIGN_SECRET;
const FILE_URL_EXPIRES_IN = parseInt(process.env.FILE_URL_EXPIRES_IN || '3600');

export const generateFileSignature = (path: string, expires: number, filename?: string) => {
  if (!FILE_URL_SIGN_SECRET) return '';
  const data = filename ? `${path}:${expires}:${filename}` : `${path}:${expires}`;
  return crypto.createHmac('sha256', FILE_URL_SIGN_SECRET).update(data).digest('hex');
};

export const getPublicUrl = (path: string, filename?: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = process.env.API_PUBLIC_URL || process.env.API_URL;
  
  // console.log('DEBUG: getPublicUrl', { path, secret, expiresIn });

  let query = '';
  if (FILE_URL_SIGN_SECRET) {
    const expires = Math.floor(Date.now() / 1000) + FILE_URL_EXPIRES_IN;
    const sign = generateFileSignature(normalizedPath, expires, filename);
    query = `?sign=${sign}&expires=${expires}`;
    if (filename) {
        query += `&filename=${encodeURIComponent(filename)}`;
    }
  }
  
  if (apiUrl) {
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    return `${baseUrl}/files${normalizedPath}${query}`;
  }
  
  return `/files${normalizedPath}${query}`;
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

export const transformToProxyUrl = async (url: string | null): Promise<string | null> => {
    if (!url) return null;
    
    // Always extract path and regenerate URL to ensure signature is fresh
    const path = extractPathFromUrl(url);
    if (path) {
      return getPublicUrl(path);
    }
    
    return null;
};


// Helper to parse path into bucket and object name
const parsePath = (path: string) => {
  // Normalize path
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Split by first slash
  const parts = normalizedPath.split('/');
  
  // If first part matches our bucket name, treat it as bucket
  if (parts.length > 1 && parts[0] === BUCKET_NAME) {
    return {
      bucketName: parts[0],
      objectName: parts.slice(1).join('/')
    };
  }
  
  // Default to our bucket
  return {
    bucketName: BUCKET_NAME,
    objectName: normalizedPath
  };
};

export const deleteFile = async (path: string) => {
  const { bucketName, objectName } = parsePath(path);
  return minioClient.removeObject(bucketName, objectName);
};

export const deleteFiles = async (paths: string[]) => {
  if (paths.length === 0) return;
  // Group by bucket
  const filesByBucket: Record<string, string[]> = {};
  
  paths.forEach(path => {
    const { bucketName, objectName } = parsePath(path);
    if (!filesByBucket[bucketName]) {
      filesByBucket[bucketName] = [];
    }
    filesByBucket[bucketName].push(objectName);
  });

  // Execute deletes per bucket
  await Promise.all(
    Object.entries(filesByBucket).map(async ([bucket, objects]) => {
      try {
        await minioClient.removeObjects(bucket, objects);
      } catch (error) {
        console.error(`Error deleting files from bucket ${bucket}:`, error);
        throw error;
      }
    })
  );
};

export const deleteFolder = async (prefix: string) => {
  try {
     const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
     if (!bucketExists) return;

    const objectsList: string[] = [];
    const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true);
    
    for await (const obj of stream) {
      if (obj.name) {
        objectsList.push(obj.name);
      }
    }

    if (objectsList.length > 0) {
      await minioClient.removeObjects(BUCKET_NAME, objectsList);
    }
  } catch (error) {
    console.error('Error deleting folder from MinIO:', error);
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
          const path = urlObj.pathname; // /BUCKET_NAME/path/to/file or /files/BUCKET_NAME/path/to/file
          
          // Check for /files/ prefix
          const filesPrefix = `/files/${BUCKET_NAME}/`;
          if (path.startsWith(filesPrefix)) {
             return path.substring(filesPrefix.length);
          }

          const prefix = `/${BUCKET_NAME}/`;
          if (path.startsWith(prefix)) {
              return path.substring(prefix.length);
          }
      } else if (url.startsWith('/')) {
          // Remove query params if present
          const queryIndex = url.indexOf('?');
          const cleanUrl = queryIndex !== -1 ? url.substring(0, queryIndex) : url;

          // Check for /files/ prefix
          const filesPrefix = `/files/${BUCKET_NAME}/`;
          if (cleanUrl.startsWith(filesPrefix)) {
             return cleanUrl.substring(filesPrefix.length);
          }

          const prefix = `/${BUCKET_NAME}/`;
          if (cleanUrl.startsWith(prefix)) {
              return cleanUrl.substring(prefix.length);
          }
      }
  } catch (e) {
      console.warn('Failed to parse URL for deletion:', url);
  }
  return null;
};

export { minioClient, BUCKET_NAME };
