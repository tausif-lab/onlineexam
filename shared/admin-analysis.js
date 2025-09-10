let performanceChart = null;

        function showLoading() {
            document.getElementById('loading').classList.add('show');
            document.getElementById('error').classList.remove('show');
            document.getElementById('noData').classList.remove('show');
            document.getElementById('resultsContainer').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
        }

        function showError(message = 'Failed to load exam results. Please check the Exam ID and try again.') {
            hideLoading();
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('error').classList.add('show');
            document.getElementById('noData').classList.remove('show');
            document.getElementById('resultsContainer').style.display = 'none';
        }

        function showNoData() {
            hideLoading();
            document.getElementById('error').classList.remove('show');
            document.getElementById('noData').classList.add('show');
            document.getElementById('resultsContainer').style.display = 'none';
        }

        function showResults() {
            hideLoading();
            document.getElementById('error').classList.remove('show');
            document.getElementById('noData').classList.remove('show');
            document.getElementById('resultsContainer').style.display = 'block';
        }

        async function loadExamResults() {
            const examId = document.getElementById('examId').value.trim();
            
            if (!examId) {
                alert('Please enter an Exam ID');
                return;
            }

            // Basic client-side ObjectId validation
            if (!/^[0-9a-fA-F]{24}$/.test(examId)) {
                showError('Invalid Exam ID format. Please enter a valid 24-character hex string.');
                return;
            }

            showLoading();

            try {
                console.log('Fetching results for exam ID:', examId);
                
                // Make actual API call to your backend
                const response = await fetch(`/api/results/admin/exam/${examId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add authorization header if needed
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 400) {
                        const errorData = await response.json();
                        showError(errorData.message || 'Invalid request. Please check the Exam ID format.');
                        return;
                    } else if (response.status === 404) {
                        showError('Exam not found. Please check the Exam ID.');
                        return;
                    } else if (response.status === 403) {
                        showError('Access denied. Admin privileges required.');
                        return;
                    } else if (response.status === 401) {
                        showError('Authentication required. Please log in.');
                        return;
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }

                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Failed to fetch exam results');
                }

                console.log('API response:', result);
                
                if (!result.data || !result.data.results || result.data.results.length === 0) {
                    showNoData();
                    return;
                }

                displayExamResults(result.data);
                showResults();

            } catch (error) {
                console.error('Error loading exam results:', error);
                
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    showError('Unable to connect to server. Please check your network connection.');
                } else {
                    showError(error.message || 'An unexpected error occurred while loading exam results.');
                }
            }
        }

        function displayExamResults(data) {
            console.log('Displaying exam results:', data);
            
            // Validate data structure
            if (!data.exam || !data.statistics || !data.results) {
                showError('Invalid data structure received from server.');
                return;
            }
            
            // Update exam info with proper fallbacks
            document.getElementById('examTitle').textContent = data.exam.title || 'Unknown Exam';
            document.getElementById('examCategory').textContent = data.exam.category || 'Unknown Category';
            document.getElementById('examDuration').textContent = `${data.exam.duration || 'N/A'} minutes`;
            document.getElementById('totalSubmissions').textContent = data.statistics.totalSubmissions || 0;
            document.getElementById('averageScore').textContent = data.statistics.averageScore || 0;

            // Calculate pass/fail statistics
            const passThreshold = 60;
            const passedStudents = data.results.filter(result => {
                const percentage = parseFloat(result.percentage);
                return !isNaN(percentage) && percentage >= passThreshold;
            });
            const failedStudents = data.results.filter(result => {
                const percentage = parseFloat(result.percentage);
                return isNaN(percentage) || percentage < passThreshold;
            });
            const passRate = data.results.length > 0 ? ((passedStudents.length / data.results.length) * 100).toFixed(1) : 0;

            // Update statistics
            document.getElementById('passCount').textContent = passedStudents.length;
            document.getElementById('failCount').textContent = failedStudents.length;
            document.getElementById('passRate').textContent = `${passRate}%`;
            document.getElementById('averagePercentage').textContent = `${data.statistics.averagePercentage || 0}%`;

            // Create performance chart
            createPerformanceChart(data.results);
        }

        function createPerformanceChart(results) {
            const ctx = document.getElementById('performanceChart').getContext('2d');

            // Destroy existing chart if it exists
            if (performanceChart) {
                performanceChart.destroy();
            }

            // Validate results array
            if (!results || !Array.isArray(results) || results.length === 0) {
                showError('No results data available for chart.');
                return;
            }

            // Sort results by student name for better visualization
            const sortedResults = results.sort((a, b) => {
                // Safely get student names with fallbacks
                const aName = (a.student && a.student.name) ? a.student.name : 
                             (a.student && a.student.user1Id) ? a.student.user1Id : 'Unknown';
                const bName = (b.student && b.student.name) ? b.student.name : 
                             (b.student && b.student.user1Id) ? b.student.user1Id : 'Unknown';
                return aName.localeCompare(bName);
            });

            const labels = sortedResults.map((result, index) => {
                if (!result.student) {
                    return `Student ${index + 1}`;
                }
                
                // Try different approaches to get student identifier
                if (result.student.user1Id) {
                    return result.student.user1Id;
                } else if (result.student.name) {
                    // Safely split the name
                    const nameParts = result.student.name.split(' ');
                    return nameParts[0] || result.student.name;
                } else if (result.student.email) {
                    // Use email prefix if available
                    return result.student.email.split('@')[0];
                } else {
                    return `Student ${index + 1}`;
                }
            });

            const scores = sortedResults.map(result => {
                const score = parseInt(result.score);
                return isNaN(score) ? 0 : score;
            });

            const percentages = sortedResults.map(result => {
                const percentage = parseFloat(result.percentage);
                return isNaN(percentage) ? 0 : percentage;
            });

            // Color coding based on pass/fail
            const backgroundColors = percentages.map(percentage => {
                if (percentage >= 60) {
                    return 'rgba(39, 174, 96, 0.8)'; // Green for pass
                } else {
                    return 'rgba(231, 76, 60, 0.8)'; // Red for fail
                }
            });

            const borderColors = percentages.map(percentage => {
                if (percentage >= 60) {
                    return 'rgba(39, 174, 96, 1)';
                } else {
                    return 'rgba(231, 76, 60, 1)';
                }
            });

            performanceChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Score',
                        data: scores,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Student Performance Analysis',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: '#2c3e50'
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            callbacks: {
                                title: function(tooltipItems) {
                                    const index = tooltipItems[0].dataIndex;
                                    const result = sortedResults[index];
                                    if (!result.student) {
                                        return `Student ${index + 1}`;
                                    }
                                    return result.student.name || result.student.user1Id || `Student ${index + 1}`;
                                },
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const result = sortedResults[index];
                                    const percentage = parseFloat(result.percentage) || 0;
                                    const status = percentage >= 60 ? 'PASSED' : 'FAILED';
                                    const timeTaken = parseInt(result.timeTaken) || 0;
                                    const timeTakenMinutes = Math.floor(timeTaken / 60);
                                    const timeTakenSeconds = timeTaken % 60;
                                    
                                    const tooltipLines = [
                                        `Score: ${result.score || 0}/${result.totalQuestions || 0}`,
                                        `Percentage: ${percentage.toFixed(1)}%`,
                                        `Status: ${status}`,
                                        `Time Taken: ${timeTakenMinutes}m ${timeTakenSeconds}s`
                                    ];
                                    
                                    if (result.student && result.student.email) {
                                        tooltipLines.push(`Email: ${result.student.email}`);
                                    }
                                    
                                    return tooltipLines;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Students',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            },
                            ticks: {
                                color: '#2c3e50',
                                font: {
                                    weight: '500'
                                },
                                maxRotation: 45
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Obtained Marks',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#2c3e50'
                            },
                            beginAtZero: true,
                            ticks: {
                                color: '#2c3e50',
                                font: {
                                    weight: '500'
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                borderDash: [5, 5]
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        // Allow Enter key to trigger search
        document.getElementById('examId').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadExamResults();
            }
        });