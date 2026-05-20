import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, deleteDoc, updateDoc, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
let currentLang = 'en'; // පෙරනිමි භාෂාව

// --- Translations Dictionary (i18n) ---
const dict = {
    en: {
        login_subtitle: "Keep your notes safe.", login_btn: "Sign in with Google", logout: "Logout",
        new_note: "✏️ New Note", folders: "Folders", all_notes: "All Notes",
        loading_notes: "Loading your notes...", no_notes: "No notes yet.",
        btn_back: "🔙 Back", btn_pen: "✒️ Pen", btn_eraser: "🧽 Eraser", btn_clear: "Clear", btn_save: "Save Note",
        saving: "Saving...", saved_success: "Note saved successfully!",
        delete_confirm: "Are you sure you want to delete this note?", new_folder_prompt: "Enter new folder name:"
    },
    si: {
        login_subtitle: "ඔබගේ සටහන් ආරක්ෂිතව තබාගන්න.", login_btn: "Google හරහා ඇතුල් වන්න", logout: "ඉවත් වන්න",
        new_note: "✏️ නව සටහනක්", folders: "ගොනු (Folders)", all_notes: "සියලුම සටහන්",
        loading_notes: "සටහන් ලබා ගනිමින්...", no_notes: "තවම සටහන් කිසිවක් නැත.",
        btn_back: "🔙 ආපසු", btn_pen: "✒️ පෑන", btn_eraser: "🧽 මකනය", btn_clear: "මකන්න", btn_save: "සටහන සුරකින්න",
        saving: "සුරකිමින්...", saved_success: "සටහන සාර්ථකව සුරැකුවා!",
        delete_confirm: "මෙම සටහන මකා දැමීමට අවශ්‍ය බව විශ්වාසද?", new_folder_prompt: "නව ගොනුවේ නම ඇතුලත් කරන්න:"
    },
    ko: {
        login_subtitle: "노트를 안전하게 보관하세요.", login_btn: "Google로 로그인", logout: "로그아웃",
        new_note: "✏️ 새 노트", folders: "폴더", all_notes: "모든 노트",
        loading_notes: "노트를 불러오는 중...", no_notes: "아직 노트가 없습니다.",
        btn_back: "🔙 뒤로", btn_pen: "✒️ 펜", btn_eraser: "🧽 지우개", btn_clear: "지우기", btn_save: "노트 저장",
        saving: "저장 중...", saved_success: "노트가 성공적으로 저장되었습니다!",
        delete_confirm: "이 노트를 삭제하시겠습니까?", new_folder_prompt: "새 폴더 이름을 입력하세요:"
    }
};

// DOM Elements
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const homePage = document.getElementById('homePage');
const drawingPage = document.getElementById('drawingPage');
const userEmailBadge = document.getElementById('userEmailBadge');
const languageSelect = document.getElementById('languageSelect');

// --- Language Management Logic ---
function applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[lang] && dict[lang][key]) {
            el.innerHTML = dict[lang][key];
        }
    });
    
    // Dynamic text updates
    renderFolders();
    if(appContainer.style.display === 'flex') loadNotes();
}

languageSelect.addEventListener('change', async (e) => {
    currentLang = e.target.value;
    applyLanguage(currentLang);
    // User ලොග් වෙලා ඉන්නවා නම් අලුත් භාෂාව Database එකේ සේව් කරන්න
    if (currentUser) {
        await setDoc(doc(db, "users", currentUser.uid), { language: currentLang }, { merge: true });
    }
});

async function loadUserLanguage(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().language) {
            currentLang = userSnap.data().language;
        } else {
            // පළමු වතාවට ආපු කෙනෙක් නම් Default එක සේව් කරන්න
            await setDoc(userRef, { language: 'en' }, { merge: true });
        }
        languageSelect.value = currentLang;
        applyLanguage(currentLang);
    } catch (e) {
        console.error("Error loading language pref:", e);
    }
}

// --- Auth Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userEmailBadge.innerText = user.email;
        loginPage.style.display = 'none';
        appContainer.style.display = 'flex';
        
        // භාෂාව සහ සටහන් Load කිරීම
        await loadUserLanguage(user.uid);
        loadNotes();
    } else {
        currentUser = null;
        loginPage.style.display = 'flex';
        appContainer.style.display = 'none';
        applyLanguage('en'); // ලොග් අවුට් වුනාම English වලට හැරවීම
    }
});

document.getElementById('btnLoginGoogle').onclick = () => signInWithPopup(auth, provider);
document.getElementById('btnLogout').onclick = () => signOut(auth);

// --- Theme Logic ---
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
        div.innerText = folder === 'All' ? `📂 ${dict[currentLang].all_notes}` : `📁 ${folder}`;
        div.onclick = () => { currentFolder = folder; renderFolders(); loadNotes(); };
        list.appendChild(div);
    });
}
document.getElementById('btnNewFolder').onclick = () => {
    const name = prompt(dict[currentLang].new_folder_prompt);
    if (name && !folders.includes(name)) {
        folders.push(name);
        localStorage.setItem('notebook_folders', JSON.stringify(folders));
        renderFolders();
    }
};

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
    ctx.fillStyle = "#ffffff"; 
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

// --- Save Note ---
document.getElementById('saveBtn').onclick = async () => {
    if(!currentUser) return;
    try {
        const btn = document.getElementById('saveBtn');
        btn.innerText = dict[currentLang].saving; 
        btn.disabled = true;
        const imageDataUrl = canvas.toDataURL('image/png');

        if (currentEditingNoteId) {
            await updateDoc(doc(db, "notes", currentEditingNoteId), { image: imageDataUrl, folder: currentFolder });
        } else {
            await addDoc(collection(db, "notes"), { 
                uid: currentUser.uid, 
                image: imageDataUrl, 
                folder: currentFolder === 'All' ? 'Personal' : currentFolder, 
                createdAt: serverTimestamp() 
            });
        }
        
        alert(dict[currentLang].saved_success);
        drawingPage.style.display = 'none'; homePage.style.display = 'flex'; loadNotes();
        btn.innerText = dict[currentLang].btn_save; 
        btn.disabled = false;
    } catch (e) { alert("Error saving."); console.error(e); }
};

// --- Load Notes ---
async function loadNotes() {
    if(!currentUser) return;
    document.getElementById('currentFolderTitle').innerText = currentFolder === 'All' ? dict[currentLang].all_notes : `📁 ${currentFolder}`;
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = `<p class="text-muted">${dict[currentLang].loading_notes}</p>`;
    
    try {
        const q = query(
            collection(db, "notes"), 
            where("uid", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        notesGrid.innerHTML = ''; 

        if(snapshot.empty) {
            notesGrid.innerHTML = `<div class="col-12"><p class="text-muted">${dict[currentLang].no_notes}</p></div>`;
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
                if(confirm(dict[currentLang].delete_confirm)) {
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
        console.error("Error loading notes: ", error);
    }
}