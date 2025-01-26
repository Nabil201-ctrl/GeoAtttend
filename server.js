import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors'; // Import CORS middleware
import geolib from 'geolib';
import ngrok, { authtoken } from '@ngrok/ngrok';

// Declearations
let geoData = {};
let radius;

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.static('public'));

// Database connection
const run = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/attendance');
}
run().then(()=>{
  console.log('connected to my DB')
}).catch((err)=>{
  console.error(err)
});

// Schemas
const passcodeSchema = new mongoose.Schema({
  code: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

const geofenceSchema = new mongoose.Schema({
  name: String,
  courseID: String,
  latitude: Number,
  longitude: Number,
  radius: Number,
  timestamp: { type: Date, default: Date.now },
});

const attendanceSchema = new mongoose.Schema({
  studentID: mongoose.Schema.Types.ObjectId,
  classID: mongoose.Schema.Types.ObjectId,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Present", "Absent"] },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Lecturer", "Student"], required: true },
});

// Models
const Passcode = mongoose.model('Passcode', passcodeSchema);
const Geofence = mongoose.model("Geofence", geofenceSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const User = mongoose.model("User", userSchema);

// Routes

// Root Route
app.get('/', (req, res) => {
  res.render('passkey');
});

// Passkey Route
app.post('/passkey', async (req, res) => {
  const key = req.body.passkey;

  if (key === 'NABIL') {
    const generatePasscode = (length, type) => {
      let characters = '';
      if (type === 'numeric') {
        characters = '0123456789';
      } else if (type === 'alphabetic') {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      } else if (type === 'alphanumeric') {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi jklmnopqrstuvwxyz0123456789';
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

    const passcode = generatePasscode(6, 'numeric');
    try {
      // Save the passcode to the database
      const newPasscode = new Passcode({ code: passcode });
      await newPasscode.save();

      return res.status(200).json({
        success: true,
        passcode,
        message: 'Passcode generated and stored successfully.',
      }).then(() => {res.redirect('login');});
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error saving passcode.',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid passkey. Access denied.',
    });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.insertOne({ username, password });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  res.status(200).json({ message: "Login successful", role: user.role });
  res.render('dashboard');
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// Create Geofence Route
app.post('/geofence', async (req, res) => {
  const { name, courseID, latitude, longitude, radius } = req.body;
  const geofence = new Geofence({ name, courseID, latitude, longitude, radius });
  await geofence.save();
  res.status(201).json({ message: "Geofence created successfully", geofence });
});

// Mark Attendance Route
app.post('/attendance', async (req, res) => {
  const { studentID, classID, latitude, longitude } = req.body;
  const geofence = await Geofence.findOne({ classID });

  if (!geofence) return res.status(404).json({ message: "Geofence not found" });

  const isWithinGeofence = geolib.isPointWithinRadius(
    { latitude, longitude },
    { latitude: geofence.latitude, longitude: geofence.longitude },
    geofence.radius
  );

  const status = isWithinGeofence ? "Present" : "Absent";
  const attendance = new Attendance({ studentID, classID, status });
  await attendance.save();

  res.status(201).json({ message: "Attendance recorded", attendance });
});

// Location Route
app.post('/location', (req, res) => {
  geoData = req.body;
  console.log("Geofence data received:", geoData);
  res.json({
    message: "Geofence data received successfully",
    receivedData: geoData,
  });

  // Geofence Logic
  let geofenceCenter;
  if (geoData.userType === "Lecturer") {
    geofenceCenter = {
      latitude: geoData.latitude,
      longitude: geoData.longitude,
    };
  }

  const radiusInMeters = radius; // Default radius is 1 km
  const endTime = new Date();
  endTime.setMinutes(endTime.getMinutes() + 5); // Geofence active for 5 minutes

  const geofence = new (class GeofenceService {
    constructor(center, radius, endTime) {
      this.center = center;
      this.radius = radius;
      this.endTime = endTime;
      this.devicesInside = [];
    }

    isPointInside(point) {
      return geolib.isPointInCircle(point, this.center, this.radius);
    }

    markAttendance(deviceId, location) {
      const currentTime = new Date();
      if (currentTime > this.endTime) {
        console.log("Geofence closed. Attendance not allowed.");
        return false;
      }

      if (this.isPointInside(location)) {
        if (!this.devicesInside.includes(deviceId)) {
          this.devicesInside.push(deviceId);
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

    getDevicesInside() {
      return this.devicesInside.length;
    }
  })(geofenceCenter, radiusInMeters, endTime);

  if (geoData.userType === "Undergradute") {
    const device = {
      id: "device",
      location: {
        latitude: geoData.latitude,
        longitude: geoData.longitude,
      },
    };

    geofence.markAttendance(device.id, device.location);
    console.log("Devices inside the geofence:", geofence.getDevicesInside());
  }
});

// Attendance Summary Route
app.post('/attendance/summary', async (req, res) => {
  const { studentID, classID } = req.body;
  const summary = await Attendance.aggregate([
    { $match: { studentID: mongoose.Types.ObjectId(studentID), classID: mongoose.Types.ObjectId(classID) } },
    { $group: {      _id: "$status",
      count: { $sum: 1 },
    } },
  ]);

  res.status(200).json(summary);
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
