# Attendance Management System

## Overview
The **Attendance Management System** is a project designed to manage student attendance efficiently for classes within a semester. It leverages **Node.js**, **MongoDB**, and **Express.js** on the backend, with a responsive user interface for both desktop and mobile platforms. The system allows lecturers to create geofences for attendance marking, view attendance records, and manage class notifications.

---

## Features

### 1. Geofence Creation
- Lecturers can set geofence boundaries (center location and radius) for a class.
- Uses browser geolocation to determine the lecturer’s current location.
- Sends geofence data (latitude, longitude, and radius) to the backend for processing.

### 2. Attendance Tracking
- Tracks whether students are within the geofence during a specified time window.
- Marks attendance as **Present** or **Absent**.
- Automatically calculates attendance totals for each student in a semester.

### 3. Attendance Summary
- Allows querying of attendance totals for a student within a class.
- Provides a breakdown of **Present** and **Absent** counts.

### 4. Notifications
- Lecturers can send notifications to students regarding class updates or attendance-related reminders.

---

## Technologies Used

### Backend
- **Node.js**: Server-side runtime.
- **Express.js**: Web framework for API routing and handling HTTP requests.
- **MongoDB**: NoSQL database for storing attendance and geofence data.
- **Mongoose**: ODM library for MongoDB.

### Frontend
- **Bootstrap**: Responsive design framework.
- **EJS**: Template engine for rendering dynamic HTML pages.

### Other Tools
- **Geolib**: For geofence calculations (e.g., checking if a student is inside a geofence).
- **Ngrok**: For secure tunneling and exposing local servers.

---

## Installation and Setup

### Prerequisites
- Node.js installed on your system.
- MongoDB server running locally or in the cloud.

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GeoAttend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the MongoDB server locally or provide a cloud database connection URL.
4. Create a `.env` file to store environment variables:
   ```env
   PORT=8080
   MONGODB_URI=mongodb://127.0.0.1:27017/attendance
   ```
5. Run the application:
   ```bash
   npm start
   ```
6. Access the application in your browser at `http://localhost:8080`.

---

## API Endpoints

### 1. **POST /login**
- Logs in a user and redirects them to the dashboard.
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```

### 2. **POST /location**
- Receives geofence data (latitude, longitude, and radius).
- **Request Body**:
  ```json
  {
    "latitude": "number",
    "longitude": "number",
    "radius": "number"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Data received successfully",
    "receivedData": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "radius": 100
    }
  }
  ```

### 3. **GET /dashboard**
- Displays the lecturer’s dashboard.

### 4. **POST /attendance/summary**
- Calculates the total attendance (Present/Absent) for a student in a class.
- **Request Body**:
  ```json
  {
    "studentID": "string",
    "classID": "string"
  }
  ```
- **Response**:
  ```json
  [
    { "_id": "Present", "count": 20 },
    { "_id": "Absent", "count": 5 }
  ]
  ```

---

## Database Schema

### Geofence Schema
```javascript
const geofenceSchema = new mongoose.Schema({
  name: String,
  courseID: String,
  latitude: Number,
  longitude: Number,
  radius: Number,
  timestamp: Date,
});
```

### Attendance Schema
```javascript
const attendanceSchema = new mongoose.Schema({
  studentID: mongoose.Schema.Types.ObjectId,
  classID: mongoose.Schema.Types.ObjectId,
  date: Date,
  status: {
    type: String,
    enum: ['Present', 'Absent'],
  },
});
```

---

## Future Improvements
- **User Authentication**: Add roles for lecturers and students.
- **Class Scheduling**: Integrate a feature to manage class schedules more effectively.
- **Graphs and Analytics**: Provide visual analytics of attendance trends.
- **Mobile App**: Develop a mobile app version for easier accessibility.

---

## License
This project is licensed under the MIT License.
