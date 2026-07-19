import React, { useState, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { User, Course, Department, Programme, Enrollment, Semester, AcademicYear } from '../types';
import { 
  Users, BookOpen, Plus, Trash2, Search, UserPlus, 
  BookMarked, School, RefreshCw, Layers 
} from 'lucide-react';

interface AdminDashboardProps {
  stats: any;
  onRefreshStats: () => void;
}

export default function AdminDashboard({ stats, onRefreshStats }: AdminDashboardProps) {
  const [subTab, setSubTab] = useState<'users' | 'courses' | 'enrollments' | 'structures'>('users');
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Forms states
  const [userForm, setUserForm] = useState({
    email: '', password: 'password', fullName: '', role: 'Student' as any,
    matricNo: '', employeeId: '', departmentId: '', programmeId: ''
  });
  const [courseForm, setCourseForm] = useState({ code: '', title: '', departmentId: '', lecturerId: '' });
  const [enrollForm, setEnrollForm] = useState({ studentId: '', courseId: '', semesterId: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [progForm, setProgForm] = useState({ name: '', departmentId: '' });

  // Load all lists
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [u, c, e, d, p, s, ay] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getCourses(),
        ApiService.getEnrollments(),
        ApiService.getDepartments(),
        ApiService.getProgrammes(),
        ApiService.getSemesters(),
        ApiService.getAcademicYears()
      ]);
      setUsers(u);
      setCourses(c);
      setEnrollments(e);
      setDepartments(d);
      setProgrammes(p);
      setSemesters(s);
      setAcademicYears(ay);
    } catch (err) {
      console.error('Error loading admin lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [subTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createUser(userForm);
      setUserForm({
        email: '', password: 'password', fullName: '', role: 'Student',
        matricNo: '', employeeId: '', departmentId: '', programmeId: ''
      });
      loadAllData();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await ApiService.deleteUser(id);
      loadAllData();
      onRefreshStats();
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createCourse(courseForm);
      setCourseForm({ code: '', title: '', departmentId: '', lecturerId: '' });
      loadAllData();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      await ApiService.deleteCourse(id);
      loadAllData();
      onRefreshStats();
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.enrollStudent(enrollForm.studentId, enrollForm.courseId, enrollForm.semesterId);
      setEnrollForm({ studentId: '', courseId: '', semesterId: '' });
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveEnrollment = async (id: string) => {
    if (confirm('Unenroll student from this course?')) {
      await ApiService.unenrollStudent(id);
      loadAllData();
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createDepartment(deptForm.name, deptForm.code);
      setDeptForm({ name: '', code: '' });
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddProg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createProgramme(progForm.name, progForm.departmentId);
      setProgForm({ name: '', departmentId: '' });
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter calculations
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = courses.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEnrollments = enrollments.filter(en => 
    en.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    en.courseCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Total Lecturers', value: stats.totalLecturers, icon: UserPlus, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Total Sessions', value: stats.totalSessions, icon: Layers, color: 'text-violet-600 bg-violet-50 border-violet-100' },
          { label: 'Attendance Rate', value: `${stats.overallAttendanceRate || 100}%`, icon: BookMarked, color: 'text-sky-600 bg-sky-50 border-sky-100' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-4 rounded-2xl border bg-white shadow-sm flex items-center space-x-4`}>
              <div className={`p-3 rounded-xl ${stat.color} shrink-0`}>
                <Icon size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
                <span className="text-xl font-bold text-slate-800">{stat.value ?? '...'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Module Navigation Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex space-x-2">
            {[
              { id: 'users', label: 'User Provisioning', icon: Users },
              { id: 'courses', label: 'Course Catalog', icon: BookOpen },
              { id: 'enrollments', label: 'Student Enrollment', icon: BookMarked },
              { id: 'structures', label: 'Academic Structures', icon: School }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSel = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSubTab(tab.id as any);
                    setSearchQuery('');
                  }}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSel 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAllData}
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
              title="Refresh lists"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-48 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SUBTAB CONTENTS */}
        <div className="p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading catalog assets...</p>
            </div>
          ) : (
            <>
              {/* USERS PROVISIONING */}
              {subTab === 'users' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Register Form */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                      <UserPlus size={16} className="text-indigo-600" />
                      <span>Provision User Identity</span>
                    </h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Full Name</label>
                        <input
                          type="text" required
                          placeholder="e.g. Dr. Jane Smith"
                          value={userForm.fullName}
                          onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</label>
                        <input
                          type="email" required
                          placeholder="janesmith@attendx.edu"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Identity Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="Student">Student (Access-only)</option>
                          <option value="Lecturer">Lecturer (Session creator)</option>
                          <option value="Admin">Administrator (System-wide)</option>
                        </select>
                      </div>

                      {userForm.role === 'Student' && (
                        <>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Index Number (Unique)</label>
                            <input
                              type="text" required
                              placeholder="e.g. SRI.41.008.001.23"
                              value={userForm.matricNo}
                              onChange={(e) => setUserForm({ ...userForm, matricNo: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Academic Programme</label>
                            <select
                              required
                              value={userForm.programmeId}
                              onChange={(e) => setUserForm({ ...userForm, programmeId: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="">Select Programme...</option>
                              {programmes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {userForm.role === 'Lecturer' && (
                        <>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Employee ID</label>
                            <input
                              type="text" required
                              placeholder="EMP822"
                              value={userForm.employeeId}
                              onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Parent Department</label>
                            <select
                              required
                              value={userForm.departmentId}
                              onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="">Select Department...</option>
                              {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm flex items-center justify-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Add Identity</span>
                      </button>
                    </form>
                  </div>

                  {/* List View */}
                  <div className="lg:col-span-2 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3">User</th>
                          <th className="pb-3">Role</th>
                          <th className="pb-3">Key Credential</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 pr-2">
                              <p className="font-semibold text-slate-800">{u.fullName}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </td>
                            <td className="py-3.5 pr-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'Admin' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                  : u.role === 'Lecturer'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3.5 text-slate-600">
                              {u.role === 'Student' ? u.matricNo : u.role === 'Lecturer' ? u.employeeId : 'N/A'}
                            </td>
                            <td className="py-3.5 text-right">
                              {u.id !== 'u-admin-1' && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* COURSE CATALOG */}
              {subTab === 'courses' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Register Form */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                      <BookOpen size={16} className="text-amber-600" />
                      <span>Introduce New Course</span>
                    </h3>
                    <form onSubmit={handleAddCourse} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Course Code</label>
                        <input
                          type="text" required
                          placeholder="e.g. CS302"
                          value={courseForm.code}
                          onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Course Title</label>
                        <input
                          type="text" required
                          placeholder="e.g. Software Architecture"
                          value={courseForm.title}
                          onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Department</label>
                        <select
                          required
                          value={courseForm.departmentId}
                          onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Select Department...</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Lecturer</label>
                        <select
                          required
                          value={courseForm.lecturerId}
                          onChange={(e) => setCourseForm({ ...courseForm, lecturerId: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Select Lecturer...</option>
                          {users.filter(u => u.role === 'Lecturer').map(l => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm flex items-center justify-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Add Course</span>
                      </button>
                    </form>
                  </div>

                  {/* List View */}
                  <div className="lg:col-span-2 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3">Code</th>
                          <th className="pb-3">Title</th>
                          <th className="pb-3">Department</th>
                          <th className="pb-3">Lecturer</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCourses.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 pr-2 font-mono font-bold text-slate-700">{c.code}</td>
                            <td className="py-3.5 pr-2 font-semibold text-slate-800">{c.title}</td>
                            <td className="py-3.5 pr-2 text-slate-500">{c.departmentName}</td>
                            <td className="py-3.5 text-slate-600">{c.lecturerName}</td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteCourse(c.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ENROLLMENT REGISTRY */}
              {subTab === 'enrollments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Register Form */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                      <BookMarked size={16} className="text-violet-600" />
                      <span>Map Course Enrollment</span>
                    </h3>
                    <form onSubmit={handleAddEnrollment} className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Student</label>
                        <select
                          required
                          value={enrollForm.studentId}
                          onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Select Student...</option>
                          {users.filter(u => u.role === 'Student').map(s => (
                            <option key={s.id} value={s.id}>{s.fullName} ({s.matricNo})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Course</label>
                        <select
                          required
                          value={enrollForm.courseId}
                          onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Select Course...</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Semester Selection</label>
                        <select
                          required
                          value={enrollForm.semesterId}
                          onChange={(e) => setEnrollForm({ ...enrollForm, semesterId: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Select Semester...</option>
                          {semesters.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold shadow-sm flex items-center justify-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Confirm Enrollment</span>
                      </button>
                    </form>
                  </div>

                  {/* List View */}
                  <div className="lg:col-span-2 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Index No</th>
                          <th className="pb-3">Course Code</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEnrollments.map(en => (
                          <tr key={en.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 pr-2 font-semibold text-slate-800">{en.studentName}</td>
                            <td className="py-3.5 pr-2 text-slate-500 font-mono">{en.studentMatric}</td>
                            <td className="py-3.5 pr-2 text-indigo-600 font-semibold">{en.courseCode}</td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => handleRemoveEnrollment(en.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ACADEMIC STRUCTURES */}
              {subTab === 'structures' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Department Panel */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                        <School size={16} className="text-sky-600" />
                        <span>Manage Departments</span>
                      </h3>
                      <form onSubmit={handleAddDept} className="space-y-3 mb-6">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text" required
                              placeholder="Department Name"
                              value={deptForm.name}
                              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text" required
                              placeholder="Code"
                              value={deptForm.code}
                              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-1.5 text-xs font-semibold"
                        >
                          Create Department
                        </button>
                      </form>
                    </div>

                    <div className="overflow-y-auto max-h-48 border border-slate-200 rounded-lg bg-white p-2">
                      {departments.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 text-xs">
                          <div>
                            <span className="font-bold text-slate-700 font-mono mr-2">[{d.code}]</span>
                            <span className="text-slate-600">{d.name}</span>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete ${d.name}?`)) {
                                await ApiService.deleteDepartment(d.id);
                                loadAllData();
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Programmes Panel */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                        <School size={16} className="text-emerald-600" />
                        <span>Manage Programmes</span>
                      </h3>
                      <form onSubmit={handleAddProg} className="space-y-3 mb-6">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text" required
                            placeholder="Programme Name"
                            value={progForm.name}
                            onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <select
                            required
                            value={progForm.departmentId}
                            onChange={(e) => setProgForm({ ...progForm, departmentId: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">Department...</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-1.5 text-xs font-semibold"
                        >
                          Create Programme
                        </button>
                      </form>
                    </div>

                    <div className="overflow-y-auto max-h-48 border border-slate-200 rounded-lg bg-white p-2">
                      {programmes.map(p => {
                        const dept = departments.find(d => d.id === p.departmentId);
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 text-xs">
                            <div>
                              <span className="font-semibold text-slate-700">{p.name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 ml-2 px-1 py-0.5 rounded">
                                {dept ? dept.code : 'Unknown'}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete ${p.name}?`)) {
                                  await ApiService.deleteProgramme(p.id);
                                  loadAllData();
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
