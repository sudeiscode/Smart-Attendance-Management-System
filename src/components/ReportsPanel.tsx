import React, { useState, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { ExportService } from '../utils/export';
import { AttendanceRecord, Course } from '../types';
import { 
  FileSpreadsheet, FileDown, Search, Filter, 
  Printer, ArrowDownAz, RefreshCw, Calendar 
} from 'lucide-react';

export default function ReportsPanel() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtering states
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        ApiService.getAttendanceRecords(),
        ApiService.getCourses()
      ]);
      setRecords(r);
      setCourses(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter computation
  const filteredRecords = records.filter(rec => {
    const matchStudent = rec.studentName.toLowerCase().includes(searchStudent.toLowerCase()) || 
                         rec.studentMatric.toLowerCase().includes(searchStudent.toLowerCase());
    const matchCourse = selectedCourse ? rec.courseCode === selectedCourse : true;
    const matchStatus = selectedStatus ? rec.status === selectedStatus : true;
    
    // Date ranges
    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && new Date(rec.timestamp) >= new Date(startDate);
    }
    if (endDate) {
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
      matchDate = matchDate && new Date(rec.timestamp) <= endLimit;
    }

    return matchStudent && matchCourse && matchStatus && matchDate;
  });

  // Pagination slice
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchStudent, selectedCourse, selectedStatus, startDate, endDate]);

  // Export handlers
  const getExportData = () => {
    const headers = ['Student Name', 'Index No', 'Course Code', 'Checked-In Time', 'Status', 'Device Info'];
    const rows = filteredRecords.map(r => [
      r.studentName,
      r.studentMatric,
      r.courseCode || 'N/A',
      new Date(r.timestamp).toLocaleString(),
      r.status,
      r.deviceInfo || 'N/A'
    ]);
    return { headers, rows };
  };

  const handleExportCsv = () => {
    const { headers, rows } = getExportData();
    ExportService.exportToCsv('attendx-attendance-report', headers, rows);
  };

  const handleExportExcel = () => {
    const { headers, rows } = getExportData();
    ExportService.exportToExcel('attendx-attendance-report', headers, rows);
  };

  const handleExportPdf = () => {
    const { headers, rows } = getExportData();
    ExportService.exportToPdf('AttendX Smart Attendance Report', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Attendance Registry Reports</h2>
          <p className="text-xs text-slate-400">Search, filter, and export fully compiled student audit reports.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
            title="Refresh registry log"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <FileSpreadsheet size={14} className="text-teal-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Printer size={14} />
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS GRID */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Student filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Student Name or Index..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Course Filter */}
        <div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="py-2 px-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          >
            <option value="">All Courses...</option>
            {courses.map(c => (
              <option key={c.id} value={c.code}>{c.code} - {c.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          >
            <option value="">All Statuses...</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Calendar size={14} />
          </span>
          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* End Date */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Calendar size={14} />
          </span>
          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* REGISTRY LOG TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Filtering registry logs...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Index No</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Checked-In Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Verification Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      No matching attendance records in register logs.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{rec.studentName}</td>
                      <td className="p-4 font-mono text-slate-500">{rec.studentMatric}</td>
                      <td className="p-4">
                        <span className="font-semibold text-indigo-600">{rec.courseCode}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(rec.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === 'Present' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : rec.status === 'Late'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[10px] truncate max-w-xs" title={rec.deviceInfo}>
                        {rec.deviceInfo || 'System Generated'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {!loading && filteredRecords.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} logs
            </span>
            <div className="flex space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-slate-600 font-bold bg-slate-100 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
