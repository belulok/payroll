import { useState, useEffect } from 'react';
import React from 'react';
import { API_URL } from '@/lib/config';

const BACKEND_URL = API_URL;

// Cache for signed URLs to avoid excessive requests
const signedUrlCache: Map<string, { url: string; expiresAt: number }> = new Map();

/**
 * Hook to get a signed URL for a file
 * Handles GCS paths, local paths, and already-signed URLs
 */
export function useSignedUrl(filePath: string | undefined | null): {
  url: string | null;
  loading: boolean;
  error: string | null;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setUrl(null);
      return;
    }

    // If it's already a full URL (http/https), use it directly
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Check if it's a signed URL that might be expired (contains X-Goog-Signature)
      if (filePath.includes('X-Goog-Signature')) {
        // This is a signed URL - check if we have a fresh one cached
        const cached = signedUrlCache.get(filePath);
        if (cached && cached.expiresAt > Date.now()) {
          setUrl(cached.url);
          return;
        }
        // Signed URL might be expired, but we don't have the original path
        // Just use it and hope it works
        setUrl(filePath);
        return;
      }
      setUrl(filePath);
      return;
    }

    // If it's a GCS URI (gcs://bucket/path), extract the path and get signed URL
    if (filePath.startsWith('gcs://')) {
      const gcsPath = filePath.replace(/^gcs:\/\/[^/]+\//, '');
      fetchSignedUrl(gcsPath);
      return;
    }

    // If it's a relative path starting with /, it's a local file
    if (filePath.startsWith('/uploads/')) {
      setUrl(`${BACKEND_URL}${filePath}`);
      return;
    }

    // If it's just a file path (e.g., profile-pictures/xxx/file.png), get signed URL
    fetchSignedUrl(filePath);

    async function fetchSignedUrl(path: string) {
      // Check cache first
      const cached = signedUrlCache.get(path);
      if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) { // 5 min buffer
        setUrl(cached.url);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${BACKEND_URL}/uploads/signed-url/${encodeURIComponent(path)}?expiresIn=60`
        );

        if (!response.ok) {
          throw new Error('Failed to get signed URL');
        }

        const data = await response.json();

        // Cache the signed URL
        if (data.expiresAt) {
          signedUrlCache.set(path, {
            url: data.url,
            expiresAt: new Date(data.expiresAt).getTime()
          });
        }

        setUrl(data.url);
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        // Fallback to direct URL attempt
        setUrl(`${BACKEND_URL}/uploads/${path}`);
      } finally {
        setLoading(false);
      }
    }
  }, [filePath]);

  return { url, loading, error };
}

/**
 * Extract the file path from a GCS signed URL
 */
function extractPathFromSignedUrl(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    // GCS URL format: https://storage.googleapis.com/bucket-name/path/to/file.ext
    const pathMatch = url.pathname.match(/^\/[^/]+\/(.+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Component wrapper for images that need signed URLs
 */
export function SignedImage({
  src,
  alt,
  className,
  fallback,
  ...props
}: {
  src: string | undefined | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [imageError, setImageError] = useState(false);
  const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
  const { url, loading } = useSignedUrl(src);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setRefreshedUrl(null);
  }, [src]);

  // Function to refresh a signed URL
  const refreshSignedUrl = async (originalSrc: string) => {
    // Try to extract the file path from the signed URL
    const filePath = extractPathFromSignedUrl(originalSrc);
    if (filePath) {
      try {
        const response = await fetch(
          `${BACKEND_URL}/uploads/signed-url/${encodeURIComponent(filePath)}?expiresIn=60`
        );
        if (response.ok) {
          const data = await response.json();
          setRefreshedUrl(data.url);
          setImageError(false);
          return;
        }
      } catch (err) {
        console.error('Failed to refresh signed URL:', err);
      }
    }
    setImageError(true);
  };

  if (!src || (!url && !loading && !refreshedUrl)) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className}`} />
    );
  }

  // If image failed to load and we don't have a refreshed URL, show fallback
  if (imageError && !refreshedUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  const finalUrl = refreshedUrl || url;

  return (
    <img
      src={finalUrl || undefined}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Image failed to load:', finalUrl);
        // If this is the first error and it looks like an expired signed URL, try to refresh
        if (!imageError && src && src.includes('storage.googleapis.com')) {
          refreshSignedUrl(src);
        } else {
          setImageError(true);
        }
      }}
      {...props}
    />
  );
}

export default useSignedUrl;

