import React, { useState, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { Course, LectureSession, AttendanceRecord, User } from '../types';
import { 
  Play, Square, QrCode, RefreshCw, Layers, Users, BookOpen, 
  Calendar, CheckCircle, ShieldAlert, Edit, Save, ListFilter, UserX 
} from 'lucide-react';

interface LecturerDashboardProps {
  stats: any;
  user: User;
  onRefreshStats: () => void;
}

export default function LecturerDashboard({ stats, user, onRefreshStats }: LecturerDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [activeSession, setActiveSession] = useState<LectureSession | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [checkedInStudents, setCheckedInStudents] = useState<AttendanceRecord[]>([]);
  
  // Manual edit states
  const [selectedSessionForOverride, setSelectedSessionForOverride] = useState<string>('');
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [manualRecord, setManualRecord] = useState({ studentId: '', status: 'Present' });
  
  // New features states: tab switcher and student registry
  const [activeTab, setActiveTab] = useState<'attendance' | 'directory'>('attendance');
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  
  const [studentForm, setStudentForm] = useState({ fullName: '', email: '', password: 'password123', matricNo: '' });
  const [newCourseForm, setNewCourseForm] = useState({ code: '', title: '' });
  const [enrollForm, setEnrollForm] = useState({ studentId: '', courseId: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // SSE EventSource for real-time SignalR simulation
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (activeSession) {
      // Connect to server-sent events for real-time SignalR updates!
      eventSource = new EventSource(`/api/attendance/live?sessionId=${activeSession.id}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'checkin' || data.type === 'override') {
          // Slide in the new checked in student
          setCheckedInStudents(prev => {
            const exists = prev.some(r => r.studentId === data.record.studentId);
            if (exists) {
              return prev.map(r => r.studentId === data.record.studentId ? data.record : r);
            }
            return [data.record, ...prev];
          });
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection lost. Reconnecting...');
      };
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [activeSession]);

  // Load lecturer courses and past sessions
  const loadLecturerData = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        ApiService.getCourses(),
        ApiService.getSessions()
      ]);
      const myCourses = c.filter(item => item.lecturerId === user.id);
      setCourses(myCourses);
      setSessions(s);

      // Restore active session if any exists
      const active = s.find(item => item.isActive);
      if (active) {
        setActiveSession(active);
        // Load initial records already scanned
        const records = await ApiService.getAttendanceRecords();
        setCheckedInStudents(records.filter(r => r.sessionId === active.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDirectoryData = async () => {
    try {
      const [users, enrolls] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getEnrollments()
      ]);
      setAllStudents(users.filter(u => u.role === 'Student'));
      setAllEnrollments(enrolls);
    } catch (err) {
      console.error('Error loading directory data:', err);
    }
  };

  useEffect(() => {
    loadLecturerData();
  }, []);

  useEffect(() => {
    if (activeTab === 'directory') {
      loadDirectoryData();
    }
  }, [activeTab]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseForm.code || !newCourseForm.title) return;
    try {
      await ApiService.createCourse({
        code: newCourseForm.code.toUpperCase(),
        title: newCourseForm.title,
        lecturerId: user.id
      });
      alert(`Course ${newCourseForm.code.toUpperCase()} created successfully!`);
      setNewCourseForm({ code: '', title: '' });
      loadLecturerData();
    } catch (err: any) {
      alert(err.message || 'Failed to create course');
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.fullName || !studentForm.email || !studentForm.matricNo) return;
    try {
      await ApiService.createUser({
        fullName: studentForm.fullName,
        email: studentForm.email,
        password: studentForm.password || 'password123',
        role: 'Student',
        matricNo: studentForm.matricNo
      });
      alert(`Student ${studentForm.fullName} registered successfully in database!`);
      setStudentForm({ fullName: '', email: '', password: 'password123', matricNo: '' });
      loadDirectoryData();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Failed to create student');
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.studentId || !enrollForm.courseId) return;
    try {
      await ApiService.enrollStudent(enrollForm.studentId, enrollForm.courseId, 'sem-1');
      alert('Student successfully enrolled in course catalog!');
      setEnrollForm({ studentId: '', courseId: '' });
      loadDirectoryData();
    } catch (err: any) {
      alert(err.message || 'Failed to enroll student');
    }
  };

  // Fetch rotating dynamic QR token
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchQr = async () => {
      if (!activeSession) return;
      try {
        const data = await ApiService.getSessionQr(activeSession.id);
        // Combine SessionId + Dynamic Signed Hash Token
        const qrDataPayload = JSON.stringify({
          sessionId: data.sessionId,
          token: data.token
        });
        setQrToken(qrDataPayload);
        setExpiresIn(data.expiresInMs);
      } catch (err) {
        console.error('Failed to load rolling QR key:', err);
      }
    };

    if (activeSession) {
      fetchQr();
      // Tick every 8 seconds to fetch newly signed OTP
      timer = setInterval(fetchQr, 8000);
    }

    return () => clearInterval(timer);
  }, [activeSession]);

  // Progress Bar Expiry countdown
  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    if (expiresIn > 0) {
      progressTimer = setInterval(() => {
        setExpiresIn(prev => Math.max(0, prev - 100));
      }, 100);
    }
    return () => clearInterval(progressTimer);
  }, [expiresIn]);

  // Start active session
  const handleStartSession = async (courseId: string) => {
    setError('');
    try {
      const activeSem = 'sem-1'; // Seed default
      const data = await ApiService.startSession(courseId, activeSem);
      setActiveSession(data);
      setCheckedInStudents([]);
      onRefreshStats();
      loadLecturerData();
    } catch (err: any) {
      setError(err.message || 'Could not launch lecture session');
    }
  };

  // End active session
  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await ApiService.endSession(activeSession.id);
      setActiveSession(null);
      setQrToken('');
      onRefreshStats();
      loadLecturerData();
    } catch (err: any) {
      setError(err.message || 'Failed to stop session');
    }
  };

  // Select a session to perform manual attendance modification
  const handleSelectSessionForOverride = async (sessId: string) => {
    setSelectedSessionForOverride(sessId);
    if (!sessId) return;

    try {
      // Load enrolled students of this course to populate select box
      const sess = sessions.find(s => s.id === sessId);
      if (!sess) return;

      const [usersList, enrolls] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getEnrollments()
      ]);

      const courseEnrolledStudentIds = enrolls
        .filter(e => e.courseId === sess.courseId)
        .map(e => e.studentId);

      const enrolled = usersList.filter(u => courseEnrolledStudentIds.includes(u.id));
      setEnrolledStudents(enrolled);
      
      if (enrolled.length > 0) {
        setManualRecord({ studentId: enrolled[0].id, status: 'Present' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForOverride || !manualRecord.studentId) return;

    try {
      await ApiService.overrideAttendance(
        selectedSessionForOverride,
        manualRecord.studentId,
        manualRecord.status
      );
      alert('Attendance override logged successfully!');
      onRefreshStats();
      loadLecturerData();
    } catch (err: any) {
      alert(err.message || 'Override failed');
    }
  };

  const attendancePercentage = (checkedInStudents.length / (enrolledStudents.length || 100)) * 100;

  return (
    <div className="space-y-8">
      {/* Header with Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Lecturer Control Station</h2>
          <p className="text-xs text-slate-400">Manage your active lecture sessions, students, and course registrations</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl mt-3 sm:mt-0 max-w-sm shrink-0">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'attendance' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode size={14} />
            <span>Attendance Console</span>
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'directory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={14} />
            <span>Students & Courses</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', value: stats.myCoursesCount, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Total Sessions', value: stats.totalSessions, icon: Layers, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Active Sessions', value: stats.activeSessionsCount, icon: QrCode, color: 'text-rose-600 bg-rose-50 border-rose-100' },
          { label: 'Overall Attendance', value: `${stats.overallAttendanceRate || 100}%`, icon: CheckCircle, color: 'text-amber-600 bg-amber-50 border-amber-100' }
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
              <div className={`p-3 rounded-xl shrink-0 ${item.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{item.label}</span>
                <span className="text-xl font-bold text-slate-800">{item.value ?? '0'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'attendance' ? (
        <>
          {/* ACTIVE PRESENTATION SCREEN */}
          {activeSession ? (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white">
              <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  <div>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Live Presentation View</span>
                    <h2 className="text-lg font-bold">{activeSession.courseCode} - {activeSession.courseTitle}</h2>
                  </div>
                </div>
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <Square size={14} />
                  <span>End Lecture Session</span>
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Countdown and rotating QR code */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                  <p className="text-xs text-slate-400 mb-4 max-w-sm text-center">
                    Students scan the rotating dynamic QR code using the AttendX Mobile portal.
                    OTP token updates to block proxy scans.
                  </p>

                  {/* Center dynamic QR code */}
                  <div className="p-6 bg-white rounded-3xl border border-slate-700 shadow-inner flex items-center justify-center">
                    {qrToken ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrToken)}`}
                        alt="Active Dynamic QR"
                        className="w-56 h-56 block transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-2xl">
                        <div className="w-8 h-8 border-3 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Countdown rotating progress bar */}
                  <div className="w-full max-w-xs mt-6 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Cryptographic signature rotating...</span>
                      <span className="font-mono text-indigo-400">{Math.round(expiresIn / 1000)}s</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-100 ease-linear rounded-full"
                        style={{ width: `${(expiresIn / 8000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live attendee roll (Simulated SignalR checklist) */}
                <div className="h-full flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Users size={14} className="text-indigo-400" />
                      <span>Checked In ({checkedInStudents.length})</span>
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[320px] bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 space-y-2.5">
                    {checkedInStudents.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-500 space-y-2">
                        <RefreshCw size={24} className="animate-spin text-slate-600" />
                        <p className="text-xs">Waiting for student check-ins...</p>
                      </div>
                    ) : (
                      checkedInStudents.map(r => (
                        <div 
                          key={r.id} 
                          className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between transition-all"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{r.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{r.studentMatric}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'Present' 
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                              : 'bg-amber-950/50 text-amber-400 border border-amber-900/40'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* COURSE CATALOG LAUNCH SESSION */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <Play size={16} className="text-indigo-600" />
                <span>Launch Smart Lecture Session</span>
              </h3>

              {courses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No assigned courses found. Create one in the "Students & Courses" registry tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <div 
                      key={course.id} 
                      className="p-5 border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all bg-slate-50 flex flex-col justify-between"
                    >
                      <div>
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[10px] font-mono font-bold">
                          {course.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mt-2 line-clamp-1">{course.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1">{course.departmentName || 'General'}</p>
                      </div>

                      <button
                        onClick={() => handleStartSession(course.id)}
                        className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm flex items-center justify-center space-x-1"
                      >
                        <Play size={12} />
                        <span>Generate Active QR</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL OVERRIDES CONTROL */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <Edit size={16} className="text-amber-600" />
                <span>Manual Overrides Panel</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Lecturer can manually override or insert attendance logs for any enrolled student to clear edge cases.
              </p>

              <form onSubmit={handleManualOverrideSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Session</label>
                  <select
                    required
                    value={selectedSessionForOverride}
                    onChange={(e) => handleSelectSessionForOverride(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                  >
                    <option value="">Select Lecture Session...</option>
                    {sessions.map(s => {
                      const course = courses.find(c => c.id === s.courseId);
                      return (
                        <option key={s.id} value={s.id}>
                          {course ? course.code : 'Session'} - {new Date(s.dateTimeslot).toLocaleDateString()}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedSessionForOverride && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Student</label>
                      {enrolledStudents.length === 0 ? (
                        <span className="text-xs text-slate-400 block italic">No students enrolled in this course</span>
                      ) : (
                        <select
                          required
                          value={manualRecord.studentId}
                          onChange={(e) => setManualRecord({ ...manualRecord, studentId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                        >
                          {enrolledStudents.map(st => (
                            <option key={st.id} value={st.id}>{st.fullName} ({st.matricNo})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mark Status</label>
                      <select
                        value={manualRecord.status}
                        onChange={(e) => setManualRecord({ ...manualRecord, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                      >
                        <option value="Present">Present (Checked-in)</option>
                        <option value="Late">Late Check-in</option>
                        <option value="Absent">Absent (Flagged)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={enrolledStudents.length === 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <Save size={12} />
                      <span>Save Record Override</span>
                    </button>
                  </>
                )}
              </form>
            </div>

            {/* PAST SESSIONS HISTORIC LOG */}
            <div className="lg:col-span-2 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <ListFilter size={16} className="text-indigo-600" />
                <span>Lecture History Registry</span>
              </h3>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3">Course</th>
                      <th className="pb-3">Session Date</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map(s => {
                      const course = courses.find(c => c.id === s.courseId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3 pr-2">
                            <p className="font-bold text-slate-700">{course ? course.code : 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{course ? course.title : 'Lecture Session'}</p>
                          </td>
                          <td className="py-3 pr-2 text-slate-500 font-mono">
                            {new Date(s.dateTimeslot).toLocaleString()}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.isActive 
                                ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {s.isActive ? 'Active Now' : 'Completed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* --- DIRECTORY TAB (MANAGE STUDENTS, COURSES, AND ENROLLMENTS) --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Course Panel */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
              <BookOpen size={16} className="text-indigo-600" />
              <span>Create New Course</span>
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS404"
                  value={newCourseForm.code}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newCourseForm.title}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm transition-all"
              >
                Create Academic Course
              </button>
            </form>
          </div>

          {/* Add Student Panel */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
              <Users size={16} className="text-indigo-600" />
              <span>Register New Student</span>
            </h3>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sudeis Alhassan"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@attendx.edu"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Index Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SRI.41.008.001.23"
                  value={studentForm.matricNo}
                  onChange={(e) => setStudentForm({ ...studentForm, matricNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Set Password</label>
                <input
                  type="password"
                  placeholder="Default password123"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm transition-all"
              >
                Register Student
              </button>
            </form>
          </div>

          {/* Enroll Student Panel */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
              <Calendar size={16} className="text-indigo-600" />
              <span>Enroll Student in Course</span>
            </h3>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Student</label>
                <select
                  required
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                >
                  <option value="">Select student...</option>
                  {allStudents.map(st => (
                    <option key={st.id} value={st.id}>{st.fullName} ({st.matricNo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Course</label>
                <select
                  required
                  value={enrollForm.courseId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                >
                  <option value="">Select course...</option>
                  {courses.map(co => (
                    <option key={co.id} value={co.id}>{co.code} - {co.title}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm transition-all"
              >
                Authorize Enrollment
              </button>
            </form>
          </div>

          {/* Registry Table List */}
          <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Course Enrollments Database
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Index No</th>
                    <th className="pb-3">Enrolled Course</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allEnrollments.map(item => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-700">{item.studentName || 'Student'}</td>
                        <td className="py-3 font-mono text-slate-500">{item.studentMatric || 'N/A'}</td>
                        <td className="py-3">
                          <span className="font-bold text-indigo-600 mr-2">{item.courseCode}</span>
                          <span className="text-slate-500 text-[10px]">{item.courseTitle}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                            Enrolled
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {allEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">No course enrollments logged in system</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
