import { useState } from 'react';
import { API_URL } from '@/lib/config';

export interface UploadResult {
  success: boolean;
  fileName?: string;
  originalName?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  message?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    endpoint: string = '/uploads/single',
    additionalData: Record<string, string> = {}
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add any additional data
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      return result;
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      return { success: false, message: err.message };
    } finally {
      setUploading(false);
    }
  };

  const uploadProfilePicture = async (file: File, workerId?: string): Promise<UploadResult> => {
    return uploadFile(file, '/uploads/profile-picture', workerId ? { workerId } : {});
  };

  const uploadDocument = async (file: File, workerId?: string, documentId?: string): Promise<UploadResult> => {
    const additionalData: Record<string, string> = {};
    if (workerId) additionalData.workerId = workerId;
    if (documentId) additionalData.documentId = documentId;
    return uploadFile(file, '/uploads/document', additionalData);
  };

  const deleteFile = async (fileName: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_URL}/uploads/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    uploadFile,
    uploadProfilePicture,
    uploadDocument,
    deleteFile,
    uploading,
    progress,
    error,
    setError,
  };
}

// Helper to check if a file is an image
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

// Helper to check file size
export function isFileSizeValid(file: File, maxSizeMB: number = 10): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

// Helper to get file extension
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

// File type icons
export const fileTypeIcons: Record<string, string> = {
  pdf: '📕',
  doc: '📘',
  docx: '📘',
  xls: '📗',
  xlsx: '📗',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  webp: '🖼️',
  default: '📄'
};

export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);
  return fileTypeIcons[ext] || fileTypeIcons.default;
}


