import { saveActivity, loadActivitiesForDate, loadLastThirtyDaysStats } from './data-service.js';
import { updateActivitiesTable, clearInputs, getInputValues, validateInput, setDateToToday } from './ui-controller.js';
import { updateChart } from './chart-controller.js';

// Initialize the date selector to today
const today = setDateToToday();

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadActivitiesForDate(today, (snapshot) => {
        const activities = [];
        snapshot.forEach((childSnapshot) => {
            activities.push(childSnapshot.val());
        });
        updateActivitiesTable(activities);
    });

    // Update chart with initial data
    loadLastThirtyDaysStats(updateChart);
});

// Event Handlers
$('#submitBtn').on('click', async () => {
    const { activity, effort } = getInputValues();
    
    if (validateInput(activity, effort)) {
        try {
            await saveActivity(activity, effort);
            clearInputs();
            // Reload activities for the current date
            const currentDate = $('#dateSelector').val();
            loadActivitiesForDate(currentDate, (snapshot) => {
                const activities = [];
                snapshot.forEach((childSnapshot) => {
                    activities.push(childSnapshot.val());
                });
                updateActivitiesTable(activities);
            });
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Failed to save activity. Please try again.');
        }
    }
});

$('#dateSelector').on('change', function() {
    const selectedDate = $(this).val();
    loadActivitiesForDate(selectedDate, (snapshot) => {
        const activities = [];
        snapshot.forEach((childSnapshot) => {
            activities.push(childSnapshot.val());
        });
        updateActivitiesTable(activities);
    });
});