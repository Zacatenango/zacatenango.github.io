import { ref, push, onValue, query, orderByChild, startAt, endAt } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js";
import { db } from './firebase-config.js';

export function saveActivity(activity, effort) {
    const timestamp = new Date().getTime();
    const entry = {
        activity,
        effort,
        timestamp,
        date: new Date().toISOString().split('T')[0]
    };
    return push(ref(db, 'activities'), entry);
}

export function loadActivitiesForDate(date, callback) {
    // Create date with time set to local midnight
    const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const activitiesRef = query(
        ref(db, 'activities'),
        orderByChild('timestamp'),
        startAt(startDate.getTime()),
        endAt(endDate.getTime())
    );

    return onValue(activitiesRef, callback);
}

export function loadLastThirtyDaysStats(callback) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const statsRef = query(
        ref(db, 'activities'),
        orderByChild('timestamp'),
        startAt(thirtyDaysAgo.getTime())
    );

    return onValue(statsRef, callback);
}