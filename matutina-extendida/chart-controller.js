export class ChartController {
    constructor() {
        this.chart = null;
    }

    calculateStats(data) {
        // Sort by timestamp
        data.sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate current streak
        let currentStreak = 0;
        const msPerDay = 24 * 60 * 60 * 1000;
        
        for (let i = data.length - 1; i >= 0; i--) {
            if (i === data.length - 1) {
                const recordDate = new Date(data[i].timestamp);
                const today = new Date();
                if (today.toDateString() === recordDate.toDateString()) {
                    currentStreak = 1;
                } else {
                    const dayDiff = Math.floor((today - recordDate) / msPerDay);
                    if (dayDiff > 1) break;
                    currentStreak = 1;
                }
            } else {
                const currentDate = new Date(data[i].timestamp);
                const prevDate = new Date(data[i+1].timestamp);
                const dayDiff = Math.floor((prevDate - currentDate) / msPerDay);
                
                if (dayDiff <= 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        // Calculate averages
        let avgCompletionRate = 0;
        let avgDuration = 0;
        
        if (data.length > 0) {
            const totalCompletionRate = data.reduce((sum, record) => sum + record.completionRate, 0);
            avgCompletionRate = Math.round(totalCompletionRate / data.length);
            
            const totalDuration = data.reduce((sum, record) => sum + record.durationMinutes, 0);
            avgDuration = Math.round(totalDuration / data.length);
        }

        return {
            currentStreak,
            avgCompletionRate,
            avgDuration
        };
    }

    updateStats(data) {
        const stats = this.calculateStats(data);
        $('#currentStreak').text(stats.currentStreak);
        $('#completionRate').text(`${stats.avgCompletionRate}%`);
        $('#averageDuration').text(stats.avgDuration);
    }

    renderChart(data) {
        const labels = data.map(record => record.date);
        const durations = data.map(record => record.durationMinutes);
        const completionRates = data.map(record => record.completionRate);
        const firstTaskTimes = data.map(record => 
            record.timeToFirstTaskMs ? Math.round(record.timeToFirstTaskMs / 60000) : null
        );
        
        const ctx = document.getElementById('complianceChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Duration (minutes)',
                        data: durations,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Completion Rate (%)',
                        data: completionRates,
                        type: 'line',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Time to First Task (minutes)',
                        data: firstTaskTimes,
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