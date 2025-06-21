// models/Course.js
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrolledStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  materials: [{
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    fileId: { type: mongoose.Schema.Types.ObjectId }, // For GridFS
  }],
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);