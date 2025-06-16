import express from 'express';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import auth from '../middleware/auth.js';
import { calculateDistance } from '../utils/geolocation.js';

const router = express.Router();

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
    const session = new Session({
      courseId,
      courseName,
      department,
      lecturerId: req.user.id,
      location,
      radius,
      passcode,
      startTime,
      endTime,
      attendees: [],
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/active', auth(['lecturer']), async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.user.id,
      endTime: { $gt: new Date() },
    }).select('courseId courseName department startTime endTime passcode attendees');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:id/close', auth(['lecturer']), async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, lecturerId: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    session.endTime = new Date();
    await session.save();
    res.json({ message: 'Session closed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/attend', auth(['student']), async (req, res) => {
  try {
    const { passcode, location, student } = req.body;

    if (!passcode || !location || !location.latitude || !location.longitude || !student || !student.id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const session = await Session.findOne({
      passcode,
      endTime: { $gt: new Date() },
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    const course = await Course.findOne({ courseId: session.courseId });
    if (!course) {
      console.log(`Course not found for courseId: ${session.courseId}`);
      return res.status(404).json({ message: 'Course not found' });
    }

    // Auto-enroll student if not enrolled
    if (!course.students.includes(student.id)) {
      console.log(`Enrolling student ${student.id} in course ${course.courseId}`);
      course.students.push(student.id);
      await course.save();
    }

    // Log coordinates for debugging
    console.log('Student location:', location);
    console.log('Session location:', session.location);

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      session.location.latitude,
      session.location.longitude
    );
    if (distance > session.radius) {
      return res.status(400).json({ message: `Outside geofence (${distance.toFixed(2)}m away)` });
    }

    if (session.attendees.includes(student.id)) {
      return res.status(400).json({ message: 'Attendance already marked' });
    }

    session.attendees.push(student.id);
    await session.save();

    res.json({ message: 'Attendance marked successfully', enrolled: !course.students.includes(student.id) });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
export default router;