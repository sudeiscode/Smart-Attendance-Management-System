# AttendX Local Running & C# Integration Guide

This guide provides step-by-step instructions on how to download, run, and host the **AttendX Smart Attendance System** on your local computer. It also includes an alternative **C# ASP.NET Core Web API** backend implementation in the `/csharp_backend` directory, allowing you to run the system using .NET on your PC!

---

## Part 1: How to Run the Current Node.js Full-Stack App on Your PC

The current application is a fully functional full-stack app featuring a **Vite + React** client-side frontend and an **Express.js (TypeScript)** backend.

### Prerequisites
1. **Node.js** (v18 or higher recommended): [Download Node.js](https://nodejs.org/)
2. **Git** (optional, to clone or manage your codebase)

### Step-by-Step Installation
1. **Extract/Export the Project**:
   * Export the ZIP file of this workspace from the settings menu in Google AI Studio, and unzip it into a folder on your computer (e.g., `C:\projects\AttendX`).

2. **Open Your Terminal**:
   * Open Command Prompt, PowerShell, or macOS Terminal.
   * Navigate into the project folder:
     ```bash
     cd path/to/AttendX
     ```

3. **Install Dependencies**:
   * Run the standard package installer to download React, Tailwind, Lucide, Recharts, Express, and html5-qrcode:
     ```bash
     npm install
     ```

4. **Launch the Development Workspace**:
   * Start the concurrent development server running on port `3000`:
     ```bash
     npm run dev
     ```
   * Open your web browser and go to: `http://localhost:3000`
   * You can now log in using the pre-seeded users (such as `admin@attendx.edu`, `lecturer@attendx.edu`, or `student@attendx.edu` with password `password123`).

---

## Part 2: How to Run the Alternative C# ASP.NET Core Backend

We have built a fully functional, modern **C# (.NET 8/9)** Minimal API backend inside the `/csharp_backend` folder. This is a lightweight, clean, and optimized equivalent of the Node.js Express server. It stores data locally in a JSON file database (like the original Express store) and provides the exact same endpoints.

### Prerequisites
1. **.NET SDK 8.0 or 9.0**: [Download .NET SDK](https://dotnet.microsoft.com/download)
2. **Visual Studio 2022** or **VS Code** (with C# Dev Kit extension installed)

### Step-by-Step C# Run Instructions
1. Navigate into the C# backend folder:
   ```bash
   cd csharp_backend
   ```

2. Run the restore command to resolve packages:
   ```bash
   dotnet restore
   ```

3. Run the C# API:
   ```bash
   dotnet run
   ```
   * The C# server will boot up and begin listening on `http://localhost:5000` (API documentation will be available via Swagger at `http://localhost:5000/swagger`).

4. **Connect the React Frontend to your C# Backend**:
   * Open the file `/src/lib/api.ts` in your React project.
   * Change the base URL parameter to target your C# local server:
     ```typescript
     // src/lib/api.ts
     const BASE_URL = 'http://localhost:5000';
     ```
   * Re-run `npm run dev` in your React frontend. It will now make all login, registration, course management, active session, and QR scanning API calls directly to your C# ASP.NET Core backend!

---

## Pre-seeded Credentials for Local Login
Use these credentials on your PC:
* **Admin**: `admin@attendx.edu` (Password: `password123`)
* **Lecturer**: `lecturer@attendx.edu` (Password: `password123`)
* **Student**: `student@attendx.edu` (Password: `password123`)
