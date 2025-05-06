class ChartController {
    constructor() {
        this.charts = new Map();
    }

    // Initialize a new chart
    createChart(containerId, type, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        // Create canvas element
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const chartConfig = {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        };

        // Store chart instance
        const chart = new Chart(ctx, chartConfig);
        this.charts.set(containerId, chart);
        return chart;
    }

    // Update existing chart
    updateChart(containerId, newData) {
        const chart = this.charts.get(containerId);
        if (!chart) {
            console.error(`Chart ${containerId} not found`);
            return;
        }

        chart.data = newData;
        chart.update();
    }

    // Remove chart
    destroyChart(containerId) {
        const chart = this.charts.get(containerId);
        if (chart) {
            chart.destroy();
            this.charts.delete(containerId);
        }
    }
}

// Create global instance
const chartController = new ChartController();