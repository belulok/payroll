const { Service } = require('feathers-mongoose');
const { BadRequest, NotFound } = require('@feathersjs/errors');

exports.QRCodes = class QRCodes extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company is set
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin' || params.user.role === 'subcon-clerk') {
        data.company = params.user.company;
      }
    }

    // Validate coordinates if provided
    if (data.coordinates) {
      if (typeof data.coordinates.lat !== 'number' || typeof data.coordinates.lng !== 'number') {
        throw new BadRequest('Invalid coordinates. Both lat and lng must be numbers.');
      }
    }

    // If rotation is enabled, store the base code
    if (data.rotation?.enabled) {
      data.rotation.baseCode = data.qrCode;
      data.rotation.lastRotated = new Date();
    }

    return super.create(data, params);
  }

  async get(id, params) {
    const result = await super.get(id, params);

    // Check if QR code needs rotation
    if (result.rotation?.enabled) {
      const rotatedQR = await this.checkAndRotateQR(result);
      if (rotatedQR) {
        return rotatedQR;
      }
    }

    return result;
  }

  async find(params) {
    const results = await super.find(params);

    // Check and rotate QR codes if needed
    const data = results.data || results;
    for (let i = 0; i < data.length; i++) {
      if (data[i].rotation?.enabled) {
        const rotatedQR = await this.checkAndRotateQR(data[i]);
        if (rotatedQR) {
          data[i] = rotatedQR;
        }
      }
    }

    return results;
  }

  // Check if QR code needs rotation and rotate if necessary
  async checkAndRotateQR(qrCode) {
    if (!qrCode.rotation?.enabled || !qrCode.rotation?.lastRotated) {
      return null;
    }

    const intervalMs = this.getIntervalMs(qrCode.rotation.interval);
    const lastRotated = new Date(qrCode.rotation.lastRotated);
    const now = new Date();

    if (now - lastRotated >= intervalMs) {
      // Generate new rotating suffix
      const newSuffix = this.generateRotatingSuffix();
      const baseCode = qrCode.rotation.baseCode || qrCode.qrCode.split('-ROT-')[0];
      const newQRCode = `${baseCode}-ROT-${newSuffix}`;

      // Update in database
      const updated = await super.patch(qrCode._id, {
        qrCode: newQRCode,
        'rotation.lastRotated': now
      }, { provider: undefined });

      return updated;
    }

    return null;
  }

  // Generate a rotating suffix based on timestamp
  generateRotatingSuffix() {
    return Date.now().toString(36).toUpperCase() +
           Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Convert interval string to milliseconds
  getIntervalMs(interval) {
    const intervals = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '3hours': 3 * 60 * 60 * 1000,
      '12hours': 12 * 60 * 60 * 1000,
      '24hours': 24 * 60 * 60 * 1000
    };
    return intervals[interval] || intervals['1hour'];
  }

  // Custom method to validate check-in location
  async validateCheckIn(qrCodeString, userLocation, params) {
    const QRCodeModel = this.Model;

    // Find the QR code - check both exact match and base code for rotating QR codes
    let qrCode = await QRCodeModel.findOne({ qrCode: qrCodeString });

    // If not found, check if it's a rotating QR code by checking the base code
    if (!qrCode && qrCodeString.includes('-ROT-')) {
      const baseCode = qrCodeString.split('-ROT-')[0];
      qrCode = await QRCodeModel.findOne({
        $or: [
          { 'rotation.baseCode': baseCode },
          { qrCode: { $regex: `^${baseCode}` } }
        ]
      });

      // Verify the rotating QR code is current (within the interval)
      if (qrCode && qrCode.rotation?.enabled) {
        const intervalMs = this.getIntervalMs(qrCode.rotation.interval);
        const lastRotated = new Date(qrCode.rotation.lastRotated);
        const now = new Date();

        // If the scanned QR is not the current one, reject it
        if (qrCode.qrCode !== qrCodeString && (now - lastRotated) < intervalMs) {
          throw new BadRequest('This QR code has expired. Please scan the current QR code.');
        }
      }
    }

    if (!qrCode) {
      throw new NotFound('QR Code not found');
    }

    if (!qrCode.isActive) {
      throw new BadRequest('QR Code is not active');
    }

    // Check validity period if set
    const now = new Date();
    if (qrCode.settings?.validFrom && new Date(qrCode.settings.validFrom) > now) {
      throw new BadRequest('QR Code is not yet valid');
    }
    if (qrCode.settings?.validUntil && new Date(qrCode.settings.validUntil) < now) {
      throw new BadRequest('QR Code has expired');
    }

    // If coordinates are set and location is required, validate distance
    if (qrCode.coordinates?.lat && qrCode.coordinates?.lng) {
      const requireLocation = qrCode.settings?.requireLocation !== false;

      if (requireLocation) {
        if (!userLocation || typeof userLocation.lat !== 'number' || typeof userLocation.lng !== 'number') {
          throw new BadRequest('Your location is required for check-in with this QR code');
        }

        const distance = this.calculateDistance(
          qrCode.coordinates.lat,
          qrCode.coordinates.lng,
          userLocation.lat,
          userLocation.lng
        );

        const allowedRadius = qrCode.allowedRadius || 100;

        if (distance > allowedRadius) {
          throw new BadRequest(
            `You are too far from the check-in location. ` +
            `Distance: ${Math.round(distance)}m, Allowed radius: ${allowedRadius}m. ` +
            `Please move closer to the designated check-in area.`
          );
        }
      }
    }

    // Update usage count
    await QRCodeModel.findByIdAndUpdate(qrCode._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date()
    });

    return {
      valid: true,
      qrCode: {
        _id: qrCode._id,
        name: qrCode.name,
        location: qrCode.location,
        department: qrCode.department
      }
    };
  }

  // Haversine formula to calculate distance between two coordinates
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }
};

