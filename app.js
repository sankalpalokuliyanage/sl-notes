// Firebase SDKs Import කිරීම (CDN මගින්)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Canvas Setup කිරීම
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Canvas එක සුදු පාටින් පිරවීම (Save කරද්දී background එක කළු නොවීමට)
function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
clearCanvas();

// Drawing Logic (Pointer Events මගින් පෑන සහ ඇඟිල්ල හඳුනාගැනීම)
function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    
    ctx.strokeStyle = colorPicker.value;
    
    // Apple Pencil වගේ Stylus එකකින් එන pressure එක අනුව මහත වෙනස් කිරීම
    let pressure = e.pressure !== undefined ? e.pressure : 1; 
    let baseWidth = parseFloat(brushSize.value);
    ctx.lineWidth = e.pointerType === 'pen' ? baseWidth * (pressure * 2) : baseWidth;
    
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

// Event Listeners සම්බන්ධ කිරීම
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

// Clear Canvas Button
clearBtn.addEventListener('click', clearCanvas);

// Firebase Firestore එකට Save කිරීම
saveBtn.addEventListener('click', async () => {
    try {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;
        
        // Canvas එකේ තියෙන රූපය Base64 ආකෘතියට හැරවීම
        const imageDataUrl = canvas.toDataURL('image/png');

        // Firestore එකේ 'notes' කියන collection එකට දත්ත යැවීම
        await addDoc(collection(db, "notes"), {
            image: imageDataUrl,
            createdAt: serverTimestamp()
        });

        alert("Note saved successfully!");
        clearCanvas(); // Canvas එක හිස් කිරීම
        loadNotes();   // අලුත් note එක ලැයිස්තුවට ගන්න
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error saving note. Check console for details.");
    } finally {
        saveBtn.innerText = "Save Note";
        saveBtn.disabled = false;
    }
});

// සේව් කරපු Notes Firestore එකෙන් අරගෙන පෙන්වීම
async function loadNotes() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = 'Loading notes...';
    
    try {
        // අලුත්ම Notes උඩින් එන විදිහට දත්ත ලබා ගැනීම
        const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        notesList.innerHTML = ''; // Clear loading text
        
        if(querySnapshot.empty) {
            notesList.innerHTML = '<p class="text-muted small">තවම සටහන් කිසිවක් නැත.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const noteData = doc.data();
            if(noteData.image) {
                const imgElement = document.createElement('img');
                imgElement.src = noteData.image;
                imgElement.className = 'img-fluid mb-3 border rounded shadow-sm w-100';
                notesList.appendChild(imgElement);
            }
        });
    } catch (error) {
        console.error("Error loading notes: ", error);
        notesList.innerHTML = '<p class="text-danger small">Notes load කිරීමේදී දෝෂයක් මතු විය.</p>';
    }
}

// පිටුව Load වෙද්දී කලින් තියෙන Notes පෙන්නන්න
loadNotes();