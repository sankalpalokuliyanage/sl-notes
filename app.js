// Firebase SDKs Import කිරීම
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ඔයාගේ Firebase Configuration එක
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
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

const btnPen = document.getElementById('btnPen');
const btnEraser = document.getElementById('btnEraser');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'pen'; // 'pen' හෝ 'eraser'

// --- Navigation Logic (පිටු මාරු වීම) ---
btnCreateNote.addEventListener('click', () => {
    homePage.style.display = 'none';
    drawingPage.style.display = 'block';
    resizeCanvas(); // තිරයේ ප්‍රමාණයට කැන්වසය හැඩගැන්වීම
    clearCanvas();
});

btnBack.addEventListener('click', () => {
    drawingPage.style.display = 'none';
    homePage.style.display = 'block';
    loadNotes(); // ආපසු යද්දී අලුත් Notes තියෙනවද බලන්න
});

// --- Tools Toggle (Pen / Eraser) ---
btnPen.addEventListener('click', () => {
    currentTool = 'pen';
    btnPen.classList.replace('btn-outline-dark', 'btn-dark');
    btnPen.classList.add('active');
    btnEraser.classList.replace('btn-dark', 'btn-outline-dark');
    btnEraser.classList.remove('active');
});

btnEraser.addEventListener('click', () => {
    currentTool = 'eraser';
    btnEraser.classList.replace('btn-outline-dark', 'btn-dark');
    btnEraser.classList.add('active');
    btnPen.classList.replace('btn-dark', 'btn-outline-dark');
    btnPen.classList.remove('active');
});

// --- Canvas Sizing (Full Screen) ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    clearCanvas(); // Resize කරද්දී කැන්වසය සුදු පාටින් පිරවීම
}

// Window එක resize වෙද්දී කැන්වසයත් හැඩගැසීම
window.addEventListener('resize', () => {
    if (drawingPage.style.display === 'block') {
        resizeCanvas();
    }
});

function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// නිවැරදි X, Y ඛණ්ඩාංක
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// --- Drawing Logic ---
function startDrawing(e) {
    if (e.pointerType !== 'pen') return; // Apple Pencil පමණයි

    isDrawing = true;
    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;
}

function draw(e) {
    if (!isDrawing) return;
    
    if (e.cancelable) {
        e.preventDefault(); 
    }

    if (e.pointerType !== 'pen') return;
    
    const pos = getPointerPos(e);
    const currentX = pos.x;
    const currentY = pos.y;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    
    let pressure = e.pressure !== undefined ? e.pressure : 1; 
    let baseWidth = parseFloat(brushSize.value);

    // Eraser එක තෝරලා නම් සුදු පාටින් මහතට අඳිනවා, නැත්නම් තෝරපු පාටින් අඳිනවා
    if (currentTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = baseWidth * 6; // මකනය සාමාන්‍ය පෑනට වඩා මහතයි
    } else {
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = baseWidth * (pressure * 2);
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

// Event Listeners
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw, { passive: false }); 
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

clearBtn.addEventListener('click', clearCanvas);

// --- Firebase Save ---
saveBtn.addEventListener('click', async () => {
    try {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;
        
        const imageDataUrl = canvas.toDataURL('image/png');

        await addDoc(collection(db, "notes"), {
            image: imageDataUrl,
            createdAt: serverTimestamp()
        });

        alert("Note saved successfully!");
        
        // Save කළාට පස්සේ ආපසු Home පිටුවට යැවීම
        drawingPage.style.display = 'none';
        homePage.style.display = 'block';
        loadNotes();
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error saving note. Check console.");
    } finally {
        saveBtn.innerText = "Save Note";
        saveBtn.disabled = false;
    }
});

// --- Load Notes (Home Page එකට) ---
async function loadNotes() {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '<div class="col-12"><p class="text-muted">Loading notes...</p></div>';
    
    try {
        const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        notesGrid.innerHTML = ''; 
        
        if(querySnapshot.empty) {
            notesGrid.innerHTML = '<div class="col-12"><p class="text-muted">තවම සටහන් කිසිවක් නැත.</p></div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const noteData = doc.data();
            if(noteData.image) {
                // Notes ලස්සනට Grid එකක් විදිහට පෙන්වීම
                const colDiv = document.createElement('div');
                colDiv.className = 'col-md-4 col-sm-6 mb-4 note-card';
                
                const imgElement = document.createElement('img');
                imgElement.src = noteData.image;
                imgElement.className = 'img-fluid w-100 border';
                
                colDiv.appendChild(imgElement);
                notesGrid.appendChild(colDiv);
            }
        });
    } catch (error) {
        console.error("Error loading notes: ", error);
        notesGrid.innerHTML = '<div class="col-12"><p class="text-danger">Notes load කිරීමේදී දෝෂයක් මතු විය.</p></div>';
    }
}

// පිටුව Load වෙද්දී මුලින්ම Notes ටික පෙන්නන්න
loadNotes();