import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors'; // Import CORS middleware
import geolib from 'geolib';
import ngrok, { authtoken } from '@ngrok/ngrok';


// Declearations
let geoData = {};
let radius

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.static('public'));

/* const run = async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/student');
    console.log('Connected to MongoDB');
};
run().catch((err) => {
    console.log(err);
}); */



// Routes
app.get('/', (req, res) => {
    res.render('passkey');
});

app.post('/passkey', (req, res) => {
  const key = req.body.passkey;

  if (key === 'NABIL') {
    const generatePasscode = (length, type) => {
      let characters = '';
      if (type === 'numeric') {
        characters = '0123456789';
      } else if (type === 'alphabetic') {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      } else if (type === 'alphanumeric') {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      } else {
        throw new Error('Invalid type. Choose "numeric", "alphabetic", or "alphanumeric".');
      }

      let passcode = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        passcode += characters[randomIndex];
      }

      return passcode;
    };

    const passcode = generatePasscode(6, 'alphanumeric');
    return res.status(200).json({
      success: true,
      passcode: passcode, // The generated passcode
      message: 'Passcode generated successfully.' // A success message
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid passkey. Access denied.',
    });
  }
});



app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});


app.post('/attendance', (req, res) => {
    radius = req.body.georadius; // Get the data sent from the client
    console.log(radius)

    // Handle the data (e.g., save it to the database or process it)
});

app.post('/location', (req, res) => {
    geoData = req.body;
    console.log("Geofence data received:", geoData);
    res.json({
        message: "Geofence data received successfully",
        receivedData: geoData,
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

        return true;
      } else {
        console.log("Attendance already marked for this device.");
        return false;
      }
    } else {
      console.log("Device is outside the geofence.");
      return false;
    }
  }

  // Method to get the number of devices inside the geofence
  getDevicesInside() {
    return this.devicesInside.length;
  };
}

let geofenceCenter

if (geoData.userType === "Lecturer") {
  geofenceCenter = {
      latitude: geoData.latitude,
      longitude: geoData.longitude,
  };
}

console.log(geofenceCenter)
// Define geofence parameters based on data from the server

const radiusInMeters = radius; // Default radius is 1 km
console.log(radiusInMeters)
const endTime = new Date(); // Set geofence end time (e.g., 5 minutes from now)
endTime.setMinutes(endTime.getMinutes() + 5); // Geofence active for 5 minutes

// Create a GeofenceService instance
const geofence = new GeofenceService(geofenceCenter, radiusInMeters, endTime);

// Simulate marking attendance for devices
if (geoData.userType === "Undergradute") {
  const device = {
    id: "device", // Device ID
    location: {
      latitude: geoData.latitude,
      longitude: geoData.longitude,
    },
  };

  // Mark attendance for the undergraduate device
  geofence.markAttendance(device.id, device.location);

  // Get and log the number of devices inside the geofence
  console.log("Devices inside the geofence:", geofence.getDevicesInside());
}

// Simulate a lecturer trying to mark attendance
});

app.post('/login', (req, res) => {
    const user = req.body.username;
    const pass = req.body.password;
    console.log("Login attempt:", { user, pass });
    res.redirect('/dashboard');
});







app.listen(8080, (res,req)=>{
  console.log('server started on port :: 8080')
})