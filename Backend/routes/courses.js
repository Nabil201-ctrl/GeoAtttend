import express from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import multer from 'multer';
import { parse } from 'csv-parse';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', auth(['lecturer']), async (req, res) => {
  try {
    const { courseId, name, department } = req.body;
    const lecturer = await User.findById(req.user.id).select('name');
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    const existingCourse = await Course.findOne({ courseId });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course ID already exists' });
    }

    const course = new Course({
      courseId,
      name,
      department,
      lecturerId: req.user.id,
      lecturerName: lecturer.name,
      students: [],
    });
    await course.save();

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', auth(['lecturer']), async (req, res) => {
  try {
    const courses = await Course.find({ lecturerId: req.user.id }).select('courseId name department lecturerName students');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:courseId/students', auth(['lecturer']), upload.single('file'), async (req, res) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId, lecturerId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const students = [];
    fs.createReadStream(req.file.path)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', async (row) => {
        try {
          let user = await User.findOne({ email: row.email });
          if (!user) {
            const password = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({
              name: row.name,
              email: row.email,
              password: hashedPassword,
              role: 'student',
            });
            await user.save();
          }
          if (!course.students.includes(user._id)) {
            students.push(user._id);
          }
        } catch (error) {
          console.error(`Error processing student ${row.email}:`, error);
        }
      })
      .on('end', async () => {
        course.students = [...new Set([...course.students, ...students])];
        await course.save();
        fs.unlinkSync(req.file.path); // Clean up uploaded file
        res.json({ message: 'Students imported successfully', count: students.length });
      })
      .on('error', (error) => {
        res.status(500).json({ message: 'Error parsing CSV', error: error.message });
      });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;