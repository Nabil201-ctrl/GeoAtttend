const mongoose = require('mongoose');

// Geofence schema: Stores data about geofences, including location, radius, and the time when they are active.
const geofenceSchema = new mongoose.Schema({
  // Reference to the class for which this geofence applies
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },

  // Geospatial location data: The location is stored as a point (longitude, latitude)
  location: {
    type: { type: String, enum: ['Point'], required: true }, // Type should be 'Point' for geospatial data
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },

  // Radius in meters (how far from the center point the geofence extends)
  radius: { type: Number, required: true },

  // Start and end times for when the geofence is active
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  // QR code related to this geofence (stored as a URL or QR code data)
  qrCode: { type: String, required: true },

  // Automatically set the creation date for the geofence
  createdAt: { type: Date, default: Date.now },
});

// Create a 2D geospatial index for the location field to enable geospatial queries
geofenceSchema.index({ location: '2dsphere' }); // This index allows us to query based on the geospatial location (longitude, latitude)

// Create a model for Geofence and export it
const Geofence = mongoose.model('Geofence', geofenceSchema);
module.exports = Geofence;
