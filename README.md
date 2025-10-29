# 🧠 Online Examination System

A **secure and scalable web-based examination platform** designed for **students, teachers, and parents**.  
Built to streamline the process of conducting, managing, and evaluating online exams — reducing manual effort by **80%** through automated workflows and analytics.

---

## 🚀 Key Features

### 👩‍🏫 For Teachers
- Create and manage exams 
- Define **time limits**, **marks**, and **negative marking**
- Automatic **result evaluation** and **analytics dashboard**

### 🧑‍🎓 For Students
- Take **mock and practice tests**   With **Eye movement detection ,HighSecurity System**
- Get **instant feedback**, detailed **score analysis**, and **performance history**
- Authentication and Authorization using **Face ID**

### 👨‍👩‍👧 For Parents
- Monitor student progress and exam reports in real time  
- Receive **performance summaries** and **exam alerts**

### 🔐 Security Highlights
- JWT-based authentication and authorization  
- Role-based access control (Admin / Teacher / Student / Parent)  
- Secure data handling with encrypted user credentials  


---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | Java Script ,Html, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ORM) |
| **Authentication** | JSON Web Tokens (JWT), bcrypt.js |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend) |


---

## 🔄 Workflow

Our development followed a structured, modular workflow for efficiency and maintainability:

1. **Planning & Design**
   - Defined user roles and permissions (Admin, Teacher, Student, Parent)
   - Created system architecture and wireframes

2. **Frontend Development**
   - Built responsive UI using **Next.js + Tailwind CSS**
   - Integrated REST APIs for exam and user modules
   - Added role-based dashboards and live timer components

3. **Backend Development**
   - Designed REST API with **Express.js**
   - Implemented authentication using **JWT + bcrypt**
   - Added middleware for validation and error handling

4. **Database Management**
   - Structured collections using **Mongoose models**
   - Created relations between users, exams, and results
   - Enabled analytics and aggregation queries

5. **Testing & Deployment**
   - Used Postman for API testing and debugging  
   - Deployed on **Vercel (Frontend)** and **Render (Backend)**  
   - Final QA and performance checks before production

---

## 🧩 Core Modules

| Module | Description |
|---------|--------------|
| **User Management** | Registration, login, role-based dashboard |
| **Exam Creation** | Teachers can create/edit/delete exams and questions |
| **Exam Attempt** | Students attempt live/mock exams with timer and Student Eyemovement Detection|
| **Result Evaluation** | Auto-grading with detailed analytics |
| **Admin Panel** | Manage users, exams, and reports |

---
## 👥 Contributors

| Name | Role | Major Contributions |
|------|------|----------------------|
| **Tausif Khan** | Full-Stack Developer |Backend integration, database design, authentication, deployment |
| **Priyansh Sao** | Frontend Developer | UI Designer|
| **[Meghmala Singh]** | Computer Vision Engineer | Eye movement detection, face recognition, AI module integration |

