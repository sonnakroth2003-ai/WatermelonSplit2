// Initialize Firebase Application
let db = null;

try {
if (!firebase.apps.length) {
firebase.initializeApp(firebaseConfig);
}
db = firebase.database();
console.log("Firebase Realtime Database initialized successfully.");
} catch (error) {
console.error("Firebase Initialization Error:", error);
}