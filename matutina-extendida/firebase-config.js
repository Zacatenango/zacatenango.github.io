// Firebase configuration
const firebaseConfig = {
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
firebase.initializeApp(firebaseConfig);

// Export database reference
export const database = firebase.database();

// Create and export common database references
export const historialRutinaRef = database.ref('historial_rutina');
export const matutinaRef = database.ref('matutina');
export const timerStateRef = database.ref('timer_state');
export const interruptionsRef = database.ref('interruptions');