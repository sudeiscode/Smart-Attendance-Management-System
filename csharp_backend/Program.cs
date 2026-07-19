using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add CORS policies to allow seamless communication from React frontend (running on port 3000)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AttendX Cryptographic Verification Engine", Version = "v1" });
    
    // Add bearer token authentication in Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

// --- IN-MEMORY DATABASE & PRE-SEEDED DATA ---
var Users = new List<User>
{
    new() { Id = "u-1", Email = "admin@attendx.edu", FullName = "Prof. Sudeis Alhassan", Role = "Admin", Password = "password123" },
    new() { Id = "u-2", Email = "lecturer@attendx.edu", FullName = "Dr. Michael Benson", Role = "Lecturer", EmployeeId = "EMP-8022", Password = "password123" },
    new() { Id = "u-3", Email = "student@attendx.edu", FullName = "Aisha Khalid", Role = "Student", MatricNo = "SRI.41.008.012.23", Password = "password123" }
};

var Courses = new List<Course>
{
    new() { Id = "c-1", Code = "CS101", Title = "Introduction to Computer Science", DepartmentName = "Computer Science", LecturerId = "u-2", LecturerName = "Dr. Michael Benson" },
    new() { Id = "c-2", Code = "CS302", Title = "Software Architecture & Design Patterns", DepartmentName = "Software Engineering", LecturerId = "u-2", LecturerName = "Dr. Michael Benson" },
    new() { Id = "c-3", Code = "EE201", Title = "Basic Circuit Theory", DepartmentName = "Electrical Engineering", LecturerId = "u-2", LecturerName = "Dr. Michael Benson" }
};

var Enrollments = new List<Enrollment>
{
    new() { Id = "e-1", StudentId = "u-3", CourseId = "c-1", SemesterId = "sem-1" },
    new() { Id = "e-2", StudentId = "u-3", CourseId = "c-2", SemesterId = "sem-1" }
};

var ActiveSessions = new List<LectureSession>();
var AttendanceRecords = new List<AttendanceRecord>();

// Pre-seed some past attendance logs
AttendanceRecords.Add(new AttendanceRecord
{
    Id = "r-pre-1",
    StudentId = "u-3",
    StudentName = "Aisha Khalid",
    StudentMatric = "SRI.41.008.012.23",
    CourseCode = "CS101",
    CourseTitle = "Introduction to Computer Science",
    Timestamp = DateTime.UtcNow.AddDays(-2),
    Status = "Present",
    DeviceInfo = "Windows / Chrome x64"
});

// --- AUTHENTICATION HELPERS ---
const string JwtSecret = "AttendXSuperSecretCryptoTokenSigningKeyThatIsLongEnoughToWorkWithHMACSHA256!";

string GenerateJwtToken(User user)
{
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(JwtSecret);
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    return tokenHandler.WriteToken(token);
}

User? AuthenticateUser(HttpContext httpContext)
{
    if (!httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
        return null;

    var token = authHeader.ToString().Replace("Bearer ", "").Trim();
    try
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(JwtSecret);
        tokenHandler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        }, out SecurityToken validatedToken);

        var jwtToken = (JwtSecurityToken)validatedToken;
        var userId = jwtToken.Claims.First(x => x.Type == "nameid" || x.Type == ClaimTypes.NameIdentifier).Value;
        return Users.FirstOrDefault(u => u.Id == userId);
    }
    catch
    {
        return null;
    }
}

// --- API ROUTE ENDPOINTS ---

// 1. User Login
app.MapPost("/api/auth/login", (LoginRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest(new { message = "Email and password are required" });

    var user = Users.FirstOrDefault(u => u.Email.Equals(req.Email, StringComparison.OrdinalIgnoreCase));
    if (user == null || user.Password != req.Password)
        return Results.Json(new { message = "Invalid email or password" }, statusCode: 401);

    var token = GenerateJwtToken(user);
    return Results.Ok(new { token, user });
});

// 1.5 User Register
app.MapPost("/api/auth/register", (RegisterRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Role))
        return Results.BadRequest(new { message = "Email, password, name, and role are required" });

    var exists = Users.Any(u => u.Email.Equals(req.Email, StringComparison.OrdinalIgnoreCase));
    if (exists) return Results.BadRequest(new { message = "User with this email already exists" });

    var newUser = new User {
        Id = $"u-{Guid.NewGuid().ToString().Substring(0, 6)}",
        Email = req.Email,
        FullName = req.FullName,
        Role = req.Role,
        Password = req.Password,
        MatricNo = req.Role == "Student" ? (req.MatricNo ?? $"SRI.41.008.{new Random().Next(1, 1000):D3}.23") : null,
        EmployeeId = req.Role == "Lecturer" ? (req.EmployeeId ?? $"EMP-{Guid.NewGuid().ToString().Substring(0, 6)}") : null,
        DepartmentId = req.DepartmentId ?? "",
        ProgrammeId = req.ProgrammeId ?? ""
    };

    Users.Add(newUser);
    var token = GenerateJwtToken(newUser);
    return Results.Ok(new { token, user = newUser });
});

// 2. Fetch authenticated profile
app.MapGet("/api/auth/me", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);
    return Results.Ok(new { user });
});

// 3. System Statistics Dashboard
app.MapGet("/api/stats", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    int totalStudents = Users.Count(u => u.Role == "Student");
    int totalLecturers = Users.Count(u => u.Role == "Lecturer");
    int totalCoursesCount = Courses.Count;
    int totalActiveSessionsCount = ActiveSessions.Count(s => s.IsActive);

    // If user is a Student, calculate cumulative and missed rates
    if (user.Role == "Student")
    {
        var myRecords = AttendanceRecords.Where(r => r.StudentId == user.Id).ToList();
        int attendedCount = myRecords.Count(r => r.Status == "Present" || r.Status == "Late");
        int missedCount = myRecords.Count(r => r.Status == "Absent");
        int totalEnrolledCount = Enrollments.Count(e => e.StudentId == user.Id);
        int overallRate = myRecords.Any() ? (int)Math.Round((double)attendedCount / myRecords.Count * 100) : 100;

        return Results.Ok(new
        {
            attendedCount,
            missedCount,
            myCoursesCount = totalEnrolledCount,
            attendancePercentage = overallRate,
            overallAttendanceRate = overallRate
        });
    }

    // Default admin / lecturer stats
    int totalRecordsCount = AttendanceRecords.Count;
    int attendedCountAll = AttendanceRecords.Count(r => r.Status == "Present" || r.Status == "Late");
    int globalAttendanceRate = totalRecordsCount > 0 ? (int)Math.Round((double)attendedCountAll / totalRecordsCount * 100) : 85;

    return Results.Ok(new
    {
        totalStudents,
        totalLecturers,
        totalCoursesCount,
        totalActiveSessionsCount,
        overallAttendanceRate = globalAttendanceRate
    });
});

// 4. Manage Academic Catalog (Courses)
app.MapGet("/api/courses", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);
    return Results.Ok(Courses);
});

app.MapPost("/api/courses", (Course course, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || (user.Role != "Admin" && user.Role != "Lecturer")) 
        return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    course.Id = $"c-{Guid.NewGuid().ToString().Substring(0, 6)}";
    if (user.Role == "Lecturer")
    {
        course.LecturerId = user.Id;
        course.LecturerName = user.FullName;
    }
    Courses.Add(course);
    return Results.Ok(course);
});

// 5. Fetch Enrollment Matrix
app.MapGet("/api/enrollments", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);
    return Results.Ok(Enrollments);
});

app.MapPost("/api/enrollments", (Enrollment enroll, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || (user.Role != "Admin" && user.Role != "Lecturer")) 
        return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    enroll.Id = $"e-{Guid.NewGuid().ToString().Substring(0, 6)}";
    Enrollments.Add(enroll);
    return Results.Ok(enroll);
});

// 5.5 Manage Users (Lecturer or Admin)
app.MapGet("/api/users", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || (user.Role != "Admin" && user.Role != "Lecturer")) 
        return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    // Return users without passwords
    var safeUsers = Users.Select(u => new {
        u.Id,
        u.Email,
        u.FullName,
        u.Role,
        u.MatricNo,
        u.EmployeeId,
        u.DepartmentId,
        u.ProgrammeId
    });
    return Results.Ok(safeUsers);
});

app.MapPost("/api/users", (User newUser, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || (user.Role != "Admin" && user.Role != "Lecturer")) 
        return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    if (string.IsNullOrWhiteSpace(newUser.Email) || string.IsNullOrWhiteSpace(newUser.FullName) || string.IsNullOrWhiteSpace(newUser.Role))
        return Results.BadRequest(new { message = "Email, full name, and role are required" });

    var exists = Users.Any(u => u.Email.Equals(newUser.Email, StringComparison.OrdinalIgnoreCase));
    if (exists) return Results.BadRequest(new { message = "User with this email already exists" });

    newUser.Id = $"u-{Guid.NewGuid().ToString().Substring(0, 6)}";
    newUser.Password = string.IsNullOrWhiteSpace(newUser.Password) ? "password123" : newUser.Password;
    newUser.MatricNo = newUser.Role == "Student" ? (newUser.MatricNo ?? $"SRI.41.008.{new Random().Next(1, 1000):D3}.23") : null;
    newUser.EmployeeId = newUser.Role == "Lecturer" ? (newUser.EmployeeId ?? $"EMP-{Guid.NewGuid().ToString().Substring(0, 6)}") : null;

    Users.Add(newUser);
    return Results.Ok(new {
        newUser.Id,
        newUser.Email,
        newUser.FullName,
        newUser.Role,
        newUser.MatricNo,
        newUser.EmployeeId,
        newUser.DepartmentId,
        newUser.ProgrammeId
    });
});

// 6. Manage Active Lecture Sessions
app.MapGet("/api/sessions", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);
    return Results.Ok(ActiveSessions);
});

app.MapPost("/api/sessions/start", (StartSessionRequest req, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || user.Role != "Lecturer") return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    var course = Courses.FirstOrDefault(c => c.Id == req.CourseId);
    if (course == null) return Results.BadRequest(new { message = "Course not found" });

    // Close any other active sessions for this course to keep integrity
    foreach (var existing in ActiveSessions.Where(s => s.CourseId == req.CourseId && s.IsActive))
    {
        existing.IsActive = false;
    }

    var secureToken = Guid.NewGuid().ToString("N").Substring(0, 8);
    var newSession = new LectureSession
    {
        Id = $"s-{Guid.NewGuid().ToString().Substring(0, 6)}",
        CourseId = course.Id,
        CourseCode = course.Code,
        CourseTitle = course.Title,
        DateTimeslot = $"{DateTime.UtcNow.AddHours(1):yyyy-MM-dd HH:mm} (Local Time)",
        IsActive = true,
        SecureToken = secureToken,
        AttendanceCode = JsonSerializer.Serialize(new { sessionId = $"s-{secureToken}", token = secureToken })
    };

    ActiveSessions.Add(newSession);
    return Results.Ok(newSession);
});

app.MapPost("/api/sessions/{id}/end", (string id, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || user.Role != "Lecturer") return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    var session = ActiveSessions.FirstOrDefault(s => s.Id == id);
    if (session == null) return Results.NotFound(new { message = "Session not found" });

    session.IsActive = false;
    return Results.Ok(session);
});

// 7. Secure dynamic QR code endpoint
app.MapGet("/api/sessions/{id}/qr", (string id, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    var session = ActiveSessions.FirstOrDefault(s => s.Id == id);
    if (session == null) return Results.NotFound(new { message = "Session not found" });

    // Dynamic rotation simulation - regenerate token for active sessions
    if (session.IsActive)
    {
        session.SecureToken = Guid.NewGuid().ToString("N").Substring(0, 8);
        session.AttendanceCode = JsonSerializer.Serialize(new { sessionId = session.Id, token = session.SecureToken });
    }

    return Results.Ok(new { code = session.AttendanceCode, token = session.SecureToken });
});

// 8. Dynamic QR scan checking verification logic
app.MapPost("/api/attendance/scan", (ScanRequest req, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || user.Role != "Student") return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    var session = ActiveSessions.FirstOrDefault(s => s.Id == req.SessionId);
    if (session == null) return Results.BadRequest(new { message = "Invalid lecture session. Verify QR code." });
    if (!session.IsActive) return Results.BadRequest(new { message = "This class session has expired or ended." });

    // If dynamic security keys match
    if (session.SecureToken != req.Token) return Results.BadRequest(new { message = "Dynamic cryptographic code verification failed. Code expired." });

    // Prevent double logs
    var alreadyExists = AttendanceRecords.FirstOrDefault(r => r.StudentId == user.Id && r.CourseCode == session.CourseCode && r.Timestamp.Date == DateTime.UtcNow.Date);
    if (alreadyExists != null) return Results.Ok(alreadyExists);

    var newRecord = new AttendanceRecord
    {
        Id = $"r-{Guid.NewGuid().ToString().Substring(0, 6)}",
        StudentId = user.Id,
        StudentName = user.FullName,
        StudentMatric = user.MatricNo ?? "N/A",
        CourseCode = session.CourseCode,
        CourseTitle = session.CourseTitle,
        Timestamp = DateTime.UtcNow,
        Status = "Present",
        DeviceInfo = req.DeviceInfo ?? "Unknown"
    };

    AttendanceRecords.Add(newRecord);
    return Results.Ok(newRecord);
});

// 9. Fetch All Records (Reports)
app.MapGet("/api/attendance", (HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null) return Results.Json(new { message = "Unauthorized" }, statusCode: 401);
    return Results.Ok(AttendanceRecords);
});

// 10. Manual overriding/correction by lecturers
app.MapPost("/api/attendance/record", (ManualRecordRequest req, HttpContext context) =>
{
    var user = AuthenticateUser(context);
    if (user == null || user.Role != "Lecturer") return Results.Json(new { message = "Unauthorized" }, statusCode: 401);

    var student = Users.FirstOrDefault(u => u.Id == req.StudentId);
    var session = ActiveSessions.FirstOrDefault(s => s.Id == req.SessionId);
    if (student == null || session == null) return Results.BadRequest(new { message = "Missing student or active session information" });

    // Override or add new record
    var existing = AttendanceRecords.FirstOrDefault(r => r.StudentId == student.Id && r.CourseCode == session.CourseCode);
    if (existing != null)
    {
        existing.Status = req.Status;
        return Results.Ok(existing);
    }

    var record = new AttendanceRecord
    {
        Id = $"r-{Guid.NewGuid().ToString().Substring(0, 6)}",
        StudentId = student.Id,
        StudentName = student.FullName,
        StudentMatric = student.MatricNo ?? "N/A",
        CourseCode = session.CourseCode,
        CourseTitle = session.CourseTitle,
        Timestamp = DateTime.UtcNow,
        Status = req.Status,
        DeviceInfo = "Manual Override by Lecturer"
    };

    AttendanceRecords.Add(record);
    return Results.Ok(record);
});

app.Run();

// --- RECORD SCHEMAS & DTOS ---
public class User
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // "Admin", "Lecturer", "Student"
    public string? MatricNo { get; set; }
    public string? EmployeeId { get; set; }
    public string DepartmentId { get; set; } = string.Empty;
    public string ProgrammeId { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class Course
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string LecturerId { get; set; } = string.Empty;
    public string LecturerName { get; set; } = string.Empty;
}

public class Enrollment
{
    public string Id { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string SemesterId { get; set; } = string.Empty;
}

public class LectureSession
{
    public string Id { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseCode { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string DateTimeslot { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string SecureToken { get; set; } = string.Empty;
    public string AttendanceCode { get; set; } = string.Empty;
}

public class AttendanceRecord
{
    public string Id { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentMatric { get; set; } = string.Empty;
    public string CourseCode { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Status { get; set; } = string.Empty; // "Present", "Late", "Absent"
    public string DeviceInfo { get; set; } = string.Empty;
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string FullName, string Role, string? MatricNo, string? EmployeeId, string? DepartmentId, string? ProgrammeId);
public record StartSessionRequest(string CourseId, string SemesterId);
public record ScanRequest(string SessionId, string Token, string? DeviceInfo);
public record ManualRecordRequest(string SessionId, string StudentId, string Status);
