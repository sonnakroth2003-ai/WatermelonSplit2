import { firebaseConfig } from './config.js';

let db = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("Firebase Realtime Database initialized successfully.");
    } else {
        console.error("SDK Firebase CDN chưa được tải ở HTML!");
    }
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { db };
