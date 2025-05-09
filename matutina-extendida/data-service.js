import { matutinaRef, historialRutinaRef, timerStateRef, interruptionsRef } from './firebase-config.js';

export class DataService {
    static async loadTasks() {
        const snapshot = await matutinaRef.once('value');
        const data = snapshot.val() || {};
        return Object.keys(data).map(key => ({
            id: key,
            name: data[key].name,
            completed: data[key].completed || false
        }));
    }

    static async addTask(taskName) {
        const newTaskRef = matutinaRef.push();
        await newTaskRef.set({
            name: taskName,
            completed: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    static async updateTaskStatus(taskId, isCompleted) {
        await matutinaRef.child(taskId).update({ completed: isCompleted });
    }

    static async deleteTask(taskId) {
        await matutinaRef.child(taskId).remove();
    }

    static async loadComplianceData() {
        const snapshot = await historialRutinaRef.orderByChild('timestamp')
            .limitToLast(30)
            .once('value');
        const data = snapshot.val() || {};
        return Object.values(data);
    }

    static async saveRoutineRecord(record) {
        await historialRutinaRef.push(record);
    }

    static async loadTimerState() {
        const snapshot = await timerStateRef.once('value');
        return snapshot.val();
    }

    static async updateTimerState(state) {
        await timerStateRef.update(state);
    }

    static async resetTimerState() {
        await timerStateRef.set({
            running: false,
            paused: false
        });
    }

    static async loadInterruptions() {
        const snapshot = await interruptionsRef.orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        const data = snapshot.val() || {};
        return Object.values(data);
    }

    static async saveInterruption(interruption) {
        const newInterruptionRef = interruptionsRef.push();
        await newInterruptionRef.set(interruption);
        return newInterruptionRef.key;
    }
}