/**
 * AttendX - Shared TypeScript Definitions
 */

export type UserRole = 'Admin' | 'Lecturer' | 'Student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  matricNo?: string;     // For students
  employeeId?: string;   // For lecturers
  departmentId?: string; // For lecturers/students
  programmeId?: string;  // For students
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2025/2026"
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  name: string; // e.g. "Semester 1"
  academicYearId: string;
}

export interface Department {
  id: string;
  name: string;
  code: string; // e.g. "CS"
}

export interface Programme {
  id: string;
  name: string;
  departmentId: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "CS101"
  title: string;
  departmentId: string;
  lecturerId: string;
  lecturerName?: string;
  departmentName?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName?: string;
  studentMatric?: string;
  courseId: string;
  semesterId: string;
  enrolledAt: string;
}

export interface LectureSession {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  lecturerId: string;
  semesterId: string;
  dateTimeslot: string;
  qrSecretKey: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentMatric: string;
  timestamp: string;
  status: 'Present' | 'Late' | 'Absent';
  deviceInfo?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalLecturers?: number;
  totalCourses?: number;
  totalSessions?: number;
  overallAttendanceRate?: number;
  
  // Lecturer specific
  myCoursesCount?: number;
  activeSessionsCount?: number;

  // Student specific
  attendedCount?: number;
  missedCount?: number;
  attendancePercentage?: number;
}
