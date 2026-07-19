import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Store } from './server/store';
import { User, UserRole, AttendanceRecord, LectureSession } from './src/types';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'attendx-super-secret-key-13579';

// SSE Clients Registry for real-time SignalR simulation
interface SseClient {
  sessionId: string;
  res: Response;
}
let sseClients: SseClient[] = [];

async function startServer() {
  await Store.initialize();

  const app = express();
  app.use(express.json());

  // CORS Middleware for any cross-origin sandbox needs
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Authentication Middleware
  const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      (req as any).user = decoded as User;
      next();
    });
  };

  // Admin Role Check Middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction): any => {
    const user = (req as any).user as User;
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Requires Admin privilege' });
    }
    next();
  };

  // Lecturer Role Check Middleware
  const requireLecturer = (req: Request, res: Response, next: NextFunction): any => {
    const user = (req as any).user as User;
    if (user.role !== 'Lecturer' && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Requires Lecturer or Admin privilege' });
    }
    next();
  };

  // --- AUTHENTICATION API ---
  
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = Store.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload: User = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      matricNo: user.matricNo,
      employeeId: user.employeeId,
      departmentId: user.departmentId,
      programmeId: user.programmeId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: payload, token });
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { email, password, fullName, role, matricNo, employeeId, departmentId, programmeId } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Missing required credentials' });
    }

    const exists = Store.getUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `u-${Date.now()}`,
      email,
      fullName,
      role: role as UserRole,
      matricNo: role === 'Student' ? (matricNo || `SRI.41.008.${Math.floor(100 + Math.random() * 900)}.23`) : undefined,
      employeeId: role === 'Lecturer' ? (employeeId || `EMP-${Date.now().toString().slice(-6)}`) : undefined,
      departmentId: departmentId || '',
      programmeId: programmeId || '',
      passwordHash
    };

    Store.addUser(newUser);

    const payload: User = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      matricNo: newUser.matricNo,
      employeeId: newUser.employeeId,
      departmentId: newUser.departmentId,
      programmeId: newUser.programmeId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: payload, token });
  });

  app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
    res.json({ user: (req as any).user });
  });

  // --- DASHBOARD STATS API ---

  app.get('/api/stats', authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const courses = Store.getCourses();
    const sessions = Store.getSessions();
    const attendance = Store.getAttendance();
    const students = Store.getUsers().filter(u => u.role === 'Student');
    const lecturers = Store.getUsers().filter(u => u.role === 'Lecturer');

    if (user.role === 'Admin') {
      // Admin overall rates
      const totalPresent = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const totalRecords = attendance.length;
      const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

      res.json({
        totalStudents: students.length,
        totalLecturers: lecturers.length,
        totalCourses: courses.length,
        totalSessions: sessions.length,
        overallAttendanceRate: overallRate
      });
    } else if (user.role === 'Lecturer') {
      const myCourses = courses.filter(c => c.lecturerId === user.id);
      const myCourseIds = myCourses.map(c => c.id);
      const mySessions = sessions.filter(s => myCourseIds.includes(s.courseId));
      const mySessionIds = mySessions.map(s => s.id);
      const myAttendance = attendance.filter(a => mySessionIds.includes(a.sessionId));

      const totalPresent = myAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const totalRecords = myAttendance.length;
      const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

      res.json({
        myCoursesCount: myCourses.length,
        totalSessions: mySessions.length,
        activeSessionsCount: mySessions.filter(s => s.isActive).length,
        overallAttendanceRate: overallRate
      });
    } else {
      // Student specific rates
      const enrollments = Store.getEnrollments().filter(e => e.studentId === user.id);
      const courseIds = enrollments.map(e => e.courseId);
      const studentSessions = sessions.filter(s => courseIds.includes(s.courseId));
      const studentAttendance = attendance.filter(a => a.studentId === user.id);

      const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
      const lateCount = studentAttendance.filter(a => a.status === 'Late').length;
      const attendedCount = presentCount + lateCount;
      const missedCount = studentSessions.length - attendedCount;
      const attendancePercentage = studentSessions.length > 0 
        ? Math.round((attendedCount / studentSessions.length) * 100) 
        : 100;

      res.json({
        attendedCount,
        missedCount: Math.max(0, missedCount),
        attendancePercentage
      });
    }
  });

  // --- ACADEMIC STRUCTURES API ---

  app.get('/api/academic-years', authenticateToken, (req, res) => {
    res.json(Store.getAcademicYears());
  });

  app.post('/api/academic-years', authenticateToken, requireAdmin, (req, res) => {
    const { name, isCurrent } = req.body;
    const newYear = { id: `ay-${Date.now()}`, name, isCurrent: !!isCurrent };
    Store.addAcademicYear(newYear);
    res.status(201).json(newYear);
  });

  app.get('/api/semesters', authenticateToken, (req, res) => {
    res.json(Store.getSemesters());
  });

  app.post('/api/semesters', authenticateToken, requireAdmin, (req, res) => {
    const { name, academicYearId } = req.body;
    const newSem = { id: `sem-${Date.now()}`, name, academicYearId };
    Store.addSemester(newSem);
    res.status(201).json(newSem);
  });

  app.get('/api/departments', authenticateToken, (req, res) => {
    res.json(Store.getDepartments());
  });

  app.post('/api/departments', authenticateToken, requireAdmin, (req, res) => {
    const { name, code } = req.body;
    const newDept = { id: `d-${Date.now()}`, name, code };
    Store.addDepartment(newDept);
    res.status(201).json(newDept);
  });

  app.delete('/api/departments/:id', authenticateToken, requireAdmin, (req, res) => {
    Store.deleteDepartment(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/programmes', authenticateToken, (req, res) => {
    res.json(Store.getProgrammes());
  });

  app.post('/api/programmes', authenticateToken, requireAdmin, (req, res) => {
    const { name, departmentId } = req.body;
    const newProg = { id: `p-${Date.now()}`, name, departmentId };
    Store.addProgramme(newProg);
    res.status(201).json(newProg);
  });

  app.delete('/api/programmes/:id', authenticateToken, requireAdmin, (req, res) => {
    Store.deleteProgramme(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/courses', authenticateToken, (req, res) => {
    const courses = Store.getCourses().map(c => {
      const lecturer = Store.getUsers().find(u => u.id === c.lecturerId);
      const dept = Store.getDepartments().find(d => d.id === c.departmentId);
      return {
        ...c,
        lecturerName: lecturer ? lecturer.fullName : 'Unknown',
        departmentName: dept ? dept.name : 'Unknown'
      };
    });
    res.json(courses);
  });

  app.post('/api/courses', authenticateToken, requireLecturer, (req, res) => {
    const user = (req as any).user as User;
    const { code, title, departmentId, lecturerId } = req.body;
    const finalLecturerId = user.role === 'Lecturer' ? user.id : (lecturerId || user.id);
    const newCourse = { id: `c-${Date.now()}`, code, title, departmentId: departmentId || '', lecturerId: finalLecturerId };
    Store.addCourse(newCourse);
    res.status(201).json(newCourse);
  });

  app.delete('/api/courses/:id', authenticateToken, requireAdmin, (req, res) => {
    Store.deleteCourse(req.params.id);
    res.json({ success: true });
  });

  // --- USER PROVISIONING API (Admin and Lecturer authorized) ---

  app.get('/api/users', authenticateToken, requireLecturer, (req, res) => {
    const users = Store.getUsers().map(({ passwordHash, ...rest }) => rest);
    res.json(users);
  });

  app.post('/api/users', authenticateToken, requireLecturer, async (req: Request, res: Response) => {
    const { email, password, fullName, role, matricNo, employeeId, departmentId, programmeId } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Missing required credentials' });
    }

    const exists = Store.getUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `u-${Date.now()}`,
      email,
      fullName,
      role: role as UserRole,
      matricNo,
      employeeId,
      departmentId,
      programmeId,
      passwordHash
    };

    Store.addUser(newUser);
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    Store.deleteUser(req.params.id);
    res.json({ success: true });
  });

  // --- ENROLLMENTS API ---

  app.get('/api/enrollments', authenticateToken, (req, res) => {
    const enrollments = Store.getEnrollments().map(e => {
      const student = Store.getUsers().find(u => u.id === e.studentId);
      const course = Store.getCourses().find(c => c.id === e.courseId);
      return {
        ...e,
        studentName: student ? student.fullName : 'Unknown',
        studentMatric: student ? student.matricNo : 'Unknown',
        courseCode: course ? course.code : 'Unknown',
        courseTitle: course ? course.title : 'Unknown'
      };
    });
    res.json(enrollments);
  });

  app.post('/api/enrollments', authenticateToken, requireLecturer, (req: Request, res: Response) => {
    const { studentId, courseId, semesterId } = req.body;
    if (!studentId || !courseId || !semesterId) {
      return res.status(400).json({ message: 'Missing student, course, or semester selection' });
    }

    const exists = Store.getEnrollments().some(
      e => e.studentId === studentId && e.courseId === courseId && e.semesterId === semesterId
    );

    if (exists) {
      return res.status(400).json({ message: 'Student is already enrolled in this course for this semester' });
    }

    const newEnroll = {
      id: `en-${Date.now()}`,
      studentId,
      courseId,
      semesterId,
      enrolledAt: new Date().toISOString()
    };

    Store.addEnrollment(newEnroll);
    res.status(201).json(newEnroll);
  });

  app.delete('/api/enrollments/:id', authenticateToken, requireAdmin, (req, res) => {
    Store.removeEnrollment(req.params.id);
    res.json({ success: true });
  });

  // --- LECTURE SESSIONS & DYNAMIC QR ENGINE ---

  app.get('/api/sessions', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    let sessions = Store.getSessions();

    if (user.role === 'Lecturer') {
      sessions = sessions.filter(s => s.lecturerId === user.id);
    } else if (user.role === 'Student') {
      const myEnrollments = Store.getEnrollments().filter(e => e.studentId === user.id);
      const myCourseIds = myEnrollments.map(e => e.courseId);
      sessions = sessions.filter(s => myCourseIds.includes(s.courseId));
    }

    const decorated = sessions.map(s => {
      const course = Store.getCourses().find(c => c.id === s.courseId);
      return {
        ...s,
        courseCode: course ? course.code : 'Unknown',
        courseTitle: course ? course.title : 'Unknown'
      };
    });

    res.json(decorated);
  });

  app.post('/api/sessions/start', authenticateToken, requireLecturer, (req: Request, res: Response) => {
    const { courseId, semesterId } = req.body;
    const user = (req as any).user as User;

    if (!courseId || !semesterId) {
      return res.status(400).json({ message: 'Course and Semester IDs are required' });
    }

    // Deactivate previous sessions for this course to prevent duplicates
    const allSessions = Store.getSessions();
    allSessions.forEach(s => {
      if (s.courseId === courseId && s.isActive) {
        s.isActive = false;
        Store.updateSession(s);
      }
    });

    const secretKey = crypto.randomBytes(16).toString('hex');
    const newSession: LectureSession = {
      id: `sess-${Date.now()}`,
      courseId,
      lecturerId: user.id,
      semesterId,
      dateTimeslot: new Date().toISOString(),
      qrSecretKey: secretKey,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    Store.addSession(newSession);

    // Decorate
    const course = Store.getCourses().find(c => c.id === courseId);
    res.status(201).json({
      ...newSession,
      courseCode: course ? course.code : 'Unknown',
      courseTitle: course ? course.title : 'Unknown'
    });
  });

  app.post('/api/sessions/:id/end', authenticateToken, requireLecturer, (req: Request, res: Response) => {
    const session = Store.getSessions().find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isActive = false;
    Store.updateSession(session);

    // Notify connected SSE clients that session closed
    sendSseUpdate(session.id, { type: 'closed', message: 'Lecture session has ended' });

    res.json(session);
  });

  // Secure dynamic key generation endpoint
  app.get('/api/sessions/:id/qr', authenticateToken, (req: Request, res: Response) => {
    const session = Store.getSessions().find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (!session.isActive) {
      return res.status(400).json({ message: 'Session is no longer active' });
    }

    // Generate security hash using a key rotating every 8 seconds
    const period = Math.floor(Date.now() / 8000);
    const hash = crypto
      .createHmac('sha256', session.qrSecretKey)
      .update(`${session.id}-${period}`)
      .digest('hex');

    res.json({
      sessionId: session.id,
      token: `${period}:${hash}`,
      expiresInMs: 8000 - (Date.now() % 8000)
    });
  });

  // --- ATTENDANCE SCANNING & MARKING ---

  app.get('/api/attendance', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    let records = Store.getAttendance();

    if (user.role === 'Student') {
      records = records.filter(r => r.studentId === user.id);
    } else if (user.role === 'Lecturer') {
      // Find lecture courses
      const myCourses = Store.getCourses().filter(c => c.lecturerId === user.id);
      const myCourseIds = myCourses.map(c => c.id);
      const mySessions = Store.getSessions().filter(s => myCourseIds.includes(s.courseId));
      const mySessionIds = mySessions.map(s => s.id);
      records = records.filter(r => mySessionIds.includes(r.sessionId));
    }

    // Decorate with course and timing info
    const decorated = records.map(r => {
      const sess = Store.getSessions().find(s => s.id === r.sessionId);
      const course = sess ? Store.getCourses().find(c => c.id === sess.courseId) : null;
      return {
        ...r,
        courseCode: course ? course.code : 'Unknown',
        courseTitle: course ? course.title : 'Unknown',
        sessionDate: sess ? sess.dateTimeslot : 'Unknown'
      };
    });

    res.json(decorated);
  });

  // Main Dynamic QR scan verification endpoint
  app.post('/api/attendance/scan', authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    if (user.role !== 'Student') {
      return res.status(400).json({ message: 'Only students can check in to a session' });
    }

    const { sessionId, token, deviceInfo } = req.body;
    if (!sessionId || !token) {
      return res.status(400).json({ message: 'Session ID and Dynamic Token are required' });
    }

    const session = Store.getSessions().find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Lecture session not found' });
    }
    if (!session.isActive) {
      return res.status(400).json({ message: 'This lecture session is closed or expired' });
    }

    // Verify student enrollment in this session's course
    const enrolled = Store.getEnrollments().some(
      e => e.studentId === user.id && e.courseId === session.courseId
    );
    if (!enrolled) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Prevent duplicate scans
    const alreadyScanned = Store.getAttendance().some(
      r => r.sessionId === sessionId && r.studentId === user.id
    );
    if (alreadyScanned) {
      return res.status(400).json({ message: 'You have already marked your attendance for this session' });
    }

    // Cryptographic dynamic Token Validation (allows 1 period leeway for lag)
    const [scannedPeriodStr, scannedHash] = token.split(':');
    const scannedPeriod = parseInt(scannedPeriodStr, 10);
    const currentPeriod = Math.floor(Date.now() / 8000);

    if (isNaN(scannedPeriod) || !scannedHash) {
      return res.status(400).json({ message: 'Malformed QR attendance token' });
    }

    const periodSkew = Math.abs(currentPeriod - scannedPeriod);
    if (periodSkew > 1) { // Allows current and previous 8s block
      return res.status(400).json({ message: 'QR Code expired. Please scan the current rotating QR display.' });
    }

    // Verify token cryptographic signature
    const expectedHash = crypto
      .createHmac('sha256', session.qrSecretKey)
      .update(`${session.id}-${scannedPeriod}`)
      .digest('hex');

    if (expectedHash !== scannedHash) {
      return res.status(400).json({ message: 'Invalid signature detected. Fake scan blocked.' });
    }

    // Establish "Late" vs "Present" (e.g. within 15 minutes of lecture session creation is Present)
    const sessionTime = new Date(session.createdAt).getTime();
    const currentTime = Date.now();
    const diffMins = (currentTime - sessionTime) / (60 * 1000);
    const status = diffMins <= 15 ? 'Present' : 'Late';

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      sessionId,
      studentId: user.id,
      studentName: user.fullName,
      studentMatric: user.matricNo || 'N/A',
      timestamp: new Date().toISOString(),
      status,
      deviceInfo: deviceInfo || 'Mobile Device'
    };

    Store.addAttendance(newRecord);

    // Live broadcast update to the lecturer screen via SSE
    sendSseUpdate(sessionId, { type: 'checkin', record: newRecord });

    res.status(201).json(newRecord);
  });

  // Manual record generation / override by lecturers
  app.post('/api/attendance/record', authenticateToken, requireLecturer, (req: Request, res: Response) => {
    const { sessionId, studentId, status } = req.body;
    if (!sessionId || !studentId || !status) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const student = Store.getUsers().find(u => u.id === studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check duplicate
    const records = Store.getAttendance();
    const existingIdx = records.findIndex(r => r.sessionId === sessionId && r.studentId === studentId);

    const record: AttendanceRecord = {
      id: existingIdx !== -1 ? records[existingIdx].id : `att-${Date.now()}`,
      sessionId,
      studentId,
      studentName: student.fullName,
      studentMatric: student.matricNo || 'N/A',
      timestamp: new Date().toISOString(),
      status,
      deviceInfo: 'Lecturer Manual Override'
    };

    if (existingIdx !== -1) {
      records[existingIdx] = record;
      // We must force save store changes
      fs.writeFileSync(path.join(process.cwd(), 'server', 'db.json'), JSON.stringify({
        ...JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'db.json'), 'utf-8')),
        attendance: records
      }, null, 2));
    } else {
      Store.addAttendance(record);
    }

    sendSseUpdate(sessionId, { type: 'override', record });
    res.json(record);
  });

  // --- SSE SIGNALR SIMULATION ROUTE ---

  app.get('/api/attendance/live', (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const client: SseClient = { sessionId: sessionId.toString(), res };
    sseClients.push(client);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.res !== res);
    });
  });

  // Helper to send SSE update
  function sendSseUpdate(sessionId: string, payload: any) {
    const targetClients = sseClients.filter(c => c.sessionId === sessionId);
    targetClients.forEach(c => {
      c.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
  }

  // --- INTEGRATE VITE SPA MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AttendX server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
