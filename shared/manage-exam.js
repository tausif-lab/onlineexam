// Global variables
        let currentParams = {};
        let allExams = [];
        let filteredExams = [];
        let parameterWatcher = null;
        let currentExamId = null;
        let questions = [];
        let currentEditingQuestionId = null;
        let selectedQuestionPhoto = null;
        let currentQuestionPhotoUrl = null;

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            extractUrlParameters();
            setupEventListeners();
            setupParameterWatcher();
            loadExams();
        });

        // Check authentication
        function checkAuth() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (!token || user.role !== 'admin') {
                window.location.href = '/login';
                return;
            }
            
            document.getElementById('adminName').textContent = user.fullName || 'Admin';
        }

        // Extract URL parameters
        function extractUrlParameters() {
            const urlParams = new URLSearchParams(window.location.search);
            currentParams = {
                collegeId: urlParams.get('collegeId') || '',
                user1Id: urlParams.get('user1Id') || '',
                branch: urlParams.get('branch') || ''
            };

            // Update display
            document.getElementById('collegeIdDisplay').textContent = currentParams.collegeId || 'Not specified';
            document.getElementById('userIdDisplay').textContent = currentParams.user1Id || 'Not specified';
            document.getElementById('branchDisplay').textContent = currentParams.branch || 'Not specified';

            // Pre-fill exam form with context
            document.getElementById('examCollegeId').value = currentParams.collegeId || '';
            document.getElementById('examBranch').value = currentParams.branch || '';

            console.log('Current parameters:', currentParams);
        }

        // Setup event listeners
        function setupEventListeners() {
            // Search functionality
            document.getElementById('searchInput').addEventListener('input', function(e) {
                filterExams(e.target.value);
            });
            
            // Handle page visibility changes
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden) {
                    parameterWatcher.checkForChanges();
                }
            });
        }

        // Setup parameter watcher
        function setupParameterWatcher() {
            parameterWatcher = {
                start: function() {
                    window.addEventListener('popstate', this.handleParameterChange.bind(this));
                    this.interval = setInterval(this.checkForChanges.bind(this), 500);
                    
                    this.originalPushState = history.pushState;
                    this.originalReplaceState = history.replaceState;
                    
                    const self = this;
                    history.pushState = function() {
                        self.originalPushState.apply(history, arguments);
                        setTimeout(() => self.handleParameterChange(), 10);
                    };
                    
                    history.replaceState = function() {
                        self.originalReplaceState.apply(history, arguments);
                        setTimeout(() => self.handleParameterChange(), 10);
                    };
                },
                
                checkForChanges: function() {
                    const urlParams = new URLSearchParams(window.location.search);
                    const newParams = {
                        collegeId: urlParams.get('collegeId') || '',
                        user1Id: urlParams.get('user1Id') || '',
                        branch: urlParams.get('branch') || ''
                    };
                    
                    if (JSON.stringify(newParams) !== JSON.stringify(currentParams)) {
                        this.handleParameterChange();
                    }
                },
                
                handleParameterChange: function() {
                    console.log('URL parameters changed, updating page...');
                    extractUrlParameters();
                    loadExams();
                },
                
                stop: function() {
                    if (this.interval) {
                        clearInterval(this.interval);
                    }
                    window.removeEventListener('popstate', this.handleParameterChange.bind(this));
                    
                    if (this.originalPushState) {
                        history.pushState = this.originalPushState;
                    }
                    if (this.originalReplaceState) {
                        history.replaceState = this.originalReplaceState;
                    }
                }
            };
            
            parameterWatcher.start();
        }

        // Load exams from API
        async function loadExams() {
            showLoading();
            hideError();

            try {
                const apiUrl = `/api/exams?collegeId=${encodeURIComponent(currentParams.collegeId)}&user1Id=${encodeURIComponent(currentParams.user1Id)}&branch=${encodeURIComponent(currentParams.branch)}`;
                
                console.log('Fetching exams from:', apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const exams = await response.json();
                allExams = exams;
                filteredExams = [...allExams];
                
                console.log('Loaded exams:', exams.length);
                displayExams(filteredExams);

            } catch (error) {
                console.error('Error loading exams:', error);
                showError('Failed to load exams. Please try again.');
                displayExams([]);
            }
        }

        // Filter exams based on search
        function filterExams(searchTerm) {
            if (!searchTerm.trim()) {
                filteredExams = [...allExams];
            } else {
                const term = searchTerm.toLowerCase();
                filteredExams = allExams.filter(exam => 
                    exam.title.toLowerCase().includes(term) ||
                    exam.category.toLowerCase().includes(term) ||
                    exam.description.toLowerCase().includes(term) ||
                    exam.createdBy.toLowerCase().includes(term)
                );
            }
            displayExams(filteredExams);
        }

        // Copy exam ID to clipboard
        function copyExamId(examId, buttonElement) {
            navigator.clipboard.writeText(examId).then(function() {
                // Show success feedback
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check me-1"></i>Copied';
                buttonElement.classList.add('copied');
                
                // Reset button after 2 seconds
                setTimeout(function() {
                    buttonElement.innerHTML = originalText;
                    buttonElement.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                console.error('Could not copy text: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = examId;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    const originalText = buttonElement.innerHTML;
                    buttonElement.innerHTML = '<i class="fas fa-check me-1"></i>Copied';
                    buttonElement.classList.add('copied');
                    
                    setTimeout(function() {
                        buttonElement.innerHTML = originalText;
                        buttonElement.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Fallback: Could not copy text: ', err);
                }
                document.body.removeChild(textArea);
            });
        }

        // Display exams in the grid
        function displayExams(exams) {
            hideLoading();
            
            const container = document.getElementById('examsContainer');
            const noExamsMessage = document.getElementById('noExamsMessage');

            if (exams.length === 0) {
                container.style.display = 'none';
                noExamsMessage.style.display = 'block';
                return;
            }

            noExamsMessage.style.display = 'none';
            container.style.display = 'grid';

            container.innerHTML = exams.map(exam => {
                const examId = exam.id || exam._id;
                return `
                    <div class="exam-card" data-exam-id="${examId}">
                        <div class="exam-header">
                            <h3 class="exam-title">${escapeHtml(exam.title)}</h3>
                            <span class="exam-status status-${exam.status}">${exam.status.toUpperCase()}</span>
                        </div>
                        
                        <!-- Exam ID Section -->
                        <div class="exam-id-section">
                            <div>
                                <div class="exam-id-label">Exam ID</div>
                                <div class="exam-id-value" title="${examId}">${examId}</div>
                            </div>
                            <button class="copy-btn" onclick="copyExamId('${examId}', this)">
                                <i class="fas fa-copy me-1"></i>Copy
                            </button>
                        </div>
                        
                        <div class="exam-meta">
                            <div class="meta-item">
                                <div>Category: <span class="meta-value">${escapeHtml(exam.category)}</span></div>
                            </div>
                            <div class="meta-item">
                                <div>Duration: <span class="meta-value">${exam.duration} min</span></div>
                            </div>
                            <div class="meta-item">
                                <div>Questions: <span class="meta-value">${exam.questionCount}</span></div>
                            </div>
                            <div class="meta-item">
                                <div>Created: <span class="meta-value">${formatDate(exam.createdAt)}</span></div>
                            </div>
                        </div>

                        ${exam.description ? `<div class="exam-description">${escapeHtml(exam.description)}</div>` : ''}
                        
                        <div class="exam-actions">
                            <button class="btn btn-primary btn-sm" onclick="manageQuestions('${examId}')">
                                <i class="fas fa-edit me-2"></i>Manage Questions
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="editExam('${examId}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteExam('${examId}', '${escapeHtml(exam.title)}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Create new exam
        function createNewExam() {
            document.getElementById('examModalTitle').textContent = 'Create New Exam';
            document.getElementById('examForm').reset();
            
            // Pre-fill with context parameters
            document.getElementById('examCollegeId').value = currentParams.collegeId || '';
            document.getElementById('examBranch').value = currentParams.branch || '';
            
            currentExamId = null;
            new bootstrap.Modal(document.getElementById('examModal')).show();
        }

        // Edit exam
        function editExam(id) {
            const exam = allExams.find(e => (e.id === id || e._id === id));
            if (!exam) return;

            document.getElementById('examModalTitle').textContent = 'Edit Exam';
            document.getElementById('examTitle').value = exam.title;
            document.getElementById('examDuration').value = exam.duration;
            document.getElementById('examCategory').value = exam.category;
            document.getElementById('examStatus').value = exam.status;
            document.getElementById('examDescription').value = exam.description;
            document.getElementById('examCollegeId').value = exam.collegeId || '';
            document.getElementById('examBranch').value = exam.branch || '';
            
            currentExamId = id;
            new bootstrap.Modal(document.getElementById('examModal')).show();
        }

        // Save exam
        async function saveExam() {
            const title = document.getElementById('examTitle').value;
            const duration = document.getElementById('examDuration').value;
            const category = document.getElementById('examCategory').value;
            const status = document.getElementById('examStatus').value;
            const description = document.getElementById('examDescription').value;
            const collegeId = document.getElementById('examCollegeId').value;
            const branch = document.getElementById('examBranch').value;

            if (!title || !duration || !category || !status) {
                alert('Please fill in all required fields');
                return;
            }

            const examData = {
                title,
                duration: parseInt(duration),
                category,
                status,
                description,
                collegeId,
                branch
            };

            try {
                const token = localStorage.getItem('token');
                let response;
                
                if (currentExamId) {
                    response = await fetch(`/api/exams/${currentExamId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(examData)
                    });
                } else {
                    response = await fetch('/api/exams', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(examData)
                    });
                }
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('examModal')).hide();
                    loadExams();
                    alert(currentExamId ? 'Exam updated successfully!' : 'Exam created successfully!');
                } else {
                    const errorData = await response.json();
                    alert('Error: ' + (errorData.message || 'Failed to save exam'));
                }
            } catch (error) {
                console.error('Error saving exam:', error);
                alert('Network error. Please try again.');
            }
        }

        // Delete exam
        async function deleteExam(examId, examTitle) {
            if (!confirm(`Are you sure you want to delete the exam "${examTitle}"? This action cannot be undone.`)) {
                return;
            }

            try {
                const response = await fetch(`/api/exams/${examId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                console.log('Exam deleted successfully');
                loadExams();
                alert('Exam deleted successfully!');

            } catch (error) {
                console.error('Error deleting exam:', error);
                showError('Failed to delete exam. Please try again.');
            }
        }

        // Manage questions
        function manageQuestions(examId) {
            currentExamId = examId;
            const exam = allExams.find(e => (e.id === examId || e._id === examId));
            document.getElementById('questionModalTitle').textContent = `Manage Questions - ${exam.title}`;
            
            loadQuestions(examId);
            new bootstrap.Modal(document.getElementById('questionModal')).show();
        }

        // Load questions
        async function loadQuestions(examId) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/questions/admin/exam/${examId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const responseData = await response.json();
                    console.log('Response data:', responseData);
                    
                    if (responseData.success && responseData.data) {
                        questions = responseData.data.questions || [];
                    } else {
                        questions = Array.isArray(responseData) ? responseData : [];
                    }
                    
                    console.log('Loaded questions:', questions);
                    displayQuestions();
                } else {
                    console.error('Failed to load questions, status:', response.status);
                    const errorData = await response.json();
                    console.error('Error data:', errorData);
                    questions = [];
                    displayQuestions();
                }
            } catch (error) {
                console.error('Error loading questions:', error);
                questions = [];
                displayQuestions();
            }
        }

        /*/ Display questions
        function displayQuestions() {
            const questionsList = document.getElementById('questionsList');
            questionsList.innerHTML = '';

            if (!questions || questions.length === 0) {
                questionsList.innerHTML = `
                    <div class="text-center">
                        <p class="text-muted">No questions added yet. Click "Add New Question" to get started.</p>
                    </div>
                `;
                return;
            }

            questions.forEach((question, index) => {
                const questionId = question.id || question._id;
                console.log('Question ID for display:', questionId, 'Question:', question);
                
                const questionHtml = `
                    <div class="question-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6><i class="fas fa-question-circle me-2"></i>Question ${index + 1}</h6>
                                <p><strong>${question.text}</strong></p>
                                <div class="options-list">
                                    ${question.options ? question.options.map((option, optIndex) => `
                                        <div class="option-item ${optIndex === question.correctAnswer ? 'correct-option' : ''}">
                                            ${String.fromCharCode(65 + optIndex)}. ${option}
                                            ${optIndex === question.correctAnswer ? '<i class="fas fa-check text-success ms-2"></i>' : ''}
                                        </div>
                                    `).join('') : '<p class="text-muted">No options available</p>'}
                                </div>
                            </div>
                            <div class="ms-3">
                                <button class="btn btn-sm btn-outline-primary me-2" onclick="editQuestion('${questionId}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion('${questionId}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                questionsList.innerHTML += questionHtml;
            });
        }*/
 //Modified displayQuestions function
function displayQuestions() {
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';

    if (!questions || questions.length === 0) {
        questionsList.innerHTML = `
            <div class="text-center">
                <p class="text-muted">No questions added yet. Click "Add New Question" to get started.</p>
            </div>
        `;
        return;
    }

    questions.forEach((question, index) => {
        const questionId = question.id || question._id;
        console.log('Question ID for display:', questionId, 'Question:', question);
        
        // Determine question content display
        let questionContent = '';
        if (question.photoUrl) {
            questionContent = `
                <div class="question-photo mb-2">
                    <img src="${question.photoUrl}" alt="Question Image" style="max-width: 300px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `;
        } else {
            questionContent = `<p><strong>${question.text}</strong></p>`;
        }
        
        const questionHtml = `
            <div class="question-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6>
                            <i class="fas fa-question-circle me-2"></i>Question ${index + 1}
                            ${question.photoUrl ? '<i class="fas fa-camera text-primary ms-2" title="Photo Question"></i>' : '<i class="fas fa-keyboard text-success ms-2" title="Text Question"></i>'}
                        </h6>
                        ${questionContent}
                        <div class="options-list">
                            ${question.options ? question.options.map((option, optIndex) => `
                                <div class="option-item ${optIndex === question.correctAnswer ? 'correct-option' : ''}">
                                    ${String.fromCharCode(65 + optIndex)}. ${option}
                                    ${optIndex === question.correctAnswer ? '<i class="fas fa-check text-success ms-2"></i>' : ''}
                                </div>
                            `).join('') : '<p class="text-muted">No options available</p>'}
                        </div>
                    </div>
                    <div class="ms-3">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="editQuestion('${questionId}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion('${questionId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        questionsList.innerHTML += questionHtml;
    });
}        

        // Add new question
        function addNewQuestion() {
            document.getElementById('addQuestionCard').style.display = 'block';
            document.getElementById('questionForm').reset();
            currentEditingQuestionId = null;
            updateSaveButton('Save Question', 'saveQuestion()');
            setupQuestionForm();
        }


        // Toggle question input method
function toggleQuestionInputMethod(method) {
    const textContainer = document.getElementById('textQuestionContainer');
    const photoContainer = document.getElementById('photoQuestionContainer');
    const questionText = document.getElementById('questionText');
    const questionPhoto = document.getElementById('questionPhoto');
    
    if (method === 'text') {
        textContainer.style.display = 'block';
        photoContainer.style.display = 'none';
        questionText.required = true;
        questionPhoto.required = false;
        selectedQuestionPhoto = null;
        hidePhotoPreview();
    } else {
        textContainer.style.display = 'none';
        photoContainer.style.display = 'block';
        questionText.required = false;
        questionPhoto.required = true;
    }
}

// Handle photo upload
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, GIF)');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            event.target.value = '';
            return;
        }
        
        selectedQuestionPhoto = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            showPhotoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Show photo preview
function showPhotoPreview(src) {
    const previewContainer = document.getElementById('photoPreview');
    const previewImage = document.getElementById('previewImage');
    
    previewImage.src = src;
    previewContainer.style.display = 'block';
}

// Hide photo preview
function hidePhotoPreview() {
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('previewImage').src = '';
}

// Remove photo
function removePhoto() {
    selectedQuestionPhoto = null;
    currentQuestionPhotoUrl = null;
    document.getElementById('questionPhoto').value = '';
    hidePhotoPreview();
}

// Upload photo to server
async function uploadQuestionPhoto(file) {
    const formData = new FormData();
    formData.append('questionPhoto', file);
    
    try {
        const response = await fetch('/api/questions/upload/question-photo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload photo');
        }
        
        const result = await response.json();
        return result.photoUrl;
    } catch (error) {
        console.error('Error uploading photo:', error);
        throw error;
    }
}

// Updated setup question form function
function setupQuestionForm() {
    const questionType = document.getElementById('questionType');
    questionType.addEventListener('change', function() {
        updateOptionsContainer();
    });
    
    // Add event listeners for photo upload
    document.querySelectorAll('input[name="questionMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleQuestionInputMethod(this.value);
        });
    });
    
    document.getElementById('questionPhoto').addEventListener('change', function(e) {
        handlePhotoUpload(e);
    });
    
    updateOptionsContainer();
}





        // Setup question form
        function setupQuestionForm() {
            /*const questionType = document.getElementById('questionType');
            questionType.addEventListener('change', function() {
                updateOptionsContainer();
            });
            updateOptionsContainer();*/
            const questionType = document.getElementById('questionType');
              questionType.addEventListener('change', function() {
               updateOptionsContainer();
            });  
    
    // Add these new event listeners for photo upload
            document.querySelectorAll('input[name="questionMethod"]').forEach(radio => {
            radio.addEventListener('change', function() {
            toggleQuestionInputMethod(this.value);
             });
          });
    
            document.getElementById('questionPhoto').addEventListener('change', function(e) {
                handlePhotoUpload(e);
          });
    
            updateOptionsContainer();

        }

        // Update options container based on question type
        function updateOptionsContainer() {
            const questionType = document.getElementById('questionType').value;
            const optionsList = document.getElementById('optionsList');
            
            if (questionType === 'multiple-choice') {
                optionsList.innerHTML = `
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="option0" placeholder="Option A" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="option1" placeholder="Option B" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="option2" placeholder="Option C" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control" id="option3" placeholder="Option D" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Correct Answer *</label>
                        <select class="form-select" id="correctAnswer" required>
                            <option value="">Select correct answer</option>
                            <option value="0">Option A</option>
                            <option value="1">Option B</option>
                            <option value="2">Option C</option>
                            <option value="3">Option D</option>
                        </select>
                    </div>
                `;
            } else if (questionType === 'true-false') {
                optionsList.innerHTML = `
                    <div class="col-12">
                        <label class="form-label">Correct Answer *</label>
                        <select class="form-select" id="correctAnswer" required>
                            <option value="">Select correct answer</option>
                            <option value="0">True</option>
                            <option value="1">False</option>
                        </select>
                    </div>
                `;
            }else{
                optionsList.innerHTML = `
                    <div class="col-12">
                        <label class="form-label">Select allotaed number *</label>
                        <select class="form-select" id="correctAnswer" required>
                            <option value="">Select alloted number for the perticular Question</option>
                            <option value="0">4marks</option>
                            <option value="1">8marks</option>
                        </select>
                    </div>
                `;
            }
        }

        // Save question
       /* async function saveQuestion() {
            const questionText = document.getElementById('questionText').value;
            const questionType = document.getElementById('questionType').value;
            const correctAnswer = document.getElementById('correctAnswer').value;

            if (!questionText || !questionType || correctAnswer === '') {
                alert('Please fill in all required fields');
                return;
            }

            let options = [];
            if (questionType === 'multiple-choice') {
                options = [
                    document.getElementById('option0').value,
                    document.getElementById('option1').value,
                    document.getElementById('option2').value,
                    document.getElementById('option3').value
                ];
                
                if (options.some(opt => !opt.trim())) {
                    alert('Please fill in all options');
                    return;
                }
            } else {
                options = ['True', 'False'];
            }

            const questionData = {
                text: questionText,
                type: questionType,
                options: options,
                correctAnswer: parseInt(correctAnswer)
            };

            try {
                const token = localStorage.getItem('token');
                let response;
                
                if (currentEditingQuestionId) {
                    // Update existing question
                    response = await fetch(`/api/questions/${currentEditingQuestionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(questionData)
                    });
                } else {
                    // Add new question
                    response = await fetch(`/api/questions/exam/${currentExamId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(questionData)
                    });
                }
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Question saved:', result);
                    loadQuestions(currentExamId);
                    loadExams();
                    cancelAddQuestion();
                    alert(currentEditingQuestionId ? 'Question updated successfully!' : 'Question added successfully!');
                } else {
                    const errorData = await response.json();
                    console.error('Error saving question:', errorData);
                    alert('Error: ' + (errorData.message || 'Failed to save question'));
                }
            } catch (error) {
                console.error('Error saving question:', error);
                alert('Network error. Please try again.');
            }
        }*/

        
async function saveQuestion() {
    const questionMethod = document.querySelector('input[name="questionMethod"]:checked').value;
    const questionText = document.getElementById('questionText').value;
    const questionType = document.getElementById('questionType').value;
    const correctAnswer = document.getElementById('correctAnswer').value;

    // Validation based on input method
    if (questionMethod === 'text') {
        if (!questionText || !questionType || correctAnswer === '') {
            alert('Please fill in all required fields');
            return;
        }
    } else {
        if (!selectedQuestionPhoto && !currentQuestionPhotoUrl) {
            alert('Please upload a question photo');
            return;
        }
        if (!questionType || correctAnswer === '') {
            alert('Please select question type and correct answer');
            return;
        }
    }

    let options = [];
    if (questionType === 'multiple-choice') {
        options = [
            document.getElementById('option0').value,
            document.getElementById('option1').value,
            document.getElementById('option2').value,
            document.getElementById('option3').value
        ];
        
        if (options.some(opt => !opt.trim())) {
            alert('Please fill in all options');
            return;
        }
    } else if(questionType === 'true-false'){ 
        options = ['True', 'False'];
    }else{
        options = ['4marks', '8marks'];
    }

    try {
        let photoUrl = currentQuestionPhotoUrl;
        
        // Upload photo if new one selected
        if (selectedQuestionPhoto) {
            try {
                photoUrl = await uploadQuestionPhoto(selectedQuestionPhoto);
            } catch (error) {
                alert('Failed to upload photo: ' + error.message);
                return;
            }
        }

        const questionData = {
            text: questionMethod === 'text' ? questionText : '',
            photoUrl: questionMethod === 'photo' ? photoUrl : null,
            type: questionType,
            options: options,
            correctAnswer: parseInt(correctAnswer)
        };

        const token = localStorage.getItem('token');
        let response;
        
        if (currentEditingQuestionId) {
            // Update existing question
            response = await fetch(`/api/questions/${currentEditingQuestionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(questionData)
            });
        } else {
            // Add new question
            response = await fetch(`/api/questions/exam/${currentExamId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(questionData)
            });
        }
        
        if (response.ok) {
            const result = await response.json();
            console.log('Question saved:', result);
            loadQuestions(currentExamId);
            loadExams();
            cancelAddQuestion();
            alert(currentEditingQuestionId ? 'Question updated successfully!' : 'Question added successfully!');
        } else {
            const errorData = await response.json();
            console.error('Error saving question:', errorData);
            alert('Error: ' + (errorData.message || 'Failed to save question'));
        }
    } catch (error) {
        console.error('Error saving question:', error);
        alert('Network error. Please try again.');
    }
}




       /* // Edit question
        function editQuestion(questionId) {
            const question = questions.find(q => (q.id === questionId || q._id === questionId));
            if (!question) {
                alert('Question not found');
                return;
            }

            currentEditingQuestionId = questionId;
            
            // Populate the form with existing question data
            document.getElementById('questionText').value = question.text;
            document.getElementById('questionType').value = question.type;
            
            // Update options container based on question type
            updateOptionsContainer();
            
            // Fill in options and correct answer
            if (question.type === 'multiple-choice') {
                question.options.forEach((option, index) => {
                    const optionInput = document.getElementById(`option${index}`);
                    if (optionInput) {
                        optionInput.value = option;
                    }
                });
            }
            
            document.getElementById('correctAnswer').value = question.correctAnswer;
            
            // Show the form
            document.getElementById('addQuestionCard').style.display = 'block';
            
            // Change the save button to update mode
            updateSaveButton('Update Question', 'saveQuestion()');
        }*/

function editQuestion(questionId) {
    const question = questions.find(q => (q.id === questionId || q._id === questionId));
    if (!question) {
        alert('Question not found');
        return;
    }

    currentEditingQuestionId = questionId;
    
    // Set input method based on question data
    if (question.photoUrl) {
        document.getElementById('methodPhoto').checked = true;
        toggleQuestionInputMethod('photo');
        currentQuestionPhotoUrl = question.photoUrl;
        showPhotoPreview(question.photoUrl);
    } else {
        document.getElementById('methodText').checked = true;
        toggleQuestionInputMethod('text');
        document.getElementById('questionText').value = question.text;
    }
    
    document.getElementById('questionType').value = question.type;
    
    // Update options container based on question type
    updateOptionsContainer();
    
    // Fill in options and correct answer
    if (question.type === 'multiple-choice') {
        question.options.forEach((option, index) => {
            const optionInput = document.getElementById(`option${index}`);
            if (optionInput) {
                optionInput.value = option;
            }
        });
    }
           
    
    document.getElementById('correctAnswer').value = question.correctAnswer;
    
    // Show the form
    document.getElementById('addQuestionCard').style.display = 'block';
    
    // Change the save button to update mode
    updateSaveButton('Update Question', 'saveQuestion()');
}


        // Delete question
        async function deleteQuestion(questionId) {
            console.log('Attempting to delete question with ID:', questionId);
            
            if (!questionId) {
                alert('Error: Question ID is missing');
                return;
            }

            if (confirm('Are you sure you want to delete this question?')) {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/questions/${questionId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    console.log('Delete response status:', response.status);
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('Delete result:', result);
                        loadQuestions(currentExamId);
                        loadExams();
                        alert('Question deleted successfully!');
                    } else {
                        const errorData = await response.json();
                        console.error('Delete error response:', errorData);
                        alert('Error: ' + (errorData.message || errorData.error || 'Failed to delete question'));
                    }
                } catch (error) {
                    console.error('Error deleting question:', error);
                    alert('Network error. Please try again.');
                }
            }
        }

        /*/ Cancel add question
        function cancelAddQuestion() {
            document.getElementById('addQuestionCard').style.display = 'none';
            document.getElementById('questionForm').reset();
            currentEditingQuestionId = null;
            updateSaveButton('Save Question', 'saveQuestion()');
        }*/
     // Modified cancelAddQuestion function   
       function cancelAddQuestion() {
    document.getElementById('addQuestionCard').style.display = 'none';
    document.getElementById('questionForm').reset();
    
    // Reset photo upload
    selectedQuestionPhoto = null;
    currentQuestionPhotoUrl = null;
    hidePhotoPreview();
    
    // Reset to text method
    document.getElementById('methodText').checked = true;
    toggleQuestionInputMethod('text');
    
    currentEditingQuestionId = null;
    updateSaveButton('Save Question', 'saveQuestion()');
}

        // Update save button
        function updateSaveButton(text, onclick) {
            const saveBtn = document.querySelector('#addQuestionCard .btn-primary');
            if (saveBtn) {
                saveBtn.innerHTML = `<i class="fas fa-save me-2"></i>${text}`;
                saveBtn.setAttribute('onclick', onclick);
            }
        }

        // Refresh exams
        function refreshExams() {
            loadExams();
        }

        // Logout
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        // Utility functions
        function showLoading() {
            document.getElementById('loadingMessage').style.display = 'block';
            document.getElementById('examsContainer').style.display = 'none';
            document.getElementById('noExamsMessage').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('loadingMessage').style.display = 'none';
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            document.getElementById('errorMessage').style.display = 'none';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            return new Date(dateString).toLocaleDateString();
        }