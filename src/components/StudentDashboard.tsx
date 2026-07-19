import React, { useState, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { Course, AttendanceRecord, User, LectureSession } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  CheckCircle, AlertTriangle, XCircle, Camera, QrCode, BookOpen, 
  Clock, ShieldAlert, BadgeHelp, RefreshCw, Send, Check, Play 
} from 'lucide-react';

interface StudentDashboardProps {
  stats: any;
  user: User;
  onRefreshStats: () => void;
}

export default function StudentDashboard({ stats, user, onRefreshStats }: StudentDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<LectureSession[]>([]);
  
  // Scans/Attendance States
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string; record?: AttendanceRecord }>({ status: 'idle', message: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load student courses and history logs
  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [allCourses, allRecords, allSessions] = await Promise.all([
        ApiService.getCourses(),
        ApiService.getAttendanceRecords(),
        ApiService.getSessions()
      ]);
      
      // Filter enrolled courses
      const enrolls = await ApiService.getEnrollments();
      const myCourseIds = enrolls.filter(e => e.studentId === user.id).map(e => e.courseId);
      setCourses(allCourses.filter(c => myCourseIds.includes(c.id)));
      
      setRecords(allRecords.filter(r => r.studentId === user.id));
      setActiveSessions(allSessions.filter(s => s.isActive && myCourseIds.includes(s.courseId)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
    
    // Real-time refresh loop to keep records and active lecture sessions updated in real-time!
    const interval = setInterval(() => {
      // Background non-intrusive fetch (no full loading state to prevent screen flickering)
      ApiService.getCourses().then(allCourses => {
        return Promise.all([
          Promise.resolve(allCourses),
          ApiService.getAttendanceRecords(),
          ApiService.getSessions(),
          ApiService.getEnrollments()
        ]);
      }).then(([allCourses, allRecords, allSessions, enrolls]) => {
        const myCourseIds = enrolls.filter(e => e.studentId === user.id).map(e => e.courseId);
        setCourses(allCourses.filter(c => myCourseIds.includes(c.id)));
        setRecords(allRecords.filter(r => r.studentId === user.id));
        setActiveSessions(allSessions.filter(s => s.isActive && myCourseIds.includes(s.courseId)));
      }).catch(err => console.error("Real-time poll error:", err));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Handle Scan claiming (called by camera parser or manual copy-paste)
  const handleClaimAttendance = async (rawCode: string) => {
    setScanResult({ status: 'idle', message: '' });
    if (!rawCode) return;

    try {
      // Parse QR code payload.
      // Payload can be a JSON string: {"sessionId": "...", "token": "..."}
      let parsed;
      try {
        parsed = JSON.parse(rawCode);
      } catch (err) {
        // Fallback if rawCode is just pasted token (we take it as manual token and require they select a session, or we look up active sessions)
        throw new Error('Malformed Attendance Code. Please scan or paste the correct JSON payload.');
      }

      const { sessionId, token } = parsed;
      if (!sessionId || !token) {
        throw new Error('Invalid Attendance Code format. Missing keys.');
      }

      const data = await ApiService.scanQr(sessionId, token, `${navigator.platform} / ${navigator.userAgent.slice(0, 30)}`);
      setScanResult({
        status: 'success',
        message: `Successfully checked in as ${data.status}!`,
        record: data
      });
      setCameraActive(false);
      onRefreshStats();
      loadStudentData();
    } catch (err: any) {
      setScanResult({
        status: 'error',
        message: err.message || 'Verification failed. QR code may be expired.'
      });
    }
  };

  // Setup camera scanner using html5-qrcode
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    if (cameraActive) {
      // Small timeout to let DOM render element
      setTimeout(() => {
        try {
          const html5QrcodeScanner = new Html5Qrcode("scanner-stage");
          scanner = html5QrcodeScanner;
          
          html5QrcodeScanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (qrCodeMessage: string) => {
              handleClaimAttendance(qrCodeMessage);
            },
            (errorMessage: string) => {
              // benign error tracking
            }
          ).catch((err: any) => {
            console.error("Camera startup error:", err);
          });
        } catch (e) {
          console.error("html5-qrcode not loaded yet", e);
        }
      }, 300);
    }

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch((e: any) => console.error(e));
      }
    };
  }, [cameraActive]);

  // Alert flags for low attendance rates (<75%)
  const isFlagged = (stats.attendancePercentage ?? 100) < 75;

  return (
    <div className="space-y-8">
      {/* Stats row with beautiful alert thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attended Rate Block */}
        <div className={`p-6 rounded-2xl border bg-white shadow-sm relative overflow-hidden flex items-center justify-between`}>
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
            <span className={`text-3xl font-extrabold ${isFlagged ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.attendancePercentage ?? '100'}%
            </span>
            <span className="text-xs text-slate-400 block font-medium">
              {isFlagged ? '⚠️ Warning: Under 75% limit' : '✅ Good standing'}
            </span>
          </div>
          <div className={`p-4 rounded-xl ${isFlagged ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
            {isFlagged ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
        </div>

        {/* Attended Count Block */}
        <div className="p-6 rounded-2xl border bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Lectures Checked-in</span>
            <span className="text-3xl font-extrabold text-slate-800">{stats.attendedCount ?? '0'}</span>
            <span className="text-xs text-slate-400 block font-medium">Valid verified sessions</span>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50 text-indigo-500">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Missed Count Block */}
        <div className="p-6 rounded-2xl border bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Missed / Flagged Lectures</span>
            <span className="text-3xl font-extrabold text-slate-800">{stats.missedCount ?? '0'}</span>
            <span className="text-xs text-slate-400 block font-medium">Absentee counts</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-100 text-slate-500">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Real-time Active Sessions Banner */}
      {activeSessions.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <h3 className="text-sm font-bold text-rose-800 flex items-center space-x-2">
            <span>🔴 Live Active Lectures</span>
          </h3>
          <p className="text-xs text-rose-600 mt-1">
            Lecturers are hosting active sessions for your enrolled courses right now. Tap to check-in.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => {
                  setCameraActive(true);
                  setScanResult({ status: 'idle', message: '' });
                }}
                className="p-4 bg-white border border-rose-100 hover:border-rose-300 rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[9px] font-bold font-mono text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                    {session.courseCode || 'Course'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-2">{session.courseTitle || 'Active Lecture'}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{session.dateTimeslot}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-rose-600 font-bold">
                  <span>Open QR Scanner</span>
                  <Camera size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CORE QR SCAN MODULES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Verification scanning panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center space-x-2">
              <QrCode size={16} className="text-indigo-600" />
              <span>Attendance Verification</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Claim your attendance for active classes by scanning the dynamic presentation QR or inputting the encrypted cryptographic code directly.
            </p>

            {/* SCANNING SCREEN VIEW */}
            {cameraActive ? (
              <div className="space-y-4">
                <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative" id="scanner-stage-container">
                  <div id="scanner-stage" className="w-full h-full" />
                  <div className="absolute inset-4 border-2 border-indigo-500/30 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-500 border-dashed rounded-lg animate-pulse" />
                  </div>
                </div>
                <button
                  onClick={() => setCameraActive(false)}
                  className="w-full py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel Scan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Trigger Button */}
                <button
                  onClick={() => {
                    setCameraActive(true);
                    setScanResult({ status: 'idle', message: '' });
                  }}
                  className="w-full py-6 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl font-bold text-xs flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer"
                >
                  <Camera size={24} />
                  <span>Tap to Scan Dynamic QR Code</span>
                </button>

                {/* Direct text code pasting fallback (extremely useful inside iframe sandbox!) */}
                <div className="relative pt-4 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Or paste code payload manually:</span>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder='{"sessionId":"...","token":"..."}'
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      onClick={() => handleClaimAttendance(manualCode)}
                      className="bg-slate-900 text-white hover:bg-black px-3.5 rounded-lg text-xs font-semibold shrink-0 flex items-center justify-center"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SUCCESS / ERROR RESULT PROMPTS */}
          {scanResult.status !== 'idle' && (
            <div className={`mt-6 p-4 rounded-xl border flex items-start space-x-3 text-xs transition-all ${
              scanResult.status === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {scanResult.status === 'success' ? (
                <>
                  <CheckCircle className="shrink-0 text-emerald-600 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="font-bold">{scanResult.message}</p>
                    <p className="text-[10px] text-emerald-600/80 font-mono">
                      Timestamp: {new Date(scanResult.record?.timestamp || '').toLocaleTimeString()}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="shrink-0 text-rose-600 mt-0.5" size={16} />
                  <p className="font-semibold">{scanResult.message}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* MY ENROLLED COURSES RATINGS */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-full justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center space-x-2">
              <BookOpen size={16} className="text-indigo-600" />
              <span>My Academic Catalog</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Listing of your currently enrolled courses for this term. Keep your rates above 75% to stay eligible for final examinations.
            </p>

            <div className="space-y-3">
              {courses.map(course => {
                // calculate course specific rate
                const courseSessions = records.filter(r => r.courseCode === course.code);
                const coursePresent = courseSessions.filter(r => r.status === 'Present' || r.status === 'Late').length;
                const courseRate = courseSessions.length > 0 ? Math.round((coursePresent / courseSessions.length) * 100) : 100;

                return (
                  <div key={course.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        {course.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-700 mt-1.5 line-clamp-1">{course.title}</h4>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      courseRate < 75 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {courseRate}% Rate
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-slate-400">
            <BadgeHelp size={14} className="shrink-0 text-slate-300" />
            <span>Attendance rates are compiled in real-time.</span>
          </div>
        </div>

        {/* RECENT HISTORIC CHECKINS */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-full justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center space-x-2">
              <Clock size={16} className="text-indigo-600" />
              <span>Personal Check-in Log</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">
              Historical timeline of your authenticated check-in timestamps.
            </p>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {records.length === 0 ? (
                <div className="py-10 text-center text-slate-300 italic text-xs">
                  No attendance records logged yet.
                </div>
              ) : (
                records.map(rec => (
                  <div key={rec.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{rec.courseCode}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {new Date(rec.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.status === 'Present' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Identity: {user.fullName}</span>
            <span>Index No: <span className="font-mono font-bold">{user.matricNo}</span></span>
          </div>
        </div>

      </div>
    </div>
  );
}
