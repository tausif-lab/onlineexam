
        let currentSubmissions = [];
        let currentSelectedSubmission = null;
        let scores = {};

        // DOM Elements
        const examIdInput = document.getElementById('examId');
        const loadSubmissionsBtn = document.getElementById('loadSubmissionsBtn');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const submissionsList = document.getElementById('submissionsList');
        const submissionsTableBody = document.getElementById('submissionsTableBody');
        const submissionCount = document.getElementById('submissionCount');
        const scoringInterface = document.getElementById('scoringInterface');
        const studentInfo = document.getElementById('studentInfo');
        const canvasAnswersGrid = document.getElementById('canvasAnswersGrid');
        const backToListBtn = document.getElementById('backToListBtn');
        const saveAllScoresBtn = document.getElementById('saveAllScoresBtn');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        // Event Listeners
        loadSubmissionsBtn.addEventListener('click', fetchSubmissions);
        backToListBtn.addEventListener('click', backToSubmissionsList);
        saveAllScoresBtn.addEventListener('click', saveAllScores);

        // Fetch submissions for scoring
        async function fetchSubmissions() {
            const examId = examIdInput.value.trim();
            if (!examId) {
                showError('Please enter an exam ID');
                return;
            }

            setLoading(true);
            hideError();

            try {
                const response = await fetch(`/api/results/admin/exam/${examId}/submissions-for-scoring`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                
                if (data.success) {
                    currentSubmissions = data.data.submissions;
                    displaySubmissions();
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error fetching submissions:', error);
                showError('Error fetching submissions');
            } finally {
                setLoading(false);
            }
        }

        // Display submissions in table
        function displaySubmissions() {
            if (currentSubmissions.length === 0) {
                showError('No submissions with canvas answers found for this exam');
                return;
            }

            submissionCount.textContent = `(${currentSubmissions.length} submissions)`;
            
            submissionsTableBody.innerHTML = currentSubmissions.map(submission => {
                const scoringProgress = `${submission.scoredCanvasAnswers}/${submission.totalCanvasAnswers}`;
                const isComplete = submission.scoredCanvasAnswers === submission.totalCanvasAnswers;
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${submission.student.name}</div>
                            <div class="text-sm text-gray-500">${submission.student.email}</div>
                            <div class="text-xs text-gray-400">ID: ${submission.student.user1Id}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="text-sm font-medium">${submission.mcqScore}/${submission.totalMcqQuestions}</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="text-sm">${submission.totalCanvasAnswers} answers</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${scoringProgress} ${isComplete ? '✓' : ''}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium">${submission.finalScore || submission.mcqScore}</div>
                            <div class="text-xs text-gray-500">${submission.finalPercentage || 0}%</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button 
                                onclick="loadSubmissionForScoring('${submission.submissionId}')"
                                class="text-blue-600 hover:text-blue-900"
                            >
                                Score
                            </button>
                            <button 
                                onclick="downloadPdf('${submission.submissionId}')"
                                class="text-green-600 hover:text-green-900"
                            >
                                PDF
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            submissionsList.classList.remove('hidden');
        }

        // Load submission for scoring
        async function loadSubmissionForScoring(submissionId) {
            setLoading(true);
            hideError();

            try {
                const response = await fetch(`/api/results/admin/submission/${submissionId}/canvas-details`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                
                if (data.success) {
                    currentSelectedSubmission = data.data;
                    initializeScores();
                    displayScoringInterface();
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error loading submission details:', error);
                showError('Error loading submission details');
            } finally {
                setLoading(false);
            }
        }

        // Initialize scores object
        function initializeScores() {
            scores = {};
            currentSelectedSubmission.canvasAnswers.forEach(ca => {
                scores[ca.questionId] = {
                    score: ca.adminScore || 0,
                    maxScore: ca.maxScore || 10,
                    feedback: ca.adminFeedback || ''
                };
            });
        }

        // Display scoring interface
        function displayScoringInterface() {
            const submission = currentSelectedSubmission;
            
            // Update student info
            studentInfo.innerHTML = `
                <strong>${submission.student.name}</strong> (${submission.student.email}) | 
                User ID: ${submission.student.user1Id} | 
                Submitted: ${new Date(submission.submittedAt).toLocaleString()}
            `;

            // Generate canvas answers grid
            canvasAnswersGrid.innerHTML = submission.canvasAnswers.map((ca, index) => {
                const scoreData = scores[ca.questionId];
                const isScored = ca.isScored;
                
                return `
                    <div class="border rounded-lg p-6 ${isScored ? 'scored' : 'unscored'}">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-semibold">Question ${index + 1}</h3>
                                <p class="text-sm text-gray-600">${ca.questionText}</p>
                                <p class="text-xs text-gray-400">Question ID: ${ca.questionId}</p>
                            </div>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${isScored ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${isScored ? 'Scored' : 'Pending'}
                            </span>
                        </div>

                        <!-- Canvas Image -->
                        <div class="mb-4">
                            <img 
                                src="${ca.dataURL}" 
                                alt="Student Answer ${index + 1}"
                                class="canvas-image"
                                onclick="openImageModal('${ca.dataURL}', 'Question ${index + 1}')"
                            />
                        </div>

                        <!-- Scoring Controls -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Score</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="${scoreData.maxScore}"
                                    value="${scoreData.score}"
                                    onchange="updateScore('${ca.questionId}', 'score', this.value)"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value="${scoreData.maxScore}"
                                    onchange="updateScore('${ca.questionId}', 'maxScore', this.value)"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                                <button 
                                    onclick="scoreIndividualAnswer('${ca.questionId}')"
                                    class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Save Score
                                </button>
                            </div>
                        </div>

                        <!-- Feedback -->
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                            <textarea 
                                rows="3" 
                                placeholder="Optional feedback for student"
                                onchange="updateScore('${ca.questionId}', 'feedback', this.value)"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >${scoreData.feedback}</textarea>
                        </div>

                        ${isScored ? `
                            <div class="mt-2 text-xs text-gray-500">
                                Scored on: ${new Date(ca.scoredAt).toLocaleString()}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Show scoring interface, hide submissions list
            submissionsList.classList.add('hidden');
            scoringInterface.classList.remove('hidden');
        }

        // Update score in memory
        function updateScore(questionId, field, value) {
            if (!scores[questionId]) {
                scores[questionId] = { score: 0, maxScore: 10, feedback: '' };
            }
            
            if (field === 'score' || field === 'maxScore') {
                scores[questionId][field] = Math.max(0, parseInt(value) || 0);
                
                // Ensure score doesn't exceed maxScore
                if (field === 'maxScore' && scores[questionId].score > scores[questionId].maxScore) {
                    scores[questionId].score = scores[questionId].maxScore;
                    // Update the score input
                    const scoreInput = document.querySelector(`input[onchange*="'${questionId}', 'score'"]`);
                    if (scoreInput) scoreInput.value = scores[questionId].score;
                }
            } else {
                scores[questionId][field] = value;
            }
        }

        // Score individual canvas answer
        async function scoreIndividualAnswer(questionId) {
            const scoreData = scores[questionId];
            if (!scoreData) return;

            setScoring(true);
            hideError();

            try {
                const response = await fetch(`/api/results/admin/submission/${currentSelectedSubmission.submissionId}/question/${questionId}/score`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        score: scoreData.score,
                        maxScore: scoreData.maxScore,
                        feedback: scoreData.feedback
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Update current submission data
                    currentSelectedSubmission.finalScore = data.data.finalScore;
                    currentSelectedSubmission.finalPercentage = data.data.finalPercentage;
                    
                    // Mark as scored in UI
                    const questionDiv = document.querySelector(`[onclick*="'${questionId}'"]`).closest('.border');
                    questionDiv.classList.remove('unscored');
                    questionDiv.classList.add('scored');
                    
                    // Update status badge
                    const statusBadge = questionDiv.querySelector('.px-2.py-1');
                    statusBadge.textContent = 'Scored';
                    statusBadge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800';
                    
                    showSuccess('Score saved successfully');
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error scoring answer:', error);
                showError('Error saving score');
            } finally {
                setScoring(false);
            }
        }

        // Save all scores at once
        async function saveAllScores() {
            const scoresArray = Object.keys(scores).map(questionId => ({
                questionId,
                score: scores[questionId].score,
                maxScore: scores[questionId].maxScore,
                feedback: scores[questionId].feedback
            }));

            setScoring(true);
            hideError();

            try {
                const response = await fetch(`/api/results/admin/submission/${currentSelectedSubmission.submissionId}/bulk-score`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ scores: scoresArray })
                });

                const data = await response.json();
                
                if (data.success) {
                    showSuccess(`Successfully updated scores for ${data.data.updatedCount} canvas answers`);
                    
                    // Update all question divs to show as scored
                    document.querySelectorAll('.unscored').forEach(div => {
                        div.classList.remove('unscored');
                        div.classList.add('scored');
                        
                        const statusBadge = div.querySelector('.px-2.py-1');
                        statusBadge.textContent = 'Scored';
                        statusBadge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800';
                    });
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error saving all scores:', error);
                showError('Error saving scores');
            } finally {
                setScoring(false);
            }
        }

        // Download PDF
        function downloadPdf(submissionId) {
            const link = document.createElement('a');
            link.href = `/api/results/admin/submission/${submissionId}/descriptive-pdf`;
            link.download = '';
            link.click();
        }

        // Back to submissions list
        function backToSubmissionsList() {
            scoringInterface.classList.add('hidden');
            submissionsList.classList.remove('hidden');
            currentSelectedSubmission = null;
            scores = {};
        }

        // Open image in modal
        function openImageModal(dataURL, title) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
            modal.innerHTML = `
                <div class="relative bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
                    <div class="p-4 border-b">
                        <h3 class="text-lg font-semibold">${title}</h3>
                    </div>
                    <div class="p-4">
                        <img src="${dataURL}" alt="${title}" class="max-w-full max-h-96" />
                    </div>
                    <button 
                        onclick="this.parentElement.parentElement.remove()"
                        class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    >
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Utility functions
        function setLoading(isLoading) {
            if (isLoading) {
                loadingIndicator.classList.remove('hidden');
                loadSubmissionsBtn.disabled = true;
            } else {
                loadingIndicator.classList.add('hidden');
                loadSubmissionsBtn.disabled = false;
            }
        }

        function setScoring(isScoring) {
            saveAllScoresBtn.disabled = isScoring;
            if (isScoring) {
                saveAllScoresBtn.innerHTML = '<div class="loading-spinner"></div> Saving...';
            } else {
                saveAllScoresBtn.innerHTML = `
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save All Scores
                `;
            }
        }

        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            setTimeout(() => hideError(), 5000);
        }

        function hideError() {
            errorMessage.classList.add('hidden');
        }

        function showSuccess(message) {
            // Create success message
            const successDiv = document.createElement('div');
            successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
            successDiv.textContent = message;
            document.body.appendChild(successDiv);
            
            setTimeout(() => {
                successDiv.remove();
            }, 3000);
        }