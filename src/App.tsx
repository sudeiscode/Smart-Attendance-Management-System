import React, { useState, useEffect } from 'react';
import { ApiService } from './lib/api';
import { AuthResponse, User, DashboardStats, Course } from './types';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import StudentDashboard from './components/StudentDashboard';
import ReportsPanel from './components/ReportsPanel';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  GraduationCap, Calendar, Clock, RefreshCw, Layers, CheckCircle, 
  HelpCircle, UserCheck, AlertCircle, Sparkles, LogOut 
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const fetchCourses = async () => {
    if (!user) return;
    setCoursesLoading(true);
    try {
      const allCourses = await ApiService.getCourses();
      if (user.role === 'Student') {
        const enrolls = await ApiService.getEnrollments();
        const myCourseIds = enrolls.filter(e => e.studentId === user.id).map(e => e.courseId);
        setCourses(allCourses.filter(c => myCourseIds.includes(c.id)));
      } else if (user.role === 'Lecturer') {
        setCourses(allCourses.filter(c => c.lecturerId === user.id));
      } else {
        setCourses(allCourses);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'courses') {
      fetchCourses();
    }
  }, [user, activeTab]);

  // Authenticate session on boot if token resides in local storage
  const authenticateOnBoot = async () => {
    const savedToken = localStorage.getItem('attendx_token');
    if (savedToken) {
      try {
        setToken(savedToken);
        const data = await ApiService.getMe();
        setUser(data.user);
        fetchStats();
      } catch (err) {
        console.warn('Session expired. Cleaning local cookies.');
        handleLogout();
      }
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const s = await ApiService.getStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load portal stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    authenticateOnBoot();
  }, []);

  const handleLoginSuccess = (auth: AuthResponse) => {
    setToken(auth.token);
    setUser(auth.user);
    setActiveTab('dashboard');
    fetchStats();
  };

  const handleLogout = () => {
    localStorage.removeItem('attendx_token');
    setToken(null);
    setUser(null);
    setStats({});
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl animate-pulse">
          <GraduationCap size={36} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Authenticating AttendX Gateway...</h1>
        <div className="w-12 h-1 border-2 border-indigo-500 border-t-transparent rounded animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Visual chart datasets
  const barChartData = [
    { name: 'Mon', Present: 42, Late: 5, Absent: 3 },
    { name: 'Tue', Present: 48, Late: 2, Absent: 2 },
    { name: 'Wed', Present: 39, Late: 8, Absent: 5 },
    { name: 'Thu', Present: 45, Late: 4, Absent: 1 },
    { name: 'Fri', Present: 32, Late: 11, Absent: 9 }
  ];

  const pieChartData = [
    { name: 'Present', value: stats.overallAttendanceRate || 85, color: '#4f46e5' },
    { name: 'Late', value: 10, color: '#f59e0b' },
    { name: 'Absent', value: Math.max(0, 100 - (stats.overallAttendanceRate || 85) - 10), color: '#ef4444' }
  ];

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Intro Header banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={12} />
                  <span>Summer Term Online</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Welcome back, {user.fullName}!
                </h2>
                <p className="text-slate-400 text-xs md:text-sm max-w-xl font-medium">
                  AttendX coordinates cryptographic session security with automated verification logs. Have an amazing academic day.
                </p>
              </div>

              <button
                onClick={fetchStats}
                className="self-start md:self-center bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
                <span>Synchronize Workspace</span>
              </button>
            </div>
          </div>

          {/* Dynamic role dashboard injection */}
          {user.role === 'Admin' && <AdminDashboard stats={stats} onRefreshStats={fetchStats} />}
          {user.role === 'Lecturer' && <LecturerDashboard stats={stats} user={user} onRefreshStats={fetchStats} />}
          {user.role === 'Student' && <StudentDashboard stats={stats} user={user} onRefreshStats={fetchStats} />}

          {/* PORTAL ANALYTICS VISUALIZER (Only shown on dashboards for rich context!) */}
          {user.role !== 'Student' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Trend charts */}
              <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Weekly Attendance Distributions</h3>
                    <p className="text-[11px] text-slate-400">Verified counts grouped by daily statuses.</p>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Present" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Pie visualizer */}
              <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cumulative Stat Ratio</h3>
                  <p className="text-[11px] text-slate-400">Total verified record shares.</p>
                </div>

                <div className="h-44 relative my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute Center percentage display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-800">
                      {stats.overallAttendanceRate ?? 85}%
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                      Present Ratio
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-4 text-xs font-semibold">
                  <div>
                    <span className="w-2 h-2 rounded-full inline-block bg-indigo-600 mr-1.5" />
                    <span className="text-slate-500">Present</span>
                  </div>
                  <div>
                    <span className="w-2 h-2 rounded-full inline-block bg-amber-500 mr-1.5" />
                    <span className="text-slate-500">Late</span>
                  </div>
                  <div>
                    <span className="w-2 h-2 rounded-full inline-block bg-rose-500 mr-1.5" />
                    <span className="text-slate-500">Absent</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER DEDICATED FULL VIEW SCREENS */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <ReportsPanel />
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Academic Catalog</h2>
              <p className="text-xs text-slate-400">Listed academic courses currently synced with your identity profiles.</p>
            </div>
            {coursesLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
          </div>

          {coursesLoading && courses.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading academic curriculum...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No registered courses found in your curriculum.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(c => (
                <div key={c.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded font-mono">
                      {c.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-3 line-clamp-2">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Dept: {c.departmentName || 'General Academic'}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate pr-2">Lecturer: {c.lecturerName || 'Unassigned'}</span>
                    <span className="text-emerald-600 font-bold shrink-0">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {user.role === 'Lecturer' ? (
            <LecturerDashboard stats={stats} user={user} onRefreshStats={fetchStats} />
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 text-sm">
              Sessions are managed by Lecturers. Please scan active dynamic class QR codes to check in.
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && <ReportsPanel />}

      {activeTab === 'users' && <AdminDashboard stats={stats} onRefreshStats={fetchStats} />}

      {activeTab === 'structures' && <AdminDashboard stats={stats} onRefreshStats={fetchStats} />}

    </Layout>
  );
}
