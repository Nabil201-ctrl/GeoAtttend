import { getDistance } from 'geolib';

// Calculate distance between two points in meters
export function calculateDistance(lat1, lon1, lat2, lon2) {
  try {
    const distance = getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 },
      1 // Accuracy in meters
    );
    console.log(`Calculated distance: ${distance}m between (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);
    return distance;
  } catch (error) {
    console.error('Distance calculation error:', error);
    throw new Error('Invalid coordinates for distance calculation');
  }
}