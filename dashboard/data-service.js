class DataService {
    constructor() {
        this.db = firebase.database();
    }

    // Generic data saving method
    async saveData(path, data) {
        try {
            await this.db.ref(path).set(data);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Generic data loading method
    async loadData(path) {
        try {
            const snapshot = await this.db.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    // Listen for real-time updates
    subscribeToData(path, callback) {
        this.db.ref(path).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    // Stop listening to updates
    unsubscribeFromData(path) {
        this.db.ref(path).off();
    }
}

// Create global instance
const dataService = new DataService();