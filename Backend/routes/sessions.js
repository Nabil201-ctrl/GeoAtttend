import express from 'express';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { calculateDistance } from '../utils/geolocation.js';
import path from 'path';
import fs from 'fs/promises'; // Use promises for async file operations
import { createObjectCsvWriter } from 'csv-writer';
import rateLimit from 'express-rate-limit';
import PDFDocument from 'pdfkit';
import validator from 'validator'; // For input sanitization
import mongoose from 'mongoose';

const router = express.Router();

// Rate limiter for download endpoint
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 downloads per IP
});

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST: Create a new session
router.post('/', auth(['lecturer']), async (req, res) => {
  try {
    const {
      courseId,
      courseName,
      department,
      location,
      radius,
      passcode,
      startTime,
      endTime,
    } = req.body;

    // Input validation
    if (!courseId || !courseName || !department || !location || !passcode || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!validator.isFloat(String(location.latitude), { min: -90, max: 90 }) ||
      !validator.isFloat(String(location.longitude), { min: -180, max: 180 })) {
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }
    if (!validator.isFloat(String(radius), { min: 0 })) {
      return res.status(400).json({ message: 'Invalid radius' });
    }
    if (!validator.isAlphanumeric(passcode, 'en-US', { ignore: '-_' })) {
      return res.status(400).json({ message: 'Invalid passcode format' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Invalid startTime or endTime' });
    }

    const session = new Session({
      courseId: validator.escape(courseId),
      courseName: validator.escape(courseName),
      department: validator.escape(department),
      lecturerId: req.user.id,
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      },
      radius: parseFloat(radius),
      passcode: validator.escape(passcode),
      startTime: start,
      endTime: end,
      attendees: [],
    });

    await session.save();
    console.log(`Session created: ${session._id} for course ${courseId}`);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Fetch active sessions
router.get('/active', auth(['lecturer']), async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.user.id,
      endTime: { $gt: new Date() },
    })
      .select('courseId courseName department startTime endTime passcode attendees')
      .lean(); // Optimize query

    console.log(`Fetched ${sessions.length} active sessions for lecturer ${req.user.id}`);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH: Close a session and generate CSV
// PATCH: Close a session and generate CSV and PDF
router.patch('/:id/close', auth(['lecturer']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await Session.findOne({ _id: id, lecturerId: req.user.id })
      .populate('attendees.userId', 'name department matricNumber')
      .lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update endTime and mark report as generated
    await Session.updateOne(
      { _id: id },
      { endTime: new Date(), reportGenerated: true }
    );

    // Generate CSV and PDF for attendees
    const attendees = session.attendees.map(attendee => ({
      name: attendee.userId?.name || 'Unknown',
      department: attendee.userId?.department || 'N/A',
      matricNumber: attendee.userId?.matricNumber || 'N/A',
      timestamp: attendee.timestamp?.toLocaleString() || 'N/A',
    }));

    if (attendees.length === 0) {
      console.log(`Session ${id} closed with no attendees`);
      return res.json({ message: 'Session closed, no attendees to export' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join('uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Define file paths
    const csvFilePath = path.join(uploadsDir, `session_${id}_attendees.csv`);
    const pdfFilePath = path.join(uploadsDir, `session_${id}_attendees.pdf`);

    // Create CSV
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'department', title: 'Department' },
        { id: 'matricNumber', title: 'Matric Number' },
        { id: 'timestamp', title: 'Timestamp' },
      ],
    });
    await csvWriter.writeRecords(attendees);
    console.log(`CSV generated for session ${id} at ${csvFilePath}`);

    // Create PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfFilePath));
    doc.fontSize(16).text(`Attendance Report for ${session.courseName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Session ID: ${session._id}`);
    doc.text(`Course: ${session.courseId}`);
    doc.text(`Date: ${session.startTime.toLocaleString()}`);
    doc.moveDown();
    attendees.forEach((attendee, index) => {
      doc.text(
        `${index + 1}. Name: ${attendee.name}, Matric: ${attendee.matricNumber}, Dept: ${attendee.department}, Time: ${attendee.timestamp}`
      );
      doc.moveDown(0.5);
    });
    doc.end();
    console.log(`PDF generated for session ${id} at ${pdfFilePath}`);

    // Update session with file paths
    await Session.updateOne(
      { _id: id },
      {
        reportFiles: {
          csv: `/api/sessions/download/${id}/csv`,
          pdf: `/api/sessions/download/${id}/pdf`,
        },
      }
    );

    res.json({
      message: 'Session closed and reports generated',
      csvUrl: `/api/sessions/download/${id}/csv`,
      pdfUrl: `/api/sessions/download/${id}/pdf`,
    });
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Download CSV or PDF
router.get('/download/:sessionId/:format', auth(['lecturer']), downloadLimiter, async (req, res) => {
  try {
    const { sessionId, format } = req.params;
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format. Use csv or pdf.' });
    }

    const session = await Session.findOne({ _id: sessionId, lecturerId: req.user.id }).lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const filePath = path.join('uploads', `session_${sessionId}_attendees.${format}`);
    try {
      await fs.access(filePath); // Check if file exists
    } catch {
      return res.status(404).json({ message: `${format.toUpperCase()} file not found` });
    }

    res.download(filePath, `session_${session.courseId}_attendees.${format}`, (err) => {
      if (err) {
        console.error(`Error downloading ${format}:`, err);
        return res.status(500).json({ message: `Error downloading ${format}` });
      }
      console.log(`${format.toUpperCase()} downloaded for session ${sessionId}`);
      // Keep files for future downloads, or implement cleanup logic if needed
    });
  } catch (error) {
    console.error(`Error serving ${req.params.format}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// GET: Fetch closed or expired sessions
router.get('/closed', auth(['lecturer']), async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.user.id,
      endTime: { $lte: new Date() },
    })
      .select('courseId courseName department startTime endTime passcode attendees reportFiles')
      .lean();
    console.log(`Fetched ${sessions.length} closed sessions for lecturer ${req.user.id}`);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching closed sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Manually add student to session attendance
router.post('/:sessionId/manual-attendance', auth(['lecturer']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { matricNumber, reason } = req.body;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    if (!matricNumber) {
      return res.status(400).json({ message: 'Matric number is required' });
    }

    const session = await Session.findOne({ _id: sessionId, lecturerId: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.endTime < new Date() && session.reportGenerated) {
      return res.status(400).json({ message: 'Cannot modify attendance for closed session with generated reports' });
    }

    const course = await Course.findOne({ courseId: session.courseId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const student = await User.findOne({ matricNumber, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!course.students.includes(student._id)) {
      course.students.push(student._id);
      await course.save();
      console.log(`Enrolled student ${student._id} in course ${course.courseId}`);
    }

    const alreadyAttended = session.attendees.some(attendee => attendee.userId.toString() === student._id.toString());
    if (alreadyAttended) {
      return res.status(400).json({ message: 'Student already marked as attended' });
    }

    await Session.updateOne(
      { _id: session._id },
      {
        $push: {
          attendees: {
            userId: student._id,
            ipAddress: 'manual',
            deviceId: 'manual',
            timestamp: new Date(),
            status: 'valid',
            reason: reason || 'Manual entry by lecturer',
          },
        },
      }
    );

    console.log(`Manually marked attendance for student ${student._id} in session ${session._id}`);
    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Preview attendees (new endpoint)
router.get('/:sessionId/attendees', auth(['lecturer']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await Session.findOne({ _id: sessionId, lecturerId: req.user.id })
      .populate('attendees.userId', 'name department matricNumber')
      .lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const attendees = session.attendees.map(attendee => ({
      name: attendee.userId?.name || 'Unknown',
      department: attendee.userId?.department || 'N/A',
      matricNumber: attendee.userId?.matricNumber || 'N/A',
    }));

    console.log(`Fetched attendees for session ${sessionId}: ${attendees.length} records`);
    res.json({ attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Mark attendance
router.post('/attend', auth(['student']), async (req, res) => {
  try {
    const { passcode, location, student, deviceId } = req.body;
    console.log('Attendance request received:', { passcode, studentId: student?.id, deviceId });

    // Input validation
    if (!passcode || !location || !location.latitude || !location.longitude || !student || !student.id || !deviceId) {
      console.log('Missing fields:', { passcode, location, student, deviceId });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!isValidObjectId(student.id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    if (!validator.isFloat(String(location.latitude), { min: -90, max: 90 }) ||
      !validator.isFloat(String(location.longitude), { min: -180, max: 180 })) {
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }

    const user = await User.findById(student.id).lean();
    if (!user) {
      console.log(`User not found: ${student.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate device ID (optional if not set)
    if (user.deviceId && user.deviceId !== deviceId) {
      console.log(`Device ID mismatch for user ${student.id}: expected ${user.deviceId}, got ${deviceId}`);
      return res.status(403).json({ message: 'Device ID mismatch. Cannot mark attendance from this device.' });
    }

    const session = await Session.findOne({
      passcode: validator.escape(passcode),
      endTime: { $gt: new Date() },
    });
    if (!session) {
      console.log(`Session not found or expired: ${passcode}`);
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    const course = await Course.findOne({ courseId: session.courseId });
    if (!course) {
      console.log(`Course not found: ${session.courseId}`);
      return res.status(404).json({ message: 'Course not found' });
    }

    // Auto-enroll student if not enrolled
    if (!course.students.includes(student.id)) {
      console.log(`Enrolling student ${student.id} in course ${course.courseId}`);
      course.students.push(student.id);
      await course.save();
    }

    const distance = calculateDistance(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
      session.location.latitude,
      session.location.longitude
    );
    if (distance > session.radius) {
      console.log(`Outside geofence: ${distance.toFixed(2)}m away`);
      return res.status(400).json({ message: `Outside geofence (${distance.toFixed(2)}m away)` });
    }

    const alreadyAttended = session.attendees.some(attendee => attendee.userId.toString() === student.id);
    if (alreadyAttended) {
      console.log(`Attendance already marked for user ${student.id} in session ${session._id}`);
      return res.status(400).json({ message: 'Attendance already marked' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await Session.updateOne(
      { _id: session._id },
      {
        $push: {
          attendees: {
            userId: student.id,
            ipAddress,
            deviceId,
            timestamp: new Date(),
          },
        },
      }
    );

    console.log(`Attendance marked successfully for user ${student.id} in session ${session._id}`);
    res.json({ message: 'Attendance marked successfully', enrolled: !course.students.includes(student.id) });
  } catch (error) {
    console.error('Attendance error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE: Cleanup expired sessions (optional endpoint)
router.delete('/cleanup', auth(['lecturer']), async (req, res) => {
  try {
    const result = await Session.deleteMany({
      endTime: { $lt: new Date() },
      lecturerId: req.user.id,
    });
    console.log(`Deleted ${result.deletedCount} expired sessions for lecturer ${req.user.id}`);
    res.json({ message: `${result.deletedCount} expired sessions deleted` });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;