 // Global variables
        let currentStudentData = null;
        let allResults = [];
        let scoresChart = null;

        // DOM elements
        const loginSection = document.getElementById('loginSection');
        const dashboardSection = document.getElementById('dashboardSection');
        const parentLoginForm = document.getElementById('parentLoginForm');
        const loginError = document.getElementById('loginError');
        const parentInfo = document.getElementById('parentInfo');
        const childName = document.getElementById('childName');
        const categoryFilter = document.getElementById('categoryFilter');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
        });

        function setupEventListeners() {
            parentLoginForm.addEventListener('submit', handleLogin);
            categoryFilter.addEventListener('change', filterResults);
            refreshBtn.addEventListener('click', refreshData);
            logoutBtn.addEventListener('click', handleLogout);
        }

        async function handleLogin(e) {
            e.preventDefault();
            
            const email = document.getElementById('childEmail').value;
            const password = document.getElementById('childPassword').value;
            
            setLoginLoading(true);
            hideError();

            try {
                const response = await fetch('/api/results/parent/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    currentStudentData = data.data;
                    showDashboard();
                    await loadStudentResults();
                } else {
                    showError(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Connection error. Please try again.');
            } finally {
                setLoginLoading(false);
            }
        }

        async function loadStudentResults() {
            try {
                const response = await fetch(`/api/results/parent/${currentStudentData.studentId}`);
                const data = await response.json();

                if (data.success) {
                    allResults = data.data.results || [];
                    updateDashboard();
                    populateCategoryFilter();
                    renderChart();
                    renderTable();
                    generateInsights();
                } else {
                    showError(data.message || 'Failed to load results');
                }
            } catch (error) {
                console.error('Load results error:', error);
                showError('Failed to load results');
            }
        }

        function updateDashboard() {
            const stats = calculateStats(allResults);
            
            document.getElementById('totalExams').textContent = stats.total;
            document.getElementById('passedExams').textContent = stats.passed;
            document.getElementById('failedExams').textContent = stats.failed;
            document.getElementById('averageScore').textContent = stats.average + '%';
            
            childName.textContent = `Child: ${currentStudentData.fullName}`;
        }

        function calculateStats(results) {
            if (!results.length) {
                return { total: 0, passed: 0, failed: 0, average: 0 };
            }

            const total = results.length;
            const passed = results.filter(r => parseFloat(r.percentage) >= 60).length;
            const failed = total - passed;
            const average = Math.round(
                results.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / total
            );

            return { total, passed, failed, average };
        }

        function populateCategoryFilter() {
            const categories = [...new Set(allResults.map(r => r.exam.category))];
            categoryFilter.innerHTML = '<option value="all">All Categories</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }

        function filterResults() {
            const selectedCategory = categoryFilter.value;
            const filteredResults = selectedCategory === 'all' 
                ? allResults 
                : allResults.filter(r => r.exam.category === selectedCategory);
            
            updateDashboard();
            renderChart(filteredResults);
            renderTable(filteredResults);
        }

        function renderChart(resultsToShow = allResults) {
            const ctx = document.getElementById('scoresChart').getContext('2d');
            const noDataMessage = document.getElementById('noDataMessage');

            if (scoresChart) {
                scoresChart.destroy();
            }

            if (!resultsToShow.length) {
                noDataMessage.classList.remove('hidden');
                return;
            }

            noDataMessage.classList.add('hidden');

            const labels = resultsToShow.map(r => r.exam.title);
            const scores = resultsToShow.map(r => parseFloat(r.percentage));
            const backgroundColors = scores.map(score => score >= 60 ? '#10B981' : '#EF4444');
            const borderColors = scores.map(score => score >= 60 ? '#059669' : '#DC2626');

            scoresChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Score (%)',
                        data: scores,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#4A90E2',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const score = context.parsed.y;
                                    const status = score >= 60 ? 'PASSED' : 'FAILED';
                                    return `Score: ${score}% (${status})`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(74, 144, 226, 0.1)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        function renderTable(resultsToShow = allResults) {
            const tbody = document.getElementById('resultsTableBody');
            tbody.innerHTML = '';

            resultsToShow.forEach(result => {
                const row = document.createElement('tr');
                const percentage = parseFloat(result.percentage);
                const status = percentage >= 60 ? 'PASSED' : 'FAILED';
                const statusClass = percentage >= 60 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
                const date = new Date(result.submittedAt).toLocaleDateString();

                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-custom-text">
                        ${result.exam.title}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${result.exam.category}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${result.score}/${result.totalQuestions}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${percentage}%
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${date}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function generateInsights() {
            const strengthsContent = document.getElementById('strengthsContent');
            const improvementContent = document.getElementById('improvementContent');

            if (!allResults.length) {
                strengthsContent.innerHTML = '<p class="text-gray-600">No data available</p>';
                improvementContent.innerHTML = '<p class="text-gray-600">No data available</p>';
                return;
            }

            // Calculate category performance
            const categoryStats = {};
            allResults.forEach(result => {
                const category = result.exam.category;
                if (!categoryStats[category]) {
                    categoryStats[category] = { total: 0, sum: 0, count: 0 };
                }
                categoryStats[category].sum += parseFloat(result.percentage);
                categoryStats[category].count++;
                categoryStats[category].total = categoryStats[category].sum / categoryStats[category].count;
            });

            // Find strengths (categories with >70% average)
            const strengths = Object.entries(categoryStats)
                .filter(([_, stats]) => stats.total >= 70)
                .sort((a, b) => b[1].total - a[1].total);

            // Find areas for improvement (categories with <60% average)
            const improvements = Object.entries(categoryStats)
                .filter(([_, stats]) => stats.total < 60)
                .sort((a, b) => a[1].total - b[1].total);

            // Update strengths
            if (strengths.length > 0) {
                strengthsContent.innerHTML = strengths.map(([category, stats]) => 
                    `<div class="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span class="text-green-700 font-medium">${category}</span>
                        <span class="text-green-600">${Math.round(stats.total)}%</span>
                    </div>`
                ).join('');
            } else {
                strengthsContent.innerHTML = '<p class="text-gray-600">Focus on consistent performance across all subjects</p>';
            }

            // Update improvements
            if (improvements.length > 0) {
                improvementContent.innerHTML = improvements.map(([category, stats]) => 
                    `<div class="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span class="text-red-700 font-medium">${category}</span>
                        <span class="text-red-600">${Math.round(stats.total)}%</span>
                    </div>`
                ).join('');
            } else {
                improvementContent.innerHTML = '<p class="text-gray-600">Great job! All categories show strong performance</p>';
            }
        }

        function showDashboard() {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            parentInfo.classList.remove('hidden');
            parentInfo.classList.add('flex');
        }

        function hideDashboard() {
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            parentInfo.classList.add('hidden');
            parentInfo.classList.remove('flex');
        }

        function handleLogout() {
            currentStudentData = null;
            allResults = [];
            parentLoginForm.reset();
            hideDashboard();
            hideError();
            
            if (scoresChart) {
                scoresChart.destroy();
                scoresChart = null;
            }
        }

        function refreshData() {
            if (currentStudentData) {
                loadStudentResults();
            }
        }

        function setLoginLoading(loading) {
            const loginBtn = document.getElementById('loginBtn');
            const loginBtnText = document.getElementById('loginBtnText');
            const loginSpinner = document.getElementById('loginSpinner');

            if (loading) {
                loginBtn.disabled = true;
                loginBtnText.textContent = 'Logging in...';
                loginSpinner.classList.remove('hidden');
            } else {
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Access Child\'s Results';
                loginSpinner.classList.add('hidden');
            }
        }

        function showError(message) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        }

        function hideError() {
            loginError.classList.add('hidden');
        }