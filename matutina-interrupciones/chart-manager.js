class ChartManager {
    constructor() {
        this.complianceChart = null;
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

    renderComplianceChart(data = []) {
        const ctx = document.getElementById('complianceChart').getContext('2d');
        const chartData = this.processComplianceData(data);

        if (this.complianceChart) {
            this.complianceChart.destroy();
        }

        this.complianceChart = new Chart(ctx, {
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
}

export default ChartManager;