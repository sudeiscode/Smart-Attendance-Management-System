import { AuthResponse, User, DashboardStats, AcademicYear, Semester, Department, Programme, Course, Enrollment, LectureSession, AttendanceRecord } from '../types';

const API_BASE = '/api';

export class ApiService {
  private static getHeaders() {
    const token = localStorage.getItem('attendx_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = this.getHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth APIs
  public static async login(credentials: { email: string; password?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  public static async register(userData: any): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  public static async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  // Dashboard Stats
  public static async getStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/stats');
  }

  // Academic structures
  public static async getAcademicYears(): Promise<AcademicYear[]> {
    return this.request<AcademicYear[]>('/academic-years');
  }

  public static async createAcademicYear(name: string, isCurrent: boolean): Promise<AcademicYear> {
    return this.request<AcademicYear>('/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name, isCurrent })
    });
  }

  public static async getSemesters(): Promise<Semester[]> {
    return this.request<Semester[]>('/semesters');
  }

  public static async createSemester(name: string, academicYearId: string): Promise<Semester> {
    return this.request<Semester>('/semesters', {
      method: 'POST',
      body: JSON.stringify({ name, academicYearId })
    });
  }

  public static async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/departments');
  }

  public static async createDepartment(name: string, code: string): Promise<Department> {
    return this.request<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify({ name, code })
    });
  }

  public static async deleteDepartment(id: string): Promise<void> {
    return this.request<void>(`/departments/${id}`, { method: 'DELETE' });
  }

  public static async getProgrammes(): Promise<Programme[]> {
    return this.request<Programme[]>('/programmes');
  }

  public static async createProgramme(name: string, departmentId: string): Promise<Programme> {
    return this.request<Programme>('/programmes', {
      method: 'POST',
      body: JSON.stringify({ name, departmentId })
    });
  }

  public static async deleteProgramme(id: string): Promise<void> {
    return this.request<void>(`/programmes/${id}`, { method: 'DELETE' });
  }

  public static async getCourses(): Promise<Course[]> {
    return this.request<Course[]>('/courses');
  }

  public static async createCourse(course: Partial<Course>): Promise<Course> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(course)
    });
  }

  public static async deleteCourse(id: string): Promise<void> {
    return this.request<void>(`/courses/${id}`, { method: 'DELETE' });
  }

  // User provisioning
  public static async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  public static async createUser(userData: any): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  public static async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/users/${id}`, { method: 'DELETE' });
  }

  // Enrollments
  public static async getEnrollments(): Promise<Enrollment[]> {
    return this.request<Enrollment[]>('/enrollments');
  }

  public static async enrollStudent(studentId: string, courseId: string, semesterId: string): Promise<Enrollment> {
    return this.request<Enrollment>('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ studentId, courseId, semesterId })
    });
  }

  public static async unenrollStudent(id: string): Promise<void> {
    return this.request<void>(`/enrollments/${id}`, { method: 'DELETE' });
  }

  // Sessions
  public static async getSessions(): Promise<LectureSession[]> {
    return this.request<LectureSession[]>('/sessions');
  }

  public static async startSession(courseId: string, semesterId: string): Promise<LectureSession> {
    return this.request<LectureSession>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ courseId, semesterId })
    });
  }

  public static async endSession(id: string): Promise<LectureSession> {
    return this.request<LectureSession>(`/sessions/${id}/end`, {
      method: 'POST'
    });
  }

  public static async getSessionQr(id: string): Promise<{ sessionId: string; token: string; expiresInMs: number }> {
    return this.request<{ sessionId: string; token: string; expiresInMs: number }>(`/sessions/${id}/qr`);
  }

  // Attendance
  public static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    return this.request<AttendanceRecord[]>('/attendance');
  }

  public static async scanQr(sessionId: string, token: string, deviceInfo?: string): Promise<AttendanceRecord> {
    return this.request<AttendanceRecord>('/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ sessionId, token, deviceInfo })
    });
  }

  public static async overrideAttendance(sessionId: string, studentId: string, status: string): Promise<AttendanceRecord> {
    return this.request<AttendanceRecord>('/attendance/record', {
      method: 'POST',
      body: JSON.stringify({ sessionId, studentId, status })
    });
  }
}
