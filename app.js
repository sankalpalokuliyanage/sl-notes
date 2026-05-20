import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5kkpYbcKmRvJ48YirGRUJIXtnv6OA0Lo",
  authDomain: "pawfect-4734f.firebaseapp.com",
  projectId: "pawfect-4734f",
  storageBucket: "pawfect-4734f.firebasestorage.app",
  messagingSenderId: "154938792881",
  appId: "1:154938792881:web:5d160addadce0913ff7b90"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// DOM Elements
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const homePage = document.getElementById('homePage');
const drawingPage = document.getElementById('drawingPage');
const userEmailBadge = document.getElementById('userEmailBadge');

// --- Auth Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailBadge.innerText = user.email;
        loginPage.style.display = 'none';
        appContainer.style.display = 'flex';
        loadNotes();
    } else {
        currentUser = null;
        loginPage.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

document.getElementById('btnLoginGoogle').onclick = () => signInWithPopup(auth, provider);
document.getElementById('btnLogout').onclick = () => signOut(auth);

// --- Theme Logic (Dark / Light) ---
const btnThemeToggle = document.getElementById('btnThemeToggle');
let isDarkMode = localStorage.getItem('theme') === 'dark';
document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
btnThemeToggle.innerText = isDarkMode ? '☀️' : '🌙';

btnThemeToggle.onclick = () => {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    btnThemeToggle.innerText = isDarkMode ? '☀️' : '🌙';
};

// --- Folders Logic ---
let folders = JSON.parse(localStorage.getItem('notebook_folders')) || ['All', 'Work', 'Personal'];
let currentFolder = 'All';

function renderFolders() {
    const list = document.getElementById('folderList');
    list.innerHTML = '';
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = `folder-item mb-1 ${folder === currentFolder ? 'active' : ''}`;
        div.innerText = folder === 'All' ? '📂 All Notes' : `📁 ${folder}`;
        div.onclick = () => { currentFolder = folder; renderFolders(); loadNotes(); };
        list.appendChild(div);
    });
}
document.getElementById('btnNewFolder').onclick = () => {
    const name = prompt("Enter new folder name:");
    if (name && !folders.includes(name)) {
        folders.push(name);
        localStorage.setItem('notebook_folders', JSON.stringify(folders));
        renderFolders();
    }
};
renderFolders();

// --- Canvas & Drawing Logic ---
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false, lastX = 0, lastY = 0, currentTool = 'pen', currentEditingNoteId = null;

function openCanvas(editingId = null, imageUrl = null) {
    currentEditingNoteId = editingId;
    homePage.style.display = 'none';
    drawingPage.style.display = 'block';
    resizeCanvas();
    
    if (imageUrl) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
        img.src = imageUrl;
    }
}

document.getElementById('btnCreateNote').onclick = () => openCanvas();
document.getElementById('btnBack').onclick = () => { drawingPage.style.display = 'none'; homePage.style.display = 'flex'; loadNotes(); };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!currentEditingNoteId) clearCanvas();
}
window.addEventListener('resize', () => { if (drawingPage.style.display === 'block') resizeCanvas(); });

function clearCanvas() {
    ctx.fillStyle = "#ffffff"; // කැන්වසය හැමවිටම සුදුයි
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

function startDrawing(e) {
    if (e.pointerType !== 'pen') return;
    isDrawing = true;
    const pos = getPointerPos(e);
    lastX = pos.x; lastY = pos.y;
}

function draw(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault(); 
    if (e.pointerType !== 'pen') return;
    
    const pos = getPointerPos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(pos.x, pos.y);
    
    let pressure = e.pressure !== undefined ? e.pressure : 1; 
    let baseWidth = parseFloat(document.getElementById('brushSize').value);

    if (currentTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = baseWidth * 6;
    } else {
        ctx.strokeStyle = document.getElementById('colorPicker').value;
        ctx.lineWidth = baseWidth * (pressure * 2);
    }
    
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastX = pos.x; lastY = pos.y;
}

function stopDrawing(e) {
    if (e.pointerType !== 'pen') return; 
    isDrawing = false;
    ctx.beginPath();
}

canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw, { passive: false }); 
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);

document.getElementById('clearBtn').onclick = clearCanvas;

const btnPen = document.getElementById('btnPen'), btnEraser = document.getElementById('btnEraser');
btnPen.onclick = () => { currentTool = 'pen'; btnPen.classList.replace('btn-outline-primary', 'btn-primary'); btnEraser.classList.replace('btn-primary', 'btn-outline-primary'); };
btnEraser.onclick = () => { currentTool = 'eraser'; btnEraser.classList.replace('btn-outline-primary', 'btn-primary'); btnPen.classList.replace('btn-primary', 'btn-outline-primary'); };

// --- Save Note (With User ID) ---
document.getElementById('saveBtn').onclick = async () => {
    if(!currentUser) return;
    try {
        const btn = document.getElementById('saveBtn');
        btn.innerText = "Saving..."; btn.disabled = true;
        const imageDataUrl = canvas.toDataURL('image/png');

        if (currentEditingNoteId) {
            await updateDoc(doc(db, "notes", currentEditingNoteId), { image: imageDataUrl, folder: currentFolder });
        } else {
            // අලුතින් Save කරද්දී uid එක අනිවාර්යයෙන්ම යවනවා
            await addDoc(collection(db, "notes"), { 
                uid: currentUser.uid, 
                image: imageDataUrl, 
                folder: currentFolder === 'All' ? 'Personal' : currentFolder, 
                createdAt: serverTimestamp() 
            });
        }
        
        drawingPage.style.display = 'none'; homePage.style.display = 'flex'; loadNotes();
        btn.innerText = "Save Note"; btn.disabled = false;
    } catch (e) { alert("Error saving."); console.error(e); }
};

// --- Load Notes (Only Current User's Notes) ---
async function loadNotes() {
    if(!currentUser) return;
    document.getElementById('currentFolderTitle').innerText = currentFolder === 'All' ? 'All Notes' : `Folder: ${currentFolder}`;
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '<p class="text-muted">Loading your notes...</p>';
    
    try {
        // Query එකෙන් අදාල User ගේ Notes පමණක් ලබාගැනීම
        const q = query(
            collection(db, "notes"), 
            where("uid", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        notesGrid.innerHTML = ''; 

        if(snapshot.empty) {
            notesGrid.innerHTML = '<div class="col-12"><p class="text-muted">තවම සටහන් කිසිවක් නැත.</p></div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const noteFolder = data.folder || 'Personal';
            
            if (currentFolder !== 'All' && noteFolder !== currentFolder) return;

            const div = document.createElement('div');
            div.className = 'col-lg-3 col-md-4 col-sm-6';
            
            let folderOptions = folders.filter(f => f !== 'All').map(f => `<option value="${f}" ${f === noteFolder ? 'selected' : ''}>${f}</option>`).join('');

            div.innerHTML = `
                <div class="note-card bg-body-tertiary">
                    <img src="${data.image}" title="Click to Edit">
                    <div class="note-actions">
                        <select class="form-select form-select-sm w-auto move-folder-select" data-id="${docSnap.id}">
                            ${folderOptions}
                        </select>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${docSnap.id}">🗑️</button>
                    </div>
                </div>
            `;

            div.querySelector('img').onclick = () => openCanvas(docSnap.id, data.image);
            
            div.querySelector('.delete-btn').onclick = async (e) => {
                if(confirm('Are you sure you want to delete this note?')) {
                    await deleteDoc(doc(db, "notes", e.target.getAttribute('data-id')));
                    loadNotes();
                }
            };

            div.querySelector('.move-folder-select').onchange = async (e) => {
                await updateDoc(doc(db, "notes", e.target.getAttribute('data-id')), { folder: e.target.value });
                loadNotes();
            };

            notesGrid.appendChild(div);
        });
    } catch (error) {
        // Firestore Index හැදුවෙ නැත්නම් එන Error එක පෙන්වන්න
        console.error("Error loading notes: ", error);
        if(error.message.includes("requires an index")) {
            notesGrid.innerHTML = `<div class="col-12"><div class="alert alert-warning">Database Index එකක් හදන්න අවශ්‍යයි. Console එකේ තියෙන ලින්ක් එක ක්ලික් කරලා ඒක හදන්න.</div></div>`;
        } else {
            notesGrid.innerHTML = '<div class="col-12"><p class="text-danger">Notes load කිරීමේදී දෝෂයක් මතු විය.</p></div>';
        }
    }
}