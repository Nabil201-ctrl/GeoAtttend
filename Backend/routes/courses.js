// routes/courses.js
import express from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Set up GridFS storage
console.log('MONGO_URI:', process.env.MONGO_URI); // Debug log
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    bucketName: 'uploads',
    filename: `${Date.now()}_${file.originalname}`,
  }),
});
const upload = multer({ storage });

// Get all courses for a lecturer
router.get('/', auth(['lecturer']), async (req, res) => {
  try {
    const courses = await Course.find({ lecturerId: req.user.id }).lean();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrolled students for a course
router.get('/:courseId/students', auth(['lecturer']), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id })
      .populate('enrolledStudentIds', 'name email matricNumber status')
      .lean();
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course.enrolledStudentIds);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get individual student attendance records
router.get('/:courseId/students/:studentId/attendance', auth(['lecturer']), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const sessions = await Session.aggregate([
      { $match: { courseId: req.params.courseId } },
      { $unwind: '$attendees' },
      { $match: { 'attendees.userId': new mongoose.Types.ObjectId(req.params.studentId) } },
      {
        $project: {
          _id: '$attendees._id',
          timestamp: '$attendees.timestamp',
          status: '$attendees.status',
          reason: '$attendees.reason',
          courseId: '$courseId',
          courseName: '$courseName',
        },
      },
    ]);
    const totalSessions = await Session.countDocuments({ courseId: req.params.courseId });
    const attendedSessions = sessions.filter(s => s.status === 'valid').length;
    const attendancePercentage = totalSessions ? (attendedSessions / totalSessions * 100).toFixed(2) : 0;
    res.json({ sessions, attendancePercentage });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance records for a course
router.get('/:courseId/attendance', auth(['lecturer']), async (req, res) => {
  try {
    const { date, studentId } = req.query;
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const match = { courseId: req.params.courseId };
    if (date) match['attendees.timestamp'] = { $gte: new Date(date), $lte: new Date(new Date(date).setHours(23, 59, 59)) };
    if (studentId) match['attendees.userId'] = new mongoose.Types.ObjectId(studentId);

    const sessions = await Session.aggregate([
      { $match: { courseId: req.params.courseId } },
      { $unwind: '$attendees' },
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'attendees.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$attendees._id',
          userId: { _id: '$user._id', name: '$user.name', matricNumber: '$user.matricNumber' },
          timestamp: '$attendees.timestamp',
          status: '$attendees.status',
          reason: '$attendees.reason',
          courseId: '$courseId',
          courseName: '$courseName',
        },
      },
    ]);

    const totalSessions = await Session.countDocuments({ courseId: req.params.courseId });
    const attendanceByStudent = await Session.aggregate([
      { $match: { courseId: req.params.courseId } },
      { $unwind: '$attendees' },
      { $group: { _id: '$attendees.userId', attended: { $sum: { $cond: [{ $eq: ['$attendees.status', 'valid'] }, 1, 0] } } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' }, // <-- Add this line to fix the bug
      {
        $project: {
          name: '$user.name',
          matricNumber: '$user.matricNumber',
          attended: 1,
          percentage: { $cond: [ { $eq: [totalSessions, 0] }, 0, { $multiply: [ { $divide: ['$attended', totalSessions] }, 100 ] } ] },
        },
      },
    ]);

    res.json({ sessions, attendanceByStudent, totalSessions });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export attendance as CSV
router.get('/:courseId/attendance/export/csv', auth(['lecturer']), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const sessions = await Session.aggregate([
      { $match: { courseId: req.params.courseId } },
      { $unwind: '$attendees' },
      {
        $lookup: {
          from: 'users',
          localField: 'attendees.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          'User Name': '$user.name',
          'Matric Number': '$user.matricNumber',
          Timestamp: '$attendees.timestamp',
          Status: '$attendees.status',
          Reason: '$attendees.reason',
          Course: '$courseName',
        },
      },
    ]);

    const csv = new Parser().parse(sessions);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.courseId}_attendance.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export attendance as PDF
router.get('/:courseId/attendance/export/pdf', auth(['lecturer']), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const sessions = await Session.aggregate([
      { $match: { courseId: req.params.courseId } },
      { $unwind: '$attendees' },
      {
        $lookup: {
          from: 'users',
          localField: 'attendees.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          matricNumber: '$user.matricNumber',
          timestamp: '$attendees.timestamp',
          status: '$attendees.status',
          reason: '$attendees.reason',
          courseName: '$courseName',
        },
      },
    ]);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.courseId}_attendance.pdf`);
    doc.pipe(res);

    doc.fontSize(16).text(`${course.name} Attendance Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown();

    sessions.forEach((session, index) => {
      doc.text(`Record ${index + 1}:`);
      doc.text(`Student: ${session.name}`);
      doc.text(`Matric Number: ${session.matricNumber}`);
      doc.text(`Timestamp: ${new Date(session.timestamp).toLocaleString()}`);
      doc.text(`Status: ${session.status}`);
      if (session.reason) doc.text(`Reason: ${session.reason}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload class material
router.post('/:courseId/materials', auth(['lecturer']), upload.single('file'), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    course.materials.push({
      filename: req.file.filename,
      contentType: req.file.mimetype,
      fileId: req.file.id,
    });
    await course.save();
    res.json({ message: 'File uploaded successfully', file: req.file });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download class material
router.get('/materials/:fileId', auth(['lecturer', 'student']), async (req, res) => {
  try {
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const file = await gfs.find({ _id: new mongoose.Types.ObjectId(req.params.fileId) }).toArray();
    if (!file.length) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.set('Content-Type', file[0].contentType);
    res.set('Content-Disposition', `attachment; filename="${file[0].filename}"`);
    gfs.openDownloadStream(new mongoose.Types.ObjectId(req.params.fileId)).pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Manual attendance input
router.post('/:courseId/sessions/:sessionId/attendance', auth(['lecturer']), async (req, res) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const session = await Session.findById(req.params.sessionId);
    if (!session || session.courseId !== req.params.courseId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student' || !course.enrolledStudentIds.includes(studentId)) {
      return res.status(400).json({ message: 'Invalid student' });
    }
    if (session.attendees.some(a => a.userId.toString() === studentId)) {
      return res.status(400).json({ message: 'Student already marked present' });
    }

    session.attendees.push({
      userId: studentId,
      timestamp: new Date(),
      deviceId: 'manual',
      latitude: 0,
      longitude: 0,
      status: 'valid',
    });
    await session.save();
    res.json({ message: 'Attendance recorded' });
  } catch (error) {
    console.error('Error recording manual attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll student in a course
router.post('/:courseId/students', auth(['lecturer']), async (req, res) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid student' });
    }
    if (course.enrolledStudentIds.includes(studentId)) {
      return res.status(400).json({ message: 'Student already enrolled' });
    }
    course.enrolledStudentIds.push(studentId);
    await course.save();
    res.json({ message: 'Student enrolled' });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;