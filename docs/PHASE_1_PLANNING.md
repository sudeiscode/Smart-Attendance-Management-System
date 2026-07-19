# AttendX: Smart Attendance Management System
## Phase 1: Project Planning, Software Requirements Specification (SRS), System Architecture & Database Design

Welcome to **AttendX**, a production-ready, highly secure, and real-time Smart Attendance Management System designed for schools, colleges, and universities. This document outlines the comprehensive **Phase 1 Planning** as requested, establishing the architectural blueprints, database schemas, functional/non-functional requirements, and user experience wireframes.

---

## 1. Software Requirements Specification (SRS)

### 1.1 Project Overview
AttendX replaces traditional, error-prone manual registers with a modern **Dynamic QR Code-based attendance system**. Lecturers generate a dynamic QR code on the lecture room display, which students scan using their smartphones. To prevent proxy attendance, QR codes expire rapidly, include cryptographically signed timestamps, and verify geolocation (optional/fenced) or active network connectivity.

### 1.2 Target Personas & Roles
1. **System Administrator (Admin)**: Manages academic structures (years, semesters), departments, programmes, courses, class enrollments, and system user provisioning (lecturers, students).
2. **Lecturer**: Schedules or initiates lecture sessions, presents dynamic QR codes, monitors real-time check-ins, modifies attendance records, and exports analytics reports.
3. **Student**: Views course schedules, checks personal attendance statistics, and scans lecturer QR codes to securely mark attendance.

### 1.3 Key Functional Requirements
*   **Role-Based Authentication**: Secure sign-in with JWT tokens for Admins, Lecturers, and Students. Separate, customized dashboards for each role.
*   **Academic Structure Management**: CRUD operations for Academic Years, Semesters, Departments, Programmes, Courses, Lecturers, and Students.
*   **Enrollment System**: Mapping of students to courses per semester/academic year.
*   **Dynamic QR Code Attendance Engine**:
    *   Lecturers generate a QR code for an active lecture session.
    *   QR code regenerates automatically every $N$ seconds (e.g., 5–10s) with a signed OTP/token containing the session ID and a precise time-window hash.
    *   Duplicate scan prevention (one successful scan per student per session).
*   **Real-Time Dashboard (SignalR)**: Active live counters of present/absent students on the lecturer's screen as students scan.
*   **Reporting & Analytics**:
    *   Student attendance rate tracking (e.g., flagged if $<75\%$).
    *   Exporting historical reports to **PDF**, **Excel**, and **CSV**.
    *   Advanced filtering by Course, Department, Programme, Date, and Attendance Status.

### 1.4 Non-Functional Requirements
*   **Security (OWASP Top 10)**: Password hashing (ASP.NET Core Identity with PBKDF2), secure token-based JWT authentication, rate limiting to prevent brute-force QR scanning, and parameterized queries (EF Core) to prevent SQL Injection.
*   **Performance & Scalability**: Caching of active session dynamic tokens, optimized database indexing for student IDs and session logs, under 200ms API response time.
*   **Usability**: Fluid, fully responsive UI designed for mobile viewports (students scanning) and large desktop viewports (lecturer display and admin dashboard).

---

## 2. System Architecture Design

We adopt **Clean Architecture (Onion Architecture)** for the ASP.NET Core 9 Web API to enforce strict Separation of Concerns and SOLID principles.

### 2.1 Layered Blueprint
```
+-------------------------------------------------------------+
|                     Presentation Layer                      |
|  - React 19 SPA (Vite + Tailwind CSS + Framer Motion)       |
|  - Web API Controllers (ASP.NET Core 9, Swagger)            |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Application Layer                       |
|  - DTOs & Mapping (AutoMapper / Mapster)                    |
|  - Validation (FluentValidation)                            |
|  - Interfaces (IRepository, ISignalRHub, ICurrentUserService) |
|  - Use Cases & Application Services                         |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Infrastructure Layer                     |
|  - Database Context (Entity Framework Core 9)               |
|  - Repository Implementations                               |
|  - JWT Token & Authentication Services                      |
|  - SignalR Real-Time Hubs                                   |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                        Domain Layer                         |
|  - Domain Entities (Course, Session, AttendanceRecord, etc.) |
|  - Value Objects & Domain Enums                             |
|  - Base Entity (Audit properties: CreatedAt, UpdatedAt)     |
+-------------------------------------------------------------+
```

### 2.2 Security & QR Code Validation Lifecycle
1. **Session Initialized**: Lecturer initiates Session $X$.
2. **Token Generation**: Every 8 seconds, the backend/frontend generates a dynamic, timestamp-encrypted security hash:
   $$\text{Token} = \text{HMAC-SHA256}(\text{SessionId} + \text{TimestampHash} + \text{SecretKey})$$
3. **Scan**: Student scans the QR containing this Token.
4. **Validation**: The backend decrypts/hashes the token, checks if the timestamp is within $\pm 10$ seconds, verifies the student is enrolled in the course, and checks that they haven't already checked in.
5. **Real-time Notify**: SignalR broadcasts a secure check-in event to the lecturer's dashboard, updating the UI instantly.

---

## 3. Database Design (SQL Server ERD Schema)

```
                       +-------------------+
                       |   AcademicYear    |
                       +-------------------+
                       | Id (PK)           |
                       | Name (e.g. 25/26) |
                       | IsCurrent (bool)  |
                       +---------+---------+
                                 | 1
                                 |
                                 | 1..*
                       +---------v---------+
                       |     Semester      |
                       +-------------------+
                       | Id (PK)           |
                       | Name (e.g. Sem 1) |
                       | AcademicYearId(FK)|
                       +---------+---------+
                                 | 1
                                 |
                                 | 1..*
                       +---------v---------+
                       |    Department     |
                       +-------------------+
                       | Id (PK)           |
                       | Name              |
                       | Code (e.g. CS)    |
                       +---------+---------+
                                 | 1
                                 |
                                 | 1..*
                       +---------v---------+
                       |     Programme     |
                       +-------------------+
                       | Id (PK)           |
                       | Name              |
                       | DepartmentId (FK) |
                       +---------+---------+
                                 | 1
                                 |
                                 | 1..*
                       +---------v---------+
                       |      Course       |
                       +-------------------+
                       | Id (PK)           |
                       | Code (e.g. CS101) |
                       | Title             |
                       | DepartmentId (FK) |
                       | LecturerId (FK)   |
                       +----+---------+----+
                            |         |
                  1..*      |         |      1..*
         +------------------+         +------------------+
         |                                               |
         v 1..*                                          v 1..*
+--------+----------+                           +--------+----------+
|    Enrollment     |                           |  LectureSession   |
+-------------------+                           +-------------------+
| Id (PK)           |                           | Id (PK)           |
| StudentId (FK)    |                           | CourseId (FK)     |
| CourseId (FK)     |                           | SemesterId (FK)   |
| SemesterId (FK)   |                           | DateTimeslot      |
| EnrolledAt        |                           | QrSecretKey       |
+-------------------+                           | IsActive (bool)   |
                                                +--------+----------+
                                                         | 1
                                                         |
                                                         | 0..*
                                                +--------v----------+
                                                | AttendanceRecord  |
                                                +-------------------+
                                                | Id (PK)           |
                                                | SessionId (FK)    |
                                                | StudentId (FK)    |
                                                | Timestamp         |
                                                | Status (Enum)     |
                                                | DeviceInfo        |
                                                +-------------------+
```

### 3.1 Primary Table Definitions & Column Types

1. **Users & Roles (ASP.NET Core Identity Schema)**:
   *   `Id` (nvarchar(450), PK)
   *   `Email` (nvarchar(256))
   *   `PasswordHash` (nvarchar(max))
   *   `Role` (nvarchar(50) - "Admin", "Lecturer", "Student")
   *   `FullName` (nvarchar(100))

2. **Student & Lecturer Profile Tables (Extended from Identity)**:
   *   `Students`: `Id` (PK, matches User.Id), `MatricNo` (Unique Index), `ProgrammeId` (FK).
   *   `Lecturers`: `Id` (PK, matches User.Id), `EmployeeId` (Unique Index), `DepartmentId` (FK).

3. **AttendanceRecord Table**:
   *   `Id` (Guid, PK)
   *   `SessionId` (Guid, FK -> LectureSession.Id)
   *   `StudentId` (nvarchar(450), FK -> Student.Id)
   *   `Timestamp` (DateTimeOffset)
   *   `Status` (int - Present = 1, Late = 2, Absent = 3)
   *   `VerificationToken` (nvarchar(500) - token used to claim)
   *   *Composite Unique Index*: `(SessionId, StudentId)` to prevent duplicate entries.

---

## 4. UI Wireframe & User Experience (UX) Blueprint

We will create a stunning, highly optimized interface utilizing a high-contrast **Modern Slate Light Theme** with deep indigo accents and rich metadata metrics.

### 4.1 Interface Layouts

```
+-----------------------------------------------------------------------------+
|  AttendX Portal [Logo]                     [Notifications] [User Profile]   |
+-----------------------------------------------------------------------------+
|  [Sidebar Navigation]     |  [Main Content Viewport]                       |
|                           |                                                 |
|  - Dashboard (Home)       |  Welcome, Dr. Sarah Jenkins                     |
|  - Course Management      |  Active Lectures & Quick Stats Panel            |
|  - Sessions Registry      |  +-------------------+  +--------------------+  |
|  - Live QR Generator      |  | Total Students    |  | Attendance Rate    |  |
|  - Attendance Reports     |  |     1,248         |  |      89.4%         |  |
|  - User Management        |  +-------------------+  +--------------------+  |
|  - System Settings        |                                                 |
|                           |  [Action Buttons: "New Session", "Export Report"]|
|                           |                                                 |
|                           |  Active Courses List (Search/Filter/Paginate)   |
+-----------------------------------------------------------------------------+
```

### 4.2 User Journeys

#### A. Lecturer QR Presentation View
*   A dedicated, distraction-free "Cinema Mode" interface displaying the active course title, current date/time, total checked-in count, and a beautifully centered dynamic QR code.
*   A live, floating checklist of checked-in student names sliding in from the right edge as SignalR fires events.
*   Countdown progress bar reflecting the remaining seconds (e.g., 8s) before the QR regenerates.

#### B. Student Scan View
*   Mobile-first, single-screen UI layout.
*   Prominent "Tap to Scan" button opening a styled, rounded camera viewport with custom overlays guiding alignment.
*   Once scanned, a gorgeous fullscreen success micro-animation occurs, saving the record to the backend and returning the student to their personal dashboard.

---

## Next Steps: Agile Phase 2 Implementation Plan
Upon your approval of this architectural plan, we will proceed to:
1. Initialize the project file structures.
2. Build the database access layer, Entity Framework configurations, and seed mock database values.
3. Construct the comprehensive React front-end application with all dashboards (Admin, Lecturer, Student) using Framer Motion and responsive Tailwind components.
4. Establish the Express API backend to proxy queries, generate dynamic cryptographic QR codes, and simulate real-time SignalR notifications seamlessly in the sandbox workspace.

*Please review these plans and let me know if they align with your expectations so we can begin coding!*
