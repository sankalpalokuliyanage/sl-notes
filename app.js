import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// DOM Elements
const homePage = document.getElementById('homePage');
const drawingPage = document.getElementById('drawingPage');
const btnCreateNote = document.getElementById('btnCreateNote');
const btnBack = document.getElementById('btnBack');
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let lastX = 0, lastY = 0;
let currentTool = 'pen';
let currentEditingNoteId = null; // Edit කරන Note එකේ ID එක
let currentFolder = 'All'; // දැනට ඉන්න Folder එක

// Folders Management (Local Storage පාවිච්චි කර ඇත)
let folders = JSON.parse(localStorage.getItem('notebook_folders')) || ['All', 'Work', 'Personal'];

// --- Folders UI ---
function renderFolders() {
    const list = document.getElementById('folderList');
    list.innerHTML = '';
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = `folder-item ${folder === currentFolder ? 'active' : ''}`;
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

// --- Navigation & Canvas ---
function openCanvas(editingId = null, imageUrl = null) {
    currentEditingNoteId = editingId;
    homePage.style.display = 'none';
    drawingPage.style.display = 'block';
    resizeCanvas();
    
    if (imageUrl) {
        // Edit කිරීම සඳහා පරණ Note එක කැන්වසයට Load කිරීම
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
        img.src = imageUrl;
    }
}

btnCreateNote.onclick = () => openCanvas(null, null);
btnBack.onclick = () => { drawingPage.style.display = 'none'; homePage.style.display = 'block'; loadNotes(); };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!currentEditingNoteId) clearCanvas(); // අලුත් එකක් නම් විතරක් සුදු කරන්න
}
window.addEventListener('resize', () => { if (drawingPage.style.display === 'block') resizeCanvas(); });

function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

// --- BUG FIX: Drawing Logic ---
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
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
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

// FIX: අත ගෑවුනොත් නවතින එක නවත්වන්න 'pen' එකෙන් එන ඉවෙන්ට් විතරක් භාරගැනීම
function stopDrawing(e) {
    if (e.pointerType !== 'pen') return; 
    isDrawing = false;
    ctx.beginPath();
}

canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw, { passive: false }); 
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing); // හදිසි බාධා වලදීත් පෑනෙන් නම් පමණක් නවතී

document.getElementById('clearBtn').onclick = clearCanvas;

// Tools toggle
const btnPen = document.getElementById('btnPen'), btnEraser = document.getElementById('btnEraser');
btnPen.onclick = () => { currentTool = 'pen'; btnPen.classList.add('active', 'btn-dark'); btnPen.classList.remove('btn-outline-dark'); btnEraser.classList.remove('active', 'btn-dark'); btnEraser.classList.add('btn-outline-dark'); };
btnEraser.onclick = () => { currentTool = 'eraser'; btnEraser.classList.add('active', 'btn-dark'); btnEraser.classList.remove('btn-outline-dark'); btnPen.classList.remove('active', 'btn-dark'); btnPen.classList.add('btn-outline-dark'); };


// --- Save & Update Logic ---
document.getElementById('saveBtn').onclick = async () => {
    try {
        const btn = document.getElementById('saveBtn');
        btn.innerText = "Saving..."; btn.disabled = true;
        const imageDataUrl = canvas.toDataURL('image/png');

        if (currentEditingNoteId) {
            // පරණ එක Edit කරනවා නම් (Update)
            await updateDoc(doc(db, "notes", currentEditingNoteId), { image: imageDataUrl, folder: currentFolder });
        } else {
            // අලුත් එකක් Save කරනවා නම් (Add)
            await addDoc(collection(db, "notes"), { image: imageDataUrl, folder: currentFolder === 'All' ? 'Personal' : currentFolder, createdAt: serverTimestamp() });
        }
        
        drawingPage.style.display = 'none'; homePage.style.display = 'block'; loadNotes();
        btn.innerText = "Save Note"; btn.disabled = false;
    } catch (e) { alert("Error saving."); }
};


// --- Load & Render Notes ---
async function loadNotes() {
    document.getElementById('currentFolderTitle').innerText = currentFolder === 'All' ? 'All Notes' : `Folder: ${currentFolder}`;
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '<p>Loading notes...</p>';
    
    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    notesGrid.innerHTML = ''; 

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const noteFolder = data.folder || 'Personal';
        
        // Filter by current folder
        if (currentFolder !== 'All' && noteFolder !== currentFolder) return;

        // Note Card UI නිර්මාණය
        const div = document.createElement('div');
        div.className = 'col-md-4 col-sm-6';
        
        // Folder මාරු කිරීමේ Dropdown options හැදීම
        let folderOptions = folders.filter(f => f !== 'All').map(f => `<option value="${f}" ${f === noteFolder ? 'selected' : ''}>${f}</option>`).join('');

        div.innerHTML = `
            <div class="note-card">
                <img src="${data.image}" title="Click to Edit">
                <div class="note-actions bg-light">
                    <select class="form-select form-select-sm w-auto move-folder-select" data-id="${docSnap.id}">
                        ${folderOptions}
                    </select>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${docSnap.id}">🗑️</button>
                </div>
            </div>
        `;

        // Edit කිරීම සඳහා Image එක Click කිරීම
        div.querySelector('img').onclick = () => openCanvas(docSnap.id, data.image);
        
        // Delete Button Logic
        div.querySelector('.delete-btn').onclick = async (e) => {
            if(confirm('Are you sure you want to delete this note?')) {
                await deleteDoc(doc(db, "notes", e.target.getAttribute('data-id')));
                loadNotes();
            }
        };

        // Folder Move Logic
        div.querySelector('.move-folder-select').onchange = async (e) => {
            await updateDoc(doc(db, "notes", e.target.getAttribute('data-id')), { folder: e.target.value });
            loadNotes();
        };

        notesGrid.appendChild(div);
    });
}

// Initial Setup
renderFolders();
loadNotes();