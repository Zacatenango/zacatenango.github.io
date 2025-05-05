let chart = null;

export function updateChart(snapshot) {
    const dailyStats = {};
    
    snapshot.forEach((childSnapshot) => {
        const activity = childSnapshot.val();
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        
        if (!dailyStats[date]) {
            dailyStats[date] = { items: 0, effort: 0 };
        }
        
        dailyStats[date].items++;
        dailyStats[date].effort += activity.effort;
    });

    const dates = Object.keys(dailyStats).sort();
    const items = dates.map(date => dailyStats[date].items);
    const efforts = dates.map(date => dailyStats[date].effort);

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('statsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Number of Activities',
                    data: items,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Effort',
                    data: efforts,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}