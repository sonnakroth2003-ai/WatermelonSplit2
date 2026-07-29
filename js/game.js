/

Main Game State and 3D Watermelon Slicing Engine
*/

const GAME_STATE = {
musicEnabled: false,
soundEnabled: true,
playerName: '',
timeLeft: GAME_CONFIG.DEFAULT_TIME_LIMIT,
timerInterval: null,
currentWatermelonRadius: GAME_CONFIG.WATERMELON_RADIUS,
isGameActive: false,
leaderboard: [],
planeOffset: 0.0
};

// UI Element References
const screenIntro = document.getElementById('screen-intro');
const screenSlicing = document.getElementById('screen-slicing');
const screenResult = document.getElementById('screen-result');
const canvasContainer = document.getElementById('canvas-container');
const canvasTimer = document.getElementById('canvas-timer');
const timeLeftDisplay = document.getElementById('time-left');

// Control Inputs
const sliderYaw = document.getElementById('slider-yaw');
const sliderPitch = document.getElementById('slider-pitch');
const sliderOffset = document.getElementById('slider-offset');

const yawVal = document.getElementById('yaw-val');
const pitchVal = document.getElementById('pitch-val');
const offsetVal = document.getElementById('offset-val');
const realtimeRatio = document.getElementById('realtime-ratio');

// Three.js Scene Variables
let scene, camera, renderer, controls;
let melonGroup, intactMelon, leftHalfGroup, rightHalfGroup;
let helperRingMesh, helperPlaneDisc, knifeMesh;
const R = GAME_STATE.currentWatermelonRadius;

let rindMaterial, internalFleshMaterial;

// Procedural Rind Texture Generator
function generateRindTexture() {
const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 512;
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#1e3f20';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = '#3a7d3e';
ctx.lineWidth = 16;
for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= canvas.height; y += 15) {
        const wave = Math.sin(y / 12) * 15 + Math.cos(x / 4) * 6;
        ctx.lineTo(x + wave, y);
    }
    ctx.stroke();
}

for (let i = 0; i < 25000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
}

const texture = new THREE.CanvasTexture(canvas);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
return texture;


}

// Procedural Flesh Texture Generator
function generateFleshTexture() {
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');
const cx = 256, cy = 256;

ctx.fillStyle = '#f43f5e';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = '#fef08a';
ctx.lineWidth = 14;
ctx.beginPath();
ctx.arc(cx, cy, 238, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle = '#1b4332';
ctx.lineWidth = 10;
ctx.beginPath();
ctx.arc(cx, cy, 248, 0, Math.PI * 2);
ctx.stroke();

for (let i = 0; i < 2000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 220;
    const rx = cx + Math.cos(angle) * dist;
    const ry = cy + Math.sin(angle) * dist;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(251,113,133,0.18)' : 'rgba(244,63,94,0.35)';
    ctx.fillRect(rx, ry, 3, 3);
}

const seedCount = 20;
for (let i = 0; i < seedCount; i++) {
    const angle = (i / seedCount) * Math.PI * 2 + (Math.random() * 0.12);
    const dist = 100 + Math.random() * 80;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle + Math.PI / 2);
    
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(4, 0, 3, 6, 0, 6);
    ctx.bezierCurveTo(-3, 6, -4, 0, 0, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

return new THREE.CanvasTexture(canvas);


}

function init3D() {
scene = new THREE.Scene();
scene.background = null;

camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
camera.position.set(0, 1.5, 6);

renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

canvasContainer.appendChild(renderer.domElement);

controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 12;
controls.minDistance = 2.5;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(5, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xfff0e0, 0.4, 15);
pointLight.position.set(-4, -2, -3);
scene.add(pointLight);

rindMaterial = new THREE.MeshStandardMaterial({
    map: generateRindTexture(),
    roughness: 0.15,
    metalness: 0.05,
    side: THREE.FrontSide
});

internalFleshMaterial = new THREE.MeshStandardMaterial({
    map: generateFleshTexture(),
    roughness: 0.7,
    metalness: 0.0
});

buildWatermelon();
buildHelperPlane();
buildKnife();

window.addEventListener('resize', onWindowResize);
animate();


}

function buildWatermelon() {
if (melonGroup) scene.remove(melonGroup);
melonGroup = new THREE.Group();
scene.add(melonGroup);

const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
intactMelon = new THREE.Mesh(sphereGeo, rindMaterial);
intactMelon.castShadow = true;
intactMelon.receiveShadow = true;
melonGroup.add(intactMelon);

leftHalfGroup = new THREE.Group();
rightHalfGroup = new THREE.Group();
melonGroup.add(leftHalfGroup);
melonGroup.add(rightHalfGroup);

leftHalfGroup.visible = false;
rightHalfGroup.visible = false;


}

function buildHelperPlane() {
const ringGeo = new THREE.RingGeometry(R + 0.1, R + 0.22, 64);
const ringMat = new THREE.MeshBasicMaterial({
color: 0xfacc15,
side: THREE.DoubleSide
});
helperRingMesh = new THREE.Mesh(ringGeo, ringMat);
scene.add(helperRingMesh);

const discGeo = new THREE.CircleGeometry((R * 1.8) + 0.1, 64);
const discMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide
});
helperPlaneDisc = new THREE.Mesh(discGeo, discMat);
scene.add(helperPlaneDisc);


}

function buildKnife() {
knifeMesh = new THREE.Group();

const bladeGeo = new THREE.BoxGeometry(0.04, 0.4, 2.5);
const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.95,
    roughness: 0.1
});
const blade = new THREE.Mesh(bladeGeo, bladeMat);
blade.position.y = 0.2;
knifeMesh.add(blade);

const handleGeo = new THREE.BoxGeometry(0.06, 0.08, 0.8);
const handleMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.5
});
const handle = new THREE.Mesh(handleGeo, handleMat);
handle.position.set(0, 0.2, -1.65);
knifeMesh.add(handle);

knifeMesh.visible = false;
scene.add(knifeMesh);


}

function onWindowResize() {
camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
camera.updateProjectionMatrix();
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

const clip1 = new THREE.Plane();
const clip2 = new THREE.Plane();
let normalVec = new THREE.Vector3(0, 1, 0);

function updateSlicingPlane() {
if (!GAME_STATE.isGameActive || leftHalfGroup.visible) return;

const yawRad = THREE.MathUtils.degToRad(parseFloat(sliderYaw.value));
const pitchRad = THREE.MathUtils.degToRad(parseFloat(sliderPitch.value));
GAME_STATE.planeOffset = parseFloat(sliderOffset.value);

normalVec.set(0, 1, 0);
const euler = new THREE.Euler(pitchRad, yawRad, 0, 'YXZ');
normalVec.applyEuler(euler).normalize();

const d = GAME_STATE.planeOffset;
const r = Math.sqrt(Math.max(0, R * R - d * d));

const planePos = normalVec.clone().multiplyScalar(d);

helperRingMesh.position.copy(planePos);
helperRingMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec);

const scaleFactor = r / R;
helperRingMesh.scale.set(scaleFactor, scaleFactor, 1);

helperPlaneDisc.position.copy(planePos);
helperPlaneDisc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec);

yawVal.textContent = `${sliderYaw.value}°`;
pitchVal.textContent = `${sliderPitch.value}°`;
offsetVal.textContent = d.toFixed(2);

const expected = calculateRealVolumes();
realtimeRatio.textContent = `${expected.volAPct.toFixed(0)}% : ${expected.volBPct.toFixed(0)}%`;


}

function performMeshSlicing() {
while (leftHalfGroup.children.length > 0) { leftHalfGroup.remove(leftHalfGroup.children[0]); }
while (rightHalfGroup.children.length > 0) { rightHalfGroup.remove(rightHalfGroup.children[0]); }

const negatedNormal = normalVec.clone().negate();
const d = GAME_STATE.planeOffset;

clip1.set(normalVec, -d);
clip2.set(negatedNormal, d);

const leftRindMat = rindMaterial.clone();
leftRindMat.clippingPlanes = [clip1];
leftRindMat.clipShadows = true;
leftRindMat.needsUpdate = true;

const rightRindMat = rindMaterial.clone();
rightRindMat.clippingPlanes = [clip2];
rightRindMat.clipShadows = true;
rightRindMat.needsUpdate = true;

const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
const leftOuter = new THREE.Mesh(sphereGeo, leftRindMat);
const rightOuter = new THREE.Mesh(sphereGeo, rightRindMat);

leftOuter.castShadow = true;
leftOuter.receiveShadow = true;
rightOuter.castShadow = true;
rightOuter.receiveShadow = true;

leftHalfGroup.add(leftOuter);
rightHalfGroup.add(rightOuter);

const sliceRadius = Math.sqrt(Math.max(0, R * R - d * d));
const capGeo = new THREE.CircleGeometry(sliceRadius, 64);

const capLeft = new THREE.Mesh(capGeo, internalFleshMaterial);
capLeft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), negatedNormal);
capLeft.position.copy(normalVec).multiplyScalar(d);
leftHalfGroup.add(capLeft);

const capRight = new THREE.Mesh(capGeo, internalFleshMaterial);
capRight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec);
capRight.position.copy(normalVec).multiplyScalar(d);
rightHalfGroup.add(capRight);


}

function updateDynamicClippingPlanes() {
if (leftHalfGroup && leftHalfGroup.visible) {
const worldNormalA = normalVec.clone().applyQuaternion(leftHalfGroup.quaternion).normalize();
const q1 = leftHalfGroup.position.clone().add(normalVec.clone().multiplyScalar(GAME_STATE.planeOffset).applyQuaternion(leftHalfGroup.quaternion));
clip1.normal.copy(worldNormalA);
clip1.constant = -q1.dot(worldNormalA);

    const negatedNormal = normalVec.clone().negate();
    const worldNormalB = negatedNormal.clone().applyQuaternion(rightHalfGroup.quaternion).normalize();
    const q2 = rightHalfGroup.position.clone().add(normalVec.clone().multiplyScalar(GAME_STATE.planeOffset).applyQuaternion(rightHalfGroup.quaternion));
    clip2.normal.copy(worldNormalB);
    clip2.constant = -q2.dot(worldNormalB);
}


}

function calculateRealVolumes() {
const d = GAME_STATE.planeOffset;

const h1 = Math.max(0, R - d);
const h2 = Math.max(0, R + d);

const v1 = (1/3) * Math.PI * Math.pow(h1, 2) * (3 * R - h1);
const v2 = (1/3) * Math.PI * Math.pow(h2, 2) * (3 * R - h2);
const vTotal = v1 + v2;

const pct1 = (v1 / vTotal) * 100;
const pct2 = (v2 / vTotal) * 100;

const realPctA = Math.max(pct1, pct2);
const realPctB = Math.min(pct1, pct2);
const diff = realPctA - realPctB;

return {
    volAPct: realPctA,
    volBPct: realPctB,
    deviation: diff
};


}

let cutProgress = 0;
let isAnimatingCut = false;
let finalStats = null;
let animationPhase = 'inactive';

let startLeftPos = new THREE.Vector3();
let startRightPos = new THREE.Vector3();
let startLeftRot = new THREE.Quaternion();
let startRightRot = new THREE.Quaternion();
let startCamPos = new THREE.Vector3();
let startCamTarget = new THREE.Vector3();

function animate() {
requestAnimationFrame(animate);

if (controls) controls.update();

if (!isAnimatingCut && !leftHalfGroup.visible && intactMelon) {
    intactMelon.rotation.y += 0.003;
    intactMelon.rotation.x += 0.001;
}

if (isAnimatingCut) {
    if (animationPhase === 'slicing') {
        cutProgress += 0.04;
        if (cutProgress < 1.0) {
            knifeMesh.visible = true;
            
            const offsetCenter = normalVec.clone().multiplyScalar(GAME_STATE.planeOffset);
            const startPos = offsetCenter.clone().add(new THREE.Vector3(0, 0, -3.5));
            const endPos = offsetCenter.clone().add(new THREE.Vector3(0, 0, 3.5));
            
            knifeMesh.position.lerpVectors(startPos, endPos, cutProgress);
        } else {
            knifeMesh.visible = false;
            intactMelon.visible = false;
            
            leftHalfGroup.visible = true;
            rightHalfGroup.visible = true;
            
            leftHalfGroup.position.set(0, 0, 0);
            leftHalfGroup.quaternion.set(0, 0, 0, 1);
            rightHalfGroup.position.set(0, 0, 0);
            rightHalfGroup.quaternion.set(0, 0, 0, 1);

            camera.position.x += (Math.random() - 0.5) * 0.12;
            camera.position.y += (Math.random() - 0.5) * 0.12;

            animationPhase = 'separating';
            cutProgress = 0;
        }
    } else if (animationPhase === 'separating') {
        cutProgress += 0.04;
        
        const targetSeparation = R * 0.55; 
        const currentSeparation = THREE.MathUtils.lerp(0, targetSeparation, Math.min(cutProgress, 1.0));

        leftHalfGroup.position.copy(normalVec.clone().multiplyScalar(currentSeparation));
        rightHalfGroup.position.copy(normalVec.clone().multiplyScalar(-currentSeparation));

        leftHalfGroup.updateMatrixWorld(true);
        rightHalfGroup.updateMatrixWorld(true);
        updateDynamicClippingPlanes();

        if (cutProgress >= 1.0) {
            let safetyLoop = 0;
            let offsetPush = 0;
            while (safetyLoop < 50) {
                const boxA = new THREE.Box3().setFromObject(leftHalfGroup);
                const boxB = new THREE.Box3().setFromObject(rightHalfGroup);
                if (!boxA.intersectsBox(boxB)) {
                    break;
                }
                offsetPush += 0.05;
                const separationWithExtra = targetSeparation + offsetPush;
                leftHalfGroup.position.copy(normalVec.clone().multiplyScalar(separationWithExtra));
                rightHalfGroup.position.copy(normalVec.clone().multiplyScalar(-separationWithExtra));
                leftHalfGroup.updateMatrixWorld(true);
                rightHalfGroup.updateMatrixWorld(true);
                updateDynamicClippingPlanes();
                safetyLoop++;
            }

            startLeftPos.copy(leftHalfGroup.position);
            startRightPos.copy(rightHalfGroup.position);
            startLeftRot.copy(leftHalfGroup.quaternion);
            startRightRot.copy(rightHalfGroup.quaternion);
            
            startCamPos.copy(camera.position);
            startCamTarget.copy(controls.target);

            animationPhase = 'camera_rotating';
            cutProgress = 0;
        }
    } else if (animationPhase === 'camera_rotating') {
        cutProgress += 0.025;
        const t = Math.min(cutProgress, 1.0);
        const easeT = 1 - Math.pow(1 - t, 3);

        const targetCamPosition = new THREE.Vector3(0, 0, 7.0);
        camera.position.lerpVectors(startCamPos, targetCamPosition, easeT);
        
        const targetTarget = new THREE.Vector3(0, 0, 0);
        controls.target.lerpVectors(startCamTarget, targetTarget, easeT);

        const presentationSeparation = 2.4; 
        const targetLeftPos = new THREE.Vector3(-presentationSeparation, 0, 0);
        const targetRightPos = new THREE.Vector3(presentationSeparation, 0, 0);
        leftHalfGroup.position.lerpVectors(startLeftPos, targetLeftPos, easeT);
        rightHalfGroup.position.lerpVectors(startRightPos, targetRightPos, easeT);

        const targetRotA = new THREE.Quaternion().setFromUnitVectors(normalVec.clone().negate(), new THREE.Vector3(0, 0, 1));
        const targetRotB = new THREE.Quaternion().setFromUnitVectors(normalVec, new THREE.Vector3(0, 0, 1));

        leftHalfGroup.quaternion.slerpQuaternions(startLeftRot, targetRotA, easeT);
        rightHalfGroup.quaternion.slerpQuaternions(startRightRot, targetRotB, easeT);

        updateDynamicClippingPlanes();

        if (t >= 1.0) {
            isAnimatingCut = false;
            animationPhase = 'done';
            showResults();
        }
    }
}

renderer.render(scene, camera);


}

function triggerCut() {
if (isAnimatingCut || leftHalfGroup.visible) return;

clearInterval(GAME_STATE.timerInterval);
controls.enabled = false;
document.getElementById('drag-helper').classList.add('opacity-0');
helperRingMesh.visible = false;
helperPlaneDisc.visible = false;

finalStats = calculateRealVolumes();
performMeshSlicing();

const offsetCenter = normalVec.clone().multiplyScalar(GAME_STATE.planeOffset);
const startPos = offsetCenter.clone().add(new THREE.Vector3(0, 0, -3.5));
knifeMesh.position.copy(startPos);
knifeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVec);

playCutSound(GAME_STATE.soundEnabled);
isAnimatingCut = true;
animationPhase = 'slicing';
cutProgress = 0;


}

function showResults() {
controls.enabled = true;

document.getElementById('vol-a-pct').textContent = `${finalStats.volAPct.toFixed(2)}%`;
document.getElementById('vol-b-pct').textContent = `${finalStats.volBPct.toFixed(2)}%`;
document.getElementById('deviation-val').textContent = `${finalStats.deviation.toFixed(2)}%`;

const starsContainer = document.getElementById('rating-stars');
const ratingText = document.getElementById('rating-text');
starsContainer.innerHTML = '';

let stars = 0;
let feedback = "";
let colorClass = "text-rose-400";

if (finalStats.deviation === 0) {
    stars = 5;
    feedback = "HOÀN HẢO TUYỆT ĐỐI! 🦅";
    colorClass = "text-emerald-400";
} else if (finalStats.deviation < 1.0) {
    stars = 5;
    feedback = "Xuất Sắc! 🌟";
    colorClass = "text-emerald-400";
} else if (finalStats.deviation < 3.0) {
    stars = 4;
    feedback = "Rất Tốt! ✨";
    colorClass = "text-teal-400";
} else if (finalStats.deviation < 5.0) {
    stars = 3;
    feedback = "Tốt!";
    colorClass = "text-amber-400";
} else if (finalStats.deviation < 10.0) {
    stars = 2;
    feedback = "Khá!";
    colorClass = "text-orange-400";
} else if (finalStats.deviation < 20.0) {
    stars = 1;
    feedback = "Trung Bình!";
    colorClass = "text-rose-400";
} else {
    stars = 0;
    feedback = "Cần Luyện Tập Thêm! 🍉";
    colorClass = "text-rose-500";
}

for (let i = 0; i < 5; i++) {
    const star = document.createElement('i');
    star.className = i < stars ? "fa-solid fa-star" : "fa-regular fa-star text-slate-600";
    starsContainer.appendChild(star);
}
ratingText.textContent = feedback;
ratingText.className = `text-lg font-black mt-1 ${colorClass}`;

if (finalStats.deviation < 1.0) {
    fireConfetti();
    playChimeSound(GAME_STATE.soundEnabled, true);
} else {
    playChimeSound(GAME_STATE.soundEnabled, false);
}

// Save performance to Firebase Realtime Database
savePerformanceToFirebase();

screenSlicing.classList.add('hidden');
screenResult.classList.remove('hidden');


}

function savePerformanceToFirebase() {
const banner = document.getElementById('top10-status-banner');
banner.className = "mt-3 p-3 rounded-xl border border-slate-700/60 bg-slate-900/40 text-slate-400 flex items-center justify-center gap-2 text-center text-xs font-bold";
banner.innerHTML = <span>⏳ Đang đồng bộ kết quả lên Firebase Online...</span>;

savePlayerScoreToFirebase(
    GAME_STATE.playerName,
    finalStats.deviation,
    GAME_STATE.timeLeft,
    (isTop10, playerRecord) => {
        if (isTop10) {
            banner.className = "mt-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center gap-2 text-center text-xs font-bold";
            banner.innerHTML = `<span>🎉 Bạn đã xuất sắc lọt vào Top 10 Bảng Vàng Online!</span>`;
        } else {
            banner.className = "mt-3 p-3 rounded-xl border border-slate-700/60 bg-slate-900/40 text-slate-400 flex items-center justify-center gap-2 text-center text-xs font-bold";
            banner.innerHTML = `<span>Bạn chưa lọt vào Top 10 lần này. Hãy cố gắng hơn nhé!</span>`;
        }
    }
);


}

function updateLeaderboardUI(top10List) {
GAME_STATE.leaderboard = top10List || [];
const tableBody = document.getElementById('leaderboard-rows');
if (!tableBody) return;

if (!GAME_STATE.leaderboard || GAME_STATE.leaderboard.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Chưa có kỷ lục nào được lập. Hãy là người đầu tiên!</td></tr>`;
    return;
}

tableBody.innerHTML = GAME_STATE.leaderboard.map((item, idx) => {
    let medal = `${idx + 1}`;
    if (idx === 0) medal = '🥇';
    else if (idx === 1) medal = '🥈';
    else if (idx === 2) medal = '🥉';

    const min = Math.floor(item.time / 60).toString().padStart(2, '0');
    const sec = (item.time % 60).toString().padStart(2, '0');
    const timeStr = `${min}:${sec}`;

    const isCurrent = (finalStats && item.name === GAME_STATE.playerName && Math.abs(item.deviation - finalStats.deviation) < 0.001);

    return `
        <tr class="border-b border-slate-700/40 hover:bg-slate-700/10 ${isCurrent ? 'bg-emerald-500/10 font-bold' : ''}">
            <td class="p-3 font-black text-slate-300">${medal}</td>
            <td class="p-3 text-white truncate max-w-[150px]">${item.name}</td>
            <td class="p-3 text-center font-extrabold text-emerald-400">${item.score} <span class="text-[10px] text-slate-400">(${item.deviation}%)</span></td>
            <td class="p-3 text-center text-rose-400 font-mono">${timeStr}</td>
            <td class="p-3 text-right text-slate-400 text-[10px]">${item.date || ''}</td>
        </tr>
    `;
}).join('');


}

function startTimer() {
clearInterval(GAME_STATE.timerInterval);
GAME_STATE.timeLeft = GAME_CONFIG.DEFAULT_TIME_LIMIT;
canvasTimer.classList.remove('hidden');

const tick = () => {
    GAME_STATE.timeLeft--;
    const min = Math.floor(GAME_STATE.timeLeft / 60).toString().padStart(2, '0');
    const sec = (GAME_STATE.timeLeft % 60).toString().padStart(2, '0');
    timeLeftDisplay.textContent = `${min}:${sec}`;

    if (GAME_STATE.timeLeft <= 0) {
        clearInterval(GAME_STATE.timerInterval);
        triggerTimeout();
    }
};

timeLeftDisplay.textContent = "02:00";
GAME_STATE.timerInterval = setInterval(tick, 1000);


}

function triggerTimeout() {
GAME_STATE.isGameActive = false;
toggleModal('modal-timeout', true);
}

function resetGame() {
controls.enabled = true;
document.getElementById('drag-helper').classList.remove('opacity-0');
helperRingMesh.visible = true;
helperPlaneDisc.visible = true;

intactMelon.visible = true;
leftHalfGroup.visible = false;
rightHalfGroup.visible = false;

leftHalfGroup.position.set(0, 0, 0);
leftHalfGroup.quaternion.set(0, 0, 0, 1);
rightHalfGroup.position.set(0, 0, 0);
rightHalfGroup.quaternion.set(0, 0, 0, 1);

sliderYaw.value = Math.floor(Math.random() * 180);
sliderPitch.value = Math.floor(Math.random() * 120 - 60);
sliderOffset.value = 0.0;

updateSlicingPlane();

camera.position.set(0, 1.5, 6);
controls.target.set(0, 0, 0);

startTimer();

screenResult.classList.add('hidden');
screenSlicing.classList.remove('hidden');


}

// Window Initialization Handlers
window.onload = function() {
init3D();

// Start listening to Firebase Realtime updates for Top 10
listenToLeaderboardRealtime((top10List) => {
    updateLeaderboardUI(top10List);
});

sliderYaw.addEventListener('input', updateSlicingPlane);
sliderPitch.addEventListener('input', updateSlicingPlane);
sliderOffset.addEventListener('input', updateSlicingPlane);

document.getElementById('btn-start-cutting').addEventListener('click', () => {
    const nameInput = document.getElementById('input-player-name');
    const errMsg = document.getElementById('name-error-msg');
    const name = nameInput.value.trim();

    if (!name) {
        errMsg.classList.remove('hidden');
        return;
    }

    errMsg.classList.add('hidden');
    GAME_STATE.playerName = name;
    GAME_STATE.isGameActive = true;

    screenIntro.classList.add('hidden');
    screenSlicing.classList.remove('hidden');

    startAmbientMusic(GAME_STATE.musicEnabled);
    resetGame();
});

document.getElementById('btn-cut-now').addEventListener('click', triggerCut);
document.getElementById('btn-play-again').addEventListener('click', resetGame);
document.getElementById('btn-timeout-retry').addEventListener('click', () => {
    toggleModal('modal-timeout', false);
    resetGame();
});

document.getElementById('btn-help').addEventListener('click', () => toggleModal('modal-help', true));
document.getElementById('btn-stats').addEventListener('click', () => toggleModal('modal-stats', true));

document.getElementById('btn-music').addEventListener('click', () => {
    GAME_STATE.musicEnabled = !GAME_STATE.musicEnabled;
    initAudio();
    if (ambientSource) {
        ambientSource.gainNode.gain.setValueAtTime(GAME_STATE.musicEnabled ? 0.05 : 0, audioCtx.currentTime);
    } else if (GAME_STATE.musicEnabled) {
        startAmbientMusic(GAME_STATE.musicEnabled);
    }
    const icon = document.getElementById('music-icon');
    icon.className = GAME_STATE.musicEnabled ? "fa-solid fa-music text-emerald-400" : "fa-solid fa-music text-slate-300";
});

document.getElementById('btn-sound').addEventListener('click', () => {
    GAME_STATE.soundEnabled = !GAME_STATE.soundEnabled;
    const icon = document.getElementById('sound-icon');
    icon.className = GAME_STATE.soundEnabled ? "fa-solid fa-volume-high text-emerald-400" : "fa-solid fa-volume-xmark text-slate-400";
});

updateSlicingPlane();


};
