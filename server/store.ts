import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, AcademicYear, Semester, Department, Programme, 
  Course, Enrollment, LectureSession, AttendanceRecord 
} from '../src/types';

interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  departments: Department[];
  programmes: Programme[];
  courses: Course[];
  enrollments: Enrollment[];
  sessions: LectureSession[];
  attendance: AttendanceRecord[];
}

const DB_FILE = path.join(process.cwd(), 'server', 'db.json');

// Helper to ensure directory exists
function ensureDirExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

export class Store {
  private static data: DatabaseSchema;

  public static async initialize() {
    ensureDirExists(DB_FILE);
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        return;
      } catch (err) {
        console.error('Error reading db.json, re-initializing...', err);
      }
    }

    // Seed Data
    console.log('Seeding initial AttendX database...');
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password', salt);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    const users: (User & { passwordHash: string })[] = [
      {
        id: 'u-admin-1',
        email: 'admin@attendx.edu',
        fullName: 'Admin Director',
        role: 'Admin',
        passwordHash: adminPasswordHash
      },
      {
        id: 'u-lecturer-1',
        email: 'dr.jenkins@attendx.edu',
        fullName: 'Dr. Sarah Jenkins',
        role: 'Lecturer',
        employeeId: 'EMP001',
        departmentId: 'd-cs',
        passwordHash: defaultPasswordHash
      },
      {
        id: 'u-lecturer-2',
        email: 'prof.davis@attendx.edu',
        fullName: 'Prof. Robert Davis',
        role: 'Lecturer',
        employeeId: 'EMP002',
        departmentId: 'd-ee',
        passwordHash: defaultPasswordHash
      },
      {
        id: 'u-student-1',
        email: 'alice@attendx.edu',
        fullName: 'Alice Cooper',
        role: 'Student',
        matricNo: 'SRI.41.008.001.23',
        departmentId: 'd-cs',
        programmeId: 'p-cs',
        passwordHash: defaultPasswordHash
      },
      {
        id: 'u-student-2',
        email: 'bob@attendx.edu',
        fullName: 'Bob Marley',
        role: 'Student',
        matricNo: 'SRI.41.008.002.23',
        departmentId: 'd-cs',
        programmeId: 'p-se',
        passwordHash: defaultPasswordHash
      },
      {
        id: 'u-student-3',
        email: 'charlie@attendx.edu',
        fullName: 'Charlie Brown',
        role: 'Student',
        matricNo: 'SRI.41.008.042.23',
        departmentId: 'd-ee',
        programmeId: 'p-ee',
        passwordHash: defaultPasswordHash
      }
    ];

    const academicYears: AcademicYear[] = [
      { id: 'ay-25-26', name: '2025/2026', isCurrent: true },
      { id: 'ay-24-25', name: '2024/2025', isCurrent: false }
    ];

    const semesters: Semester[] = [
      { id: 'sem-1', name: 'Semester 1', academicYearId: 'ay-25-26' },
      { id: 'sem-2', name: 'Semester 2', academicYearId: 'ay-25-26' }
    ];

    const departments: Department[] = [
      { id: 'd-cs', name: 'Computer Science', code: 'CS' },
      { id: 'd-ee', name: 'Electrical Engineering', code: 'EE' }
    ];

    const programmes: Programme[] = [
      { id: 'p-cs', name: 'Computer Science (B.Sc.)', departmentId: 'd-cs' },
      { id: 'p-se', name: 'Software Engineering (B.Sc.)', departmentId: 'd-cs' },
      { id: 'p-ee', name: 'Electrical Engineering (B.Eng.)', departmentId: 'd-ee' }
    ];

    const courses: Course[] = [
      { id: 'c-cs101', code: 'CS101', title: 'Introduction to Computer Science', departmentId: 'd-cs', lecturerId: 'u-lecturer-1' },
      { id: 'c-cs302', code: 'CS302', title: 'Software Architecture', departmentId: 'd-cs', lecturerId: 'u-lecturer-1' },
      { id: 'c-ee201', code: 'EE201', title: 'Basic Circuit Theory', departmentId: 'd-ee', lecturerId: 'u-lecturer-2' }
    ];

    const enrollments: Enrollment[] = [
      { id: 'en-1', studentId: 'u-student-1', courseId: 'c-cs101', semesterId: 'sem-1', enrolledAt: new Date().toISOString() },
      { id: 'en-2', studentId: 'u-student-1', courseId: 'c-cs302', semesterId: 'sem-1', enrolledAt: new Date().toISOString() },
      { id: 'en-3', studentId: 'u-student-2', courseId: 'c-cs101', semesterId: 'sem-1', enrolledAt: new Date().toISOString() },
      { id: 'en-4', studentId: 'u-student-2', courseId: 'c-cs302', semesterId: 'sem-1', enrolledAt: new Date().toISOString() },
      { id: 'en-5', studentId: 'u-student-3', courseId: 'c-ee201', semesterId: 'sem-1', enrolledAt: new Date().toISOString() }
    ];

    // Create a couple of finished sessions and attendance records to make charts pretty
    const s1Id = 'sess-past-1';
    const s2Id = 'sess-past-2';
    
    const sessions: LectureSession[] = [
      {
        id: s1Id,
        courseId: 'c-cs101',
        lecturerId: 'u-lecturer-1',
        semesterId: 'sem-1',
        dateTimeslot: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 days ago
        qrSecretKey: 'pastkey-1',
        isActive: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString()
      },
      {
        id: s2Id,
        courseId: 'c-cs302',
        lecturerId: 'u-lecturer-1',
        semesterId: 'sem-1',
        dateTimeslot: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        qrSecretKey: 'pastkey-2',
        isActive: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const attendance: AttendanceRecord[] = [
      {
        id: 'att-1',
        sessionId: s1Id,
        studentId: 'u-student-1',
        studentName: 'Alice Cooper',
        studentMatric: 'SRI.41.008.001.23',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2 + 5 * 60 * 1000).toISOString(),
        status: 'Present',
        deviceInfo: 'iPhone / Safari'
      },
      {
        id: 'att-2',
        sessionId: s1Id,
        studentId: 'u-student-2',
        studentName: 'Bob Marley',
        studentMatric: 'SRI.41.008.002.23',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2 + 15 * 60 * 1000).toISOString(),
        status: 'Late',
        deviceInfo: 'Android / Chrome'
      },
      {
        id: 'att-3',
        sessionId: s2Id,
        studentId: 'u-student-1',
        studentName: 'Alice Cooper',
        studentMatric: 'SRI.41.008.001.23',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
        status: 'Present',
        deviceInfo: 'iPhone / Safari'
      }
      // Bob missed s2Id (Absent)
    ];

    this.data = {
      users,
      academicYears,
      semesters,
      departments,
      programmes,
      courses,
      enrollments,
      sessions,
      attendance
    };

    this.save();
  }

  private static save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save to db.json', err);
    }
  }

  // Getters
  public static getAcademicYears() { return this.data.academicYears; }
  public static getSemesters() { return this.data.semesters; }
  public static getDepartments() { return this.data.departments; }
  public static getProgrammes() { return this.data.programmes; }
  public static getCourses() { return this.data.courses; }
  public static getEnrollments() { return this.data.enrollments; }
  public static getSessions() { return this.data.sessions; }
  public static getAttendance() { return this.data.attendance; }
  public static getUsers() { return this.data.users; }

  // CRUD Operators
  public static addUser(user: User & { passwordHash: string }) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public static addAcademicYear(year: AcademicYear) {
    if (year.isCurrent) {
      this.data.academicYears.forEach(y => y.isCurrent = false);
    }
    this.data.academicYears.push(year);
    this.save();
    return year;
  }

  public static addSemester(sem: Semester) {
    this.data.semesters.push(sem);
    this.save();
    return sem;
  }

  public static addDepartment(dept: Department) {
    this.data.departments.push(dept);
    this.save();
    return dept;
  }

  public static addProgramme(prog: Programme) {
    this.data.programmes.push(prog);
    this.save();
    return prog;
  }

  public static addCourse(course: Course) {
    this.data.courses.push(course);
    this.save();
    return course;
  }

  public static addEnrollment(enroll: Enrollment) {
    this.data.enrollments.push(enroll);
    this.save();
    return enroll;
  }

  public static removeEnrollment(id: string) {
    this.data.enrollments = this.data.enrollments.filter(e => e.id !== id);
    this.save();
  }

  public static addSession(session: LectureSession) {
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public static updateSession(updated: LectureSession) {
    const idx = this.data.sessions.findIndex(s => s.id === updated.id);
    if (idx !== -1) {
      this.data.sessions[idx] = updated;
      this.save();
    }
  }

  public static addAttendance(record: AttendanceRecord) {
    this.data.attendance.push(record);
    this.save();
    return record;
  }

  public static deleteCourse(id: string) {
    this.data.courses = this.data.courses.filter(c => c.id !== id);
    this.save();
  }

  public static deleteDepartment(id: string) {
    this.data.departments = this.data.departments.filter(d => d.id !== id);
    this.save();
  }

  public static deleteProgramme(id: string) {
    this.data.programmes = this.data.programmes.filter(p => p.id !== id);
    this.save();
  }

  public static deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();
  }
}
