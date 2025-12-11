const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Check if we have GCS credentials
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'payroll_bucket_sarawak';
let storage, bucket;

// Local upload directory
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../../uploads');

// Try to configure GCS
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credentialsPath) {
  try {
    // Resolve relative path if needed
    const resolvedPath = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.join(__dirname, '../../../', credentialsPath);

    // Check if credentials file exists
    if (fs.existsSync(resolvedPath)) {
      // Configure Google Cloud Storage with explicit keyFilename
      storage = new Storage({ keyFilename: resolvedPath });
      bucket = storage.bucket(BUCKET_NAME);
      console.log('✅ GCS configured with bucket:', BUCKET_NAME);
      console.log('   Using credentials:', resolvedPath);
    } else {
      console.warn('⚠️ GCS credentials file not found:', resolvedPath);
      console.warn('   Using local storage instead');
    }
  } catch (err) {
    console.warn('⚠️ GCS not configured, using local storage. Error:', err.message);
  }
} else {
  console.log('ℹ️ No GCS credentials configured, using local storage');
}

// Ensure local upload directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Generate unique filename
function generateFileName(originalName, folder = '') {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const sanitizedName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);

  const fileName = `${sanitizedName}_${timestamp}_${randomStr}${ext}`;
  return folder ? `${folder}/${fileName}` : fileName;
}

// Upload file to local storage
async function uploadToLocal(file, folder = 'uploads') {
  const fileName = generateFileName(file.originalname, folder);
  const folderPath = path.join(LOCAL_UPLOAD_DIR, folder);

  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);

  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);

  // Return absolute URL to backend server
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3030';
  const localUrl = `${backendUrl}/uploads/${fileName}`;

  console.log('📁 File saved locally:', filePath);

  return {
    fileName,
    originalName: file.originalname,
    url: localUrl,
    mimeType: file.mimetype,
    size: file.size,
    storage: 'local'
  };
}

// Generate signed URL for GCS file
async function generateSignedUrl(fileName, expiresInMinutes = 60) {
  if (!bucket) {
    throw new Error('GCS not configured');
  }

  const [signedUrl] = await bucket.file(fileName).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000
  });

  return signedUrl;
}

// Upload file to Google Cloud Storage (returns file path, not URL)
async function uploadToGCS(file, folder = 'uploads') {
  // Fall back to local if GCS not configured
  if (!bucket) {
    console.log('⚠️ GCS not configured, using local storage');
    return uploadToLocal(file, folder);
  }

  return new Promise((resolve, reject) => {
    const fileName = generateFileName(file.originalname, folder);
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname
        }
      }
    });

    blobStream.on('error', (err) => {
      console.error('GCS Upload error:', err.message);
      // Fall back to local storage on GCS error
      console.log('⚠️ Falling back to local storage');
      uploadToLocal(file, folder).then(resolve).catch(reject);
    });

    blobStream.on('finish', async () => {
      console.log('✅ File uploaded to GCS:', fileName);

      // Generate a signed URL for immediate use
      try {
        const signedUrl = await generateSignedUrl(fileName, 60); // 1 hour
        resolve({
          fileName,
          originalName: file.originalname,
          url: signedUrl,
          gcsPath: fileName, // Store the GCS path for future signed URL generation
          mimeType: file.mimetype,
          size: file.size,
          storage: 'gcs'
        });
      } catch (err) {
        console.error('Error generating signed URL:', err);
        // Return path-based reference that can be used later
        resolve({
          fileName,
          originalName: file.originalname,
          url: `gcs://${BUCKET_NAME}/${fileName}`, // GCS URI for reference
          gcsPath: fileName,
          mimeType: file.mimetype,
          size: file.size,
          storage: 'gcs'
        });
      }
    });

    blobStream.end(file.buffer);
  });
}

// Delete file from Google Cloud Storage
async function deleteFromGCS(fileName) {
  if (!bucket) {
    // Try to delete from local storage
    const localPath = path.join(LOCAL_UPLOAD_DIR, fileName);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return { success: true, message: 'File deleted from local storage' };
    }
    throw new Error('File not found');
  }

  try {
    await bucket.file(fileName).delete();
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

module.exports = function (app) {
  // Get signed URL endpoint - generates fresh signed URL for a file
  app.get('/uploads/signed-url/:fileName(*)', async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const expiresIn = parseInt(req.query.expiresIn) || 60; // Default 60 minutes

      if (!bucket) {
        // If using local storage, return the local URL
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3030';
        return res.json({
          url: `${backendUrl}/uploads/${fileName}`,
          expiresAt: null,
          storage: 'local'
        });
      }

      const signedUrl = await generateSignedUrl(fileName, expiresIn);
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000).toISOString();

      res.json({
        url: signedUrl,
        expiresAt,
        storage: 'gcs'
      });
    } catch (error) {
      console.error('Signed URL error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate signed URL'
      });
    }
  });

  // Single file upload endpoint
  app.post('/uploads/single', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const folder = req.body.folder || 'uploads';
      const result = await uploadToGCS(req.file, folder);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Profile picture upload endpoint
  app.post('/uploads/profile-picture', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      // Validate it's an image
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed for profile pictures' });
      }

      const workerId = req.body.workerId;
      const folder = workerId ? `profile-pictures/${workerId}` : 'profile-pictures';
      const result = await uploadToGCS(req.file, folder);

      // If workerId is provided, update the worker record
      // Store gcsPath for signed URL generation, and url for immediate display
      if (workerId) {
        try {
          await app.service('workers').patch(workerId, {
            profilePicture: result.url,
            profilePictureFileName: result.fileName,
            profilePictureGcsPath: result.gcsPath || result.fileName // For signed URL generation
          });
        } catch (err) {
          console.error('Error updating worker profile picture:', err);
        }
      }

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Document upload endpoint
  app.post('/uploads/document', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const workerId = req.body.workerId;
      const documentId = req.body.documentId;
      const folder = workerId ? `documents/${workerId}` : 'documents';
      const result = await uploadToGCS(req.file, folder);

      // If documentId is provided, update the document record
      if (documentId) {
        try {
          await app.service('worker-documents').patch(documentId, {
            fileUrl: result.url,
            fileName: result.fileName,
            fileGcsPath: result.gcsPath || result.fileName
          });
        } catch (err) {
          console.error('Error updating document file:', err);
        }
      }

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Multiple files upload endpoint
  app.post('/uploads/multiple', upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }

      const folder = req.body.folder || 'uploads';
      const results = await Promise.all(
        req.files.map(file => uploadToGCS(file, folder))
      );

      res.json({
        success: true,
        files: results
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Delete file endpoint
  app.delete('/uploads/:fileName(*)', async (req, res) => {
    try {
      const result = await deleteFromGCS(req.params.fileName);
      res.json(result);
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Delete failed'
      });
    }
  });

  // Serve static files from local uploads directory (fallback)
  const express = require('express');
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

  if (bucket) {
    console.log('📁 File upload service configured with GCS bucket:', BUCKET_NAME);
    console.log('   Using signed URLs for secure access');
  } else {
    console.log('📁 File upload service configured with LOCAL storage:', LOCAL_UPLOAD_DIR);
  }
};
