const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // QR Code Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },

  // Location Info
  location: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },

  // Geo-fencing coordinates
  coordinates: {
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  },

  // Allowed check-in radius in meters
  allowedRadius: {
    type: Number,
    default: 100, // Default 100 meters
    min: 10,
    max: 5000
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },

  // Additional settings
  settings: {
    requireLocation: {
      type: Boolean,
      default: true // By default, require location for check-in
    },
    allowMultipleCheckIns: {
      type: Boolean,
      default: false
    },
    validFrom: Date,
    validUntil: Date
  },

  // QR Code rotation settings
  rotation: {
    enabled: {
      type: Boolean,
      default: false
    },
    interval: {
      type: String,
      enum: ['5min', '15min', '1hour', '3hours', '12hours', '24hours'],
      default: '1hour'
    },
    lastRotated: {
      type: Date
    },
    // Store the base QR code (static part) and rotating suffix
    baseCode: {
      type: String
    }
  }

}, {
  timestamps: true
});

// Indexes
qrCodeSchema.index({ company: 1, qrCode: 1 });
qrCodeSchema.index({ qrCode: 1 }, { unique: true });
qrCodeSchema.index({ company: 1, isActive: 1 });

// Static method to validate check-in location
qrCodeSchema.statics.validateCheckInLocation = function(qrCodeId, userLat, userLng) {
  return this.findById(qrCodeId).then(qrCode => {
    if (!qrCode) {
      return { valid: false, error: 'QR Code not found' };
    }

    if (!qrCode.isActive) {
      return { valid: false, error: 'QR Code is not active' };
    }

    // If no coordinates set, allow check-in
    if (!qrCode.coordinates || !qrCode.coordinates.lat || !qrCode.coordinates.lng) {
      return { valid: true, qrCode };
    }

    // If location not required, allow check-in
    if (qrCode.settings && !qrCode.settings.requireLocation) {
      return { valid: true, qrCode };
    }

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      qrCode.coordinates.lat,
      qrCode.coordinates.lng,
      userLat,
      userLng
    );

    const allowedRadius = qrCode.allowedRadius || 100;

    if (distance <= allowedRadius) {
      return { valid: true, qrCode, distance };
    } else {
      return {
        valid: false,
        error: `You are too far from the check-in location. Distance: ${Math.round(distance)}m, Allowed: ${allowedRadius}m`,
        distance,
        allowedRadius
      };
    }
  });
};

// Static method to find by QR code string
qrCodeSchema.statics.findByQRCode = function(qrCodeString, companyId) {
  const query = { qrCode: qrCodeString };
  if (companyId) {
    query.company = companyId;
  }
  return this.findOne(query);
};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

const QRCode = mongoose.model('qr-codes', qrCodeSchema);

module.exports = QRCode;

