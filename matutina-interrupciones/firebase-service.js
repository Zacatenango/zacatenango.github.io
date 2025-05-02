import { DB_REFS } from './firebase-config.js';

class FirebaseService {
    constructor(database) {
        this.database = database;
        this.refs = {
            tasks: database.ref(DB_REFS.tasks),
            history: database.ref(DB_REFS.history),
            timerState: database.ref(DB_REFS.timerState),
            interruptions: database.ref(DB_REFS.interruptions)
        };
    }

    // Tasks
    async loadTasks() {
        const snapshot = await this.refs.tasks.once('value');
        return this.transformTasks(snapshot.val() || {});
    }

    transformTasks(data) {
        return Object.keys(data).map(key => ({
            id: key,
            name: data[key].name,
            completed: data[key].completed || false
        }));
    }

    async addTask(taskName) {
        const newTaskRef = this.refs.tasks.push();
        await newTaskRef.set({
            name: taskName,
            completed: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        return newTaskRef.key;
    }

    async deleteTask(taskId) {
        return this.refs.tasks.child(taskId).remove();
    }

    async updateTaskStatus(taskId, isCompleted) {
        return this.refs.tasks.child(taskId).update({ completed: isCompleted });
    }

    // Timer State
    async saveTimerState(state) {
        return this.refs.timerState.set(state);
    }

    async loadTimerState() {
        const snapshot = await this.refs.timerState.once('value');
        return snapshot.val();
    }

    // Interruptions
    async loadInterruptions(limit = 50) {
        const snapshot = await this.refs.interruptions
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');
        
        const interruptions = [];
        snapshot.forEach(childSnapshot => {
            interruptions.unshift({ ...childSnapshot.val() });
        });
        return interruptions;
    }

    async saveInterruption(interruption) {
        return this.refs.interruptions.push(interruption);
    }

    // History
    async saveRoutineRecord(record) {
        return this.refs.history.push(record);
    }

    async loadRoutineHistory(limit = 30) {
        const snapshot = await this.refs.history
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');
        return Object.values(snapshot.val() || {});
    }

    // Real-time listeners
    onTasksChange(callback) {
        this.refs.tasks.on('value', snapshot => {
            callback(this.transformTasks(snapshot.val() || {}));
        });
    }

    onTimerStateChange(callback) {
        this.refs.timerState.on('value', snapshot => {
            callback(snapshot.val());
        });
    }

    // Connection monitoring
    onConnectionChange(callback) {
        this.database.ref('.info/connected').on('value', callback);
    }
}

export default FirebaseService;