import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors'; // Import CORS middleware
import geolib from 'geolib';
import ngrok from '@ngrok/ngrok';

let geofenceData = {};

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.static('public'));

/* Uncomment if MongoDB is used
const run = async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/student');
    console.log('Connected to MongoDB');
};
run().catch((err) => {
    console.log(err);
});
*/


// Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.post('/attendance', (req, res) => {
    const attendanceData = req.body; // Get the data sent from the client
    console.log("Received attendance data:", attendanceData);

    // Handle the data (e.g., save it to the database or process it)
    res.json({
        message: "Attendance data received successfully",
        receivedData: attendanceData,
    });
});

app.post('/location', (req, res) => {
    const geoData = req.body;
    geofenceData = geoData;
    console.log("Geofence data received:", geoData);
    res.json({
        message: "Geofence data received successfully",
        receivedData: geoData.userType,
    });
});

app.post('/login', (req, res) => {
    const user = req.body.username;
    const pass = req.body.password;
    console.log("Login attempt:", { user, pass });
    res.redirect('/dashboard');
});








/////////////////////////////////////// Geofencing /////////////////////////////////////




// Geofence Service Class
class GeofenceService {
  constructor(center, radius, endTime) {
    this.center = center; // Geofence center (latitude, longitude)
    this.radius = radius; // Radius in meters
    this.endTime = endTime; // Time when geofence will close
    this.devicesInside = []; // Array to track devices (students) inside the geofence
  }

  // To check if a point is inside the geofence
  isPointInside(point) {
    return geolib.isPointInCircle(point, this.center, this.radius);
  }

  // To add a device to the geofence (marks attendance)
  markAttendance(deviceId, location) {
    const currentTime = new Date();
    if (currentTime > this.endTime) {
      console.log("Geofence closed. Attendance not allowed.");
      return false;
    }

    // Check if the device is within the geofence
    if (this.isPointInside(location)) {
      // Check if the device is already inside (attendance already marked)
      if (!this.devicesInside.includes(deviceId)) {
        this.devicesInside.push(deviceId); // Add device to the list
        console.log("Attendance marked for device:", deviceId);
        return true
      } else {
        console.log("Attendance already marked for this device.");
        return false;
      }
    } else {
      console.log("Device is outside the geofence.");
      return false;
    }
  }

  // To get the number of devices inside the geofence
  getDevicesInside() {
    return this.devicesInside.length;
  };
}

// Define geofence parameters based on data from the server
const geofenceCenter = {
  latitude: geofenceData.latitude || 0,
  longitude: geofenceData.longitude || 0,
};
const radiusInMeters = geofenceData.radius || 1000; // Default radius is 1 km
const endTime = new Date(); // Set geofence end time (e.g., 5 minutes from now)
endTime.setMinutes(endTime.getMinutes() + 5); // Geofence active for 5 minutes

// Create a GeofenceService instance
const geofence = new GeofenceService(geofenceCenter, radiusInMeters, endTime);

// Simulate marking attendance for devices
if (geofenceData.userType === "Undergradute") {
  const device = {
    id: "device1", // Device ID
    location: {
      latitude: geofenceData.latitude,
      longitude: geofenceData.longitude,
    },
  };

  // Mark attendance for the undergraduate device
  geofence.markAttendance(device.id, device.location);

  // Get and log the number of devices inside the geofence
  console.log("Devices inside the geofence:", geofence.getDevicesInside());
}

// Simulate a lecturer trying to mark attendance
if (geofenceData.userType === "Lecturer") {
  const lecturerDevice = {
    id: "lecturer1",
    location: {
      latitude: geofenceData.latitude,
      longitude: geofenceData.longitude,
    },
  };

  // Mark attendance for the lecturer device
  geofence.markAttendance(lecturerDevice.id, lecturerDevice.location);

  console.log("Devices inside the geofence:", geofence.getDevicesInside());
}






// Start the server
const PORT = 8080;

// Start the server
app.listen(PORT, async () => {
    console.log(`Server running on port :: ${PORT}`);
    
    try {
        const url = await ngrok.connect(PORT); // Establish the Ngrok tunnel
        console.log(`Ngrok URL: ${url}`);
    } catch (error) {
        console.error('Error connecting to Ngrok:', error);
    }
});
