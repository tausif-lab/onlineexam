# Online Exam System - MVC Architecture

This document explains the refactored MVC (Model-View-Controller) structure of the Online Exam System.

## Project Structure

```
/online-exam-system
│
├── server.js                 # Main application entry point
├── package.json              # Dependencies and scripts
│
├── /config                   # Configuration files
│   └── database.js           # MongoDB connection configuration
│
├── /models                   # Data models (Mongoose schemas)
│   ├── index.js              # Export all models
│   ├── User.js               # User model with authentication
│   ├── Exam.js               # Exam model
│   └── Question.js           # Question model
│
├── /controllers              # Business logic controllers
│   ├── authController.js     # Authentication logic (login, register, profile)
│   ├── examController.js     # Exam management logic
│   ├── questionController.js # Question management logic
│   └── viewController.js     # HTML page serving logic
│
├── /routes                   # Route definitions
│   ├── index.js              # Main routes file
│   ├── authRoutes.js         # Authentication routes
│   ├── examRoutes.js         # Exam management routes
│   ├── questionRoutes.js     # Question management routes
│   └── viewRoutes.js         # HTML page routes
│
├── /middleware               # Custom middleware
│   ├── auth.js               # JWT authentication middleware
│   └── errorHandler.js       # Global error handling middleware
│
├── /view                     # HTML templates/views
├── /public                   # Static files (CSS, JS, images)
└── /node_modules             # Dependencies
```

## Key Features of the MVC Refactoring

### 1. **Models** (`/models`)
- **User.js**: User schema with built-in password hashing and comparison methods
- **Exam.js**: Exam schema with categories, duration, and status management
- **Question.js**: Question schema linked to exams with multiple choice and true/false support
- **index.js**: Centralized model exports

### 2. **Controllers** (`/controllers`)
- **authController.js**: Handles user registration, login, logout, and profile management
- **examController.js**: Manages CRUD operations for exams
- **questionController.js**: Manages CRUD operations for questions
- **viewController.js**: Serves HTML pages

### 3. **Routes** (`/routes`)
- **authRoutes.js**: `/api/register`, `/api/login`, `/api/profile`, `/api/logout`
- **examRoutes.js**: `/api/exams` with full CRUD operations
- **questionRoutes.js**: `/api/questions` with full CRUD operations
- **viewRoutes.js**: HTML page routes (`/`, `/login`, `/register`, etc.)

### 4. **Middleware** (`/middleware`)
- **auth.js**: JWT token verification and role-based access control
- **errorHandler.js**: Centralized error handling with specific error types

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (protected)
- `POST /api/logout` - User logout

### Exam Management
- `GET /api/exams` - Get all exams (protected)
- `GET /api/exams/:id` - Get specific exam (protected)
- `POST /api/exams` - Create exam (admin only)
- `PUT /api/exams/:id` - Update exam (admin only)
- `DELETE /api/exams/:id` - Delete exam (admin only)

### Question Management
- `GET /api/exams/:id/questions` - Get questions for an exam
- `POST /api/exams/:id/questions` - Add question to exam (admin only)
- `GET /api/questions/:id` - Get specific question
- `PUT /api/questions/:id` - Update question (admin only)
- `DELETE /api/questions/:id` - Delete question (admin only)

### HTML Pages
- `GET /` - Home page
- `GET /login` - Login page
- `GET /register` - Registration page
- `GET /student-dashboard` - Student dashboard
- `GET /admin-dashboard` - Admin dashboard
- `GET /manage-exams` - Exam management page

## Benefits of MVC Structure

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Maintainability**: Easier to maintain and update specific functionality
3. **Scalability**: Easy to add new features without affecting existing code
4. **Testability**: Each component can be tested independently
5. **Code Reusability**: Controllers and models can be reused across different routes
6. **Security**: Centralized authentication and error handling

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/Student)
- Input validation
- Error handling without sensitive data exposure

## Configuration

The system uses environment variables for configuration:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3001)

## Running the Application

1. Install dependencies: `npm install`
2. Set environment variables in `.env` file
3. Start the server: `npm start` or `npm run dev` (with nodemon)

The MVC structure makes the codebase more organized, maintainable, and scalable while maintaining backward compatibility with the existing API endpoints.
