/

Leaderboard Service using Firebase Realtime Database
*/

// Helper to sanitize player name into a safe unique Firebase key
function generatePlayerID(name) {
if (!name) return 'anonymous';
// Normalize to lower case, replace accents and special characters
const sanitized = name.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.replace(/[^a-z0-9]/g, "")
.replace(/+/g, "")
.replace(/^+|_+$/g, "");

return sanitized || 'player_' + Date.now();


}

/

Saves or updates player performance to Firebase if score is higher

@param {string} playerName

@param {number} deviation

@param {number} timeLeftSeconds

@param {function} callback returns (isTop10, record)
*/
function savePlayerScoreToFirebase(playerName, deviation, timeLeftSeconds, callback) {
if (!db) {
console.warn("Database connection unavailable.");
if (callback) callback(false, null);
return;
}

const playerID = generatePlayerID(playerName);
const score = Math.max(0, parseFloat((100 - deviation).toFixed(2))); // Higher score = better
const nowISO = new Date().toISOString();
const formattedDate = new Date().toLocaleDateString('vi-VN');

const playerRef = db.ref('leaderboard/' + playerID);

playerRef.once('value').then((snapshot) => {
const existingData = snapshot.val();
let shouldUpdate = false;

 if (!existingData) {
     shouldUpdate = true;
 } else {
     // Check if new attempt is strictly better
     // Primary condition: Higher score (lower deviation)
     if (score > existingData.score) {
         shouldUpdate = true;
     } else if (score === existingData.score) {
         // Secondary condition: Higher remaining time
         if (timeLeftSeconds > existingData.time) {
             shouldUpdate = true;
         }
     }
 }

 if (shouldUpdate) {
     const recordData = {
         playerID: playerID,
         name: playerName,
         score: score,
         deviation: parseFloat(deviation.toFixed(2)),
         time: timeLeftSeconds,
         createdAt: nowISO,
         date: formattedDate
     };

     playerRef.set(recordData).then(() => {
         checkIfRecordIsTop10(playerID, callback);
     }).catch((err) => {
         console.error("Error saving score:", err);
         if (callback) callback(false, null);
     });
 } else {
     // Existing score was better, check ranking with current database state
     checkIfRecordIsTop10(playerID, callback);
 }


}).catch((err) => {
console.error("Error fetching player record:", err);
if (callback) callback(false, null);
});
}

/

Checks whether the given playerID currently ranks in the Top 10
*/
function checkIfRecordIsTop10(playerID, callback) {
db.ref('leaderboard').once('value').then((snapshot) => {
const records = [];
snapshot.forEach((childSnap) => {
records.push(childSnap.val());
});

 // Sort Top 10: Score DESC -> Time DESC -> CreatedAt ASC
 records.sort((a, b) => {
     if (b.score !== a.score) return b.score - a.score;
     if (b.time !== a.time) return b.time - a.time;
     return new Date(a.createdAt) - new Date(b.createdAt);
 });

 const rankIndex = records.findIndex(item => item.playerID === playerID);
 const isTop10 = rankIndex !== -1 && rankIndex < GAME_CONFIG.LEADERBOARD_LIMIT;

 if (callback) callback(isTop10, records[rankIndex] || null);


});
}

/

Sets up a Realtime listener for the leaderboard node

@param {function} onDataUpdated
*/
function listenToLeaderboardRealtime(onDataUpdated) {
if (!db) return;

const leaderboardRef = db.ref('leaderboard');

leaderboardRef.on('value', (snapshot) => {
const list = [];
snapshot.forEach((childSnap) => {
list.push(childSnap.val());
});

 // Sorting rule:
 // 1. Highest score (lowest deviation)
 // 2. Highest time remaining
 // 3. Reached earlier
 list.sort((a, b) => {
     if (b.score !== a.score) return b.score - a.score;
     if (b.time !== a.time) return b.time - a.time;
     return new Date(a.createdAt) - new Date(b.createdAt);
 });

 const top10 = list.slice(0, GAME_CONFIG.LEADERBOARD_LIMIT);
 if (onDataUpdated) onDataUpdated(top10);


}, (error) => {
console.error("Realtime listener error:", error);
});
}