export function updateActivitiesTable(activities) {
    let totalEffort = 0;
    $('#activitiesTable').empty();

    activities.forEach(activity => {
        totalEffort += activity.effort;
        const time = new Date(activity.timestamp).toLocaleTimeString();
        $('#activitiesTable').append(`
            <tr>
                <td>${time}</td>
                <td>${activity.activity}</td>
                <td><span class="effort-badge">${activity.effort}</span></td>
            </tr>
        `);
    });

    $('#totalEffort').text(totalEffort);
}

export function clearInputs() {
    $('#activityInput').val('');
    $('#effortInput').val('');
}

export function getInputValues() {
    return {
        activity: $('#activityInput').val().trim(),
        effort: parseInt($('#effortInput').val())
    };
}

export function validateInput(activity, effort) {
    if (!activity || isNaN(effort) || effort < 1 || effort > 5) {
        alert('Please enter a valid activity and effort level (1-5)');
        return false;
    }
    return true;
}

export function setDateToToday() {
    const today = new Date().toISOString().split('T')[0];
    $('#dateSelector').val(today);
    return today;
}