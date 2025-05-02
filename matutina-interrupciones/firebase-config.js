const config = {
    apiKey: "AIzaSyArRfYoAEW946F9aIsnzht3PNoqSIc9k3Q",
    authDomain: "misaplicaciones-a39bb.firebaseapp.com",
    databaseURL: "https://misaplicaciones-a39bb-default-rtdb.firebaseio.com",
    projectId: "misaplicaciones-a39bb",
    storageBucket: "misaplicaciones-a39bb.firebasestorage.app",
    messagingSenderId: "375780546756",
    appId: "1:375780546756:web:c87ad2c8f5c7e71869d191",
    measurementId: "G-NSZ17K1N89"
};

// Initialize Firebase
function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(config);
    }
    return firebase.database();
}

// Database reference paths
const ROOT_PATH = 'matutina_interrupciones';
const DB_REFS = {
    tasks: `${ROOT_PATH}/tasks`,
    history: `${ROOT_PATH}/history`,
    timerState: `${ROOT_PATH}/timer_state`,
    interruptions: `${ROOT_PATH}/interruptions`
};

export { initializeFirebase, DB_REFS };