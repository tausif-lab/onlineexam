const { get } = require('http');
const path = require('path');

// Serve home page
const getHomePage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'front.html'));
};

// Serve login page
const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'login.html'));
};

// Serve registration page
const getRegisterPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'register.html'));
};
const getRegisterCPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'registerC.html'));
};

// Serve student dashboard
const getStudentDashboard = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'student-dashboard.html'));
};

// Serve admin dashboard
const getAdminDashboard = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'admin-dashboard.html'));
};

// Serve manage exams page
const getManageExamsPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'manage-exam.html'));
};
//new exam for student
const getExamPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'studentExam.html'));
};
const getadminResultsPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'admin-analysis.html'));
}

const getadminlive= (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'adminlive.html'));
}
const getparentsDashboard = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'parents.html'));
};
const getcheckingPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'admin-checking.html'));
};
const getstudentResult = (req, res) => {
    res.sendFile(path.join(__dirname, '../view', 'dis-result.html'));
}

module.exports = {
    getHomePage,
    getLoginPage,
    getRegisterPage,
    getRegisterCPage,
    getStudentDashboard,
    getAdminDashboard,
    getManageExamsPage,
    getExamPage,
    getadminlive,
    getparentsDashboard,
    getcheckingPage,
    getstudentResult,
    getadminResultsPage
   
};
