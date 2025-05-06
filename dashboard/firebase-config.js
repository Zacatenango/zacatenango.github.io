// Your web app's Firebase configuration
const firebaseConfig = {
    // TODO: Replace with your Firebase configuration
    apiKey: "AIzaSyArRfYoAEW946F9aIsnzht3PNoqSIc9k3Q",
    authDomain: "misaplicaciones-a39bb.firebaseapp.com",
    databaseURL: "https://misaplicaciones-a39bb-default-rtdb.firebaseio.com",
    projectId: "misaplicaciones-a39bb",
    storageBucket: "misaplicaciones-a39bb.firebasestorage.app",
    messagingSenderId: "375780546756",
    appId: "1:375780546756:web:e00c3de48e1e0de769d191",
    measurementId: "G-0X2BWZM5HS"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();