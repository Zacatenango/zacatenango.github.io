import { saveActivity, loadActivitiesForDate, loadLastThirtyDaysStats } from './data-service.js';
import { updateActivitiesTable, clearInputs, getInputValues, validateInput, setDateToToday } from './ui-controller.js';
import { updateChart } from './chart-controller.js';

// Initialize the date selector to today
const today = setDateToToday();

// Load initial data
loadActivitiesForDate(today, (snapshot) => {
    const activities = [];
    snapshot.forEach((childSnapshot) => {
        activities.push(childSnapshot.val());
    });
    updateActivitiesTable(activities);
});

// Update chart with initial data
loadLastThirtyDaysStats(updateChart);

// Event Handlers
$('#submitBtn').click(() => {
    const { activity, effort } = getInputValues();
    
    if (validateInput(activity, effort)) {
        saveActivity(activity, effort);
        clearInputs();
    }
});

$('#dateSelector').change(function() {
    const selectedDate = $(this).val();
    loadActivitiesForDate(selectedDate, (snapshot) => {
        const activities = [];
        snapshot.forEach((childSnapshot) => {
            activities.push(childSnapshot.val());
        });
        updateActivitiesTable(activities);
    });
});