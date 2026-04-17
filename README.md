# 🧠 Online Examination System

A **secure, role-based online examination platform** designed to simulate real-world exam environments with **automated evaluation, analytics, and basic proctoring features**.

The system supports **students, teachers, parents, and admins**, reducing manual evaluation effort by **~80%** through automation.

---

## 🏗️ System Architecture & Design

### 🔹 High-Level Architecture

The system follows a **3-tier client-server architecture**:

- **Frontend (Client Layer)**
  - Built with **Next.js + Tailwind CSS**
  - Handles UI, exam interface, timers, dashboards
  - Communicates with backend via REST APIs

- **Backend (Application Layer)**
  - Built with **Node.js + Express.js**
  - Handles authentication, exam logic, evaluation, RBAC
  - Middleware-based request validation and authorization

- **Database (Data Layer)**
  - **MongoDB (Mongoose ORM)**
  - Stores users, exams, questions, and results

---

### 🔹 Authentication & Authorization Flow

1. User logs in with credentials  
2. Server validates and generates **JWT token**  
3. Token stored on client  
4. Each request includes token  
5. Backend verifies token using middleware  
6. Role-based access control applied  

---

### 🔹 Exam Execution Flow

1. Student starts exam  
2. Questions fetched via API  
3. Timer initialized (client + server validation)  
4. Answers stored temporarily  
5. On submission:
   - Auto-evaluation triggered  
   - Negative marking applied  
6. Results stored and analytics generated  

---

### 🔹 Proctoring (Basic Monitoring)

- Eye movement detection using browser-based tracking (prototype level)  
- Detects tab switching and suspicious behavior patterns  
- Face authentication used during login (if enabled)  

> Note: Monitoring features are implemented at a basic/prototype level.

---

## 🔁 User Flow

### 👩‍🏫 Teacher Flow
1. Login → Dashboard  
2. Create exam (questions, duration, marking)  
3. Publish exam  
4. View results and analytics  

---

### 🧑‍🎓 Student Flow
1. Login / Verification  
2. View available exams  
3. Start exam (timer + monitoring)  
4. Submit exam  
5. View score and performance analysis  

---

### 👨‍👩‍👧 Parent Flow
1. Login  
2. Monitor student performance  
3. View reports and alerts  

---

### 🛡️ Admin Flow
1. Manage users (CRUD)  
2. Monitor exams and reports  
3. Control system-level operations  

---

## 🚀 Key Features

### 👩‍🏫 Teachers
- Create and manage exams  
- Configure time limits, marks, negative marking  
- Access analytics dashboard  

### 🧑‍🎓 Students
- Attempt mock and live exams  
- Instant feedback and score analysis  
- Performance history tracking  

### 👨‍👩‍👧 Parents
- Real-time performance monitoring  
- Exam alerts and summaries  

---

## 🔐 Security Features

- JWT-based authentication  
- Role-Based Access Control (RBAC)  
- Password hashing using bcrypt  
- Secure API handling with validation middleware  

---

## 🛠️ Tech Stack

| Layer | Technologies |
|------|-------------|
| Frontend | Next.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcrypt |
| Deployment | Vercel, Render |

---

## 🧩 Core Modules

| Module | Description |
|--------|-------------|
| User Management | Multi-role authentication and dashboards |
| Exam Engine | Exam lifecycle, timer, submission |
| Evaluation Engine | Auto-grading and result calculation |
| Monitoring System | Basic cheating detection |
| Analytics | Performance insights and reports |

---

## 📈 Future Improvements

- AI-based proctoring (advanced gaze detection)  
- WebSocket-based real-time monitoring  
- Scalability improvements using caching (Redis)  
- Microservices-based architecture  

---

