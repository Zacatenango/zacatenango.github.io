class ChartManager {
    constructor() {
        this.charts = {
            interruptions: null,
            stepsInterruption: null,
            durationHistogram: null,
            compliance: null
        };
    }

    initializeCharts() {
        this.renderInterruptionsChart();
        this.renderStepsInterruptionChart();
        this.renderDurationHistogramChart();
    }

    renderInterruptionsChart(interruptions = []) {
        const ctx = document.getElementById('interruptionsChart').getContext('2d');
        const data = this.processInterruptionData(interruptions);

        if (this.charts.interruptions) {
            this.charts.interruptions.destroy();
        }

        this.charts.interruptions = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Minor',
                        data: data.minorData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Moderate',
                        data: data.moderateData,
                        backgroundColor: 'rgba(255, 206, 86, 0.5)',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Major',
                        data: data.majorData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Total Time (minutes)',
                        data: data.timeData,
                        type: 'line',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    }

    renderStepsInterruptionChart(tasks = [], interruptions = []) {
        const ctx = document.getElementById('stepsInterruptionChart').getContext('2d');
        const stepCounts = this.processStepInterruptionData(tasks, interruptions);

        if (this.charts.stepsInterruption) {
            this.charts.stepsInterruption.destroy();
        }

        this.charts.stepsInterruption = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(stepCounts),
                datasets: [{
                    label: 'Interruptions',
                    data: Object.values(stepCounts),
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Interruptions'
                        }
                    }
                }
            }
        });
    }

    renderDurationHistogramChart(interruptions = []) {
        const ctx = document.getElementById('durationHistogramChart').getContext('2d');
        const buckets = this.processDurationHistogramData(interruptions);

        if (this.charts.durationHistogram) {
            this.charts.durationHistogram.destroy();
        }

        this.charts.durationHistogram = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: buckets.labels,
                datasets: [{
                    label: 'Frequency',
                    data: buckets.data,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Interruptions'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Duration'
                        }
                    }
                }
            }
        });
    }

    renderComplianceChart(data = []) {
        const ctx = document.getElementById('complianceChart').getContext('2d');
        const chartData = this.processComplianceData(data);

        if (this.charts.compliance) {
            this.charts.compliance.destroy();
        }

        this.charts.compliance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Duration (minutes)',
                        data: chartData.durations,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Completion Rate (%)',
                        data: chartData.completionRates,
                        type: 'line',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Time to First Task (minutes)',
                        data: chartData.firstTaskTimes,
                        type: 'line',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        max: 100,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Completion Rate (%)'
                        }
                    }
                }
            }
        });
    }

    // Data processing methods
    processInterruptionData(interruptions) {
        const data = {};
        interruptions.forEach(interruption => {
            const date = new Date(interruption.timestamp).toLocaleDateString();
            if (!data[date]) {
                data[date] = { minor: 0, moderate: 0, major: 0, totalTime: 0 };
            }
            
            if (interruption.duration <= 30000) data[date].minor++;
            else if (interruption.duration <= 120000) data[date].moderate++;
            else data[date].major++;
            
            data[date].totalTime += interruption.duration / 60000;
        });

        return {
            labels: Object.keys(data),
            minorData: Object.values(data).map(d => d.minor),
            moderateData: Object.values(data).map(d => d.moderate),
            majorData: Object.values(data).map(d => d.major),
            timeData: Object.values(data).map(d => Math.round(d.totalTime))
        };
    }

    processStepInterruptionData(tasks, interruptions) {
        const stepCounts = {};
        tasks.forEach(task => {
            stepCounts[task.name] = 0;
        });

        interruptions.forEach(interruption => {
            if (interruption.currentStep) {
                stepCounts[interruption.currentStep] = (stepCounts[interruption.currentStep] || 0) + 1;
            }
        });

        return stepCounts;
    }

    processDurationHistogramData(interruptions) {
        const buckets = Array(12).fill(0);
        const labels = buckets.map((_, i) => `${i*5}-${(i+1)*5} min`);

        interruptions.forEach(interruption => {
            const durationMinutes = interruption.duration / 60000;
            const bucketIndex = Math.min(Math.floor(durationMinutes / 5), 11);
            buckets[bucketIndex]++;
        });

        return { data: buckets, labels };
    }

    processComplianceData(data) {
        return {
            labels: data.map(record => record.date),
            durations: data.map(record => record.durationMinutes),
            completionRates: data.map(record => record.completionRate),
            firstTaskTimes: data.map(record => 
                record.timeToFirstTaskMs ? Math.round(record.timeToFirstTaskMs / 60000) : null
            )
        };
    }
}

export default ChartManager;