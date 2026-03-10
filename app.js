// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref, push, serverTimestamp, set, onValue, query, remove, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyClHeK5tYtXHzC2qkIx1U4F_CbzfFogHm4",
    authDomain: "kesher-63596.firebaseapp.com",
    projectId: "kesher-63596",
    storageBucket: "kesher-63596.firebasestorage.app",
    messagingSenderId: "546299178652",
    appId: "1:546299178652:web:aa0da3c55ba39d92014759",
    measurementId: "G-JGN8GG6V3Q",
    databaseURL: "https://kesher-63596-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app, firebaseConfig.databaseURL);

// DOM Elements
const reportForm = document.getElementById('report-form');
const authorInput = document.getElementById('author');
const contentInput = document.getElementById('content');
const submitBtn = document.getElementById('submit-btn');
const reportsContainer = document.getElementById('reports-container');

// Check if user previously entered their name and restore it
const savedAuthor = localStorage.getItem('kesherAuthor');
if (savedAuthor) {
    authorInput.value = savedAuthor;
}

// Reference to events collection in database
const eventsRef = ref(database, 'events');
// Query to get events
const eventsQuery = query(eventsRef);

// Add event listener for form submission
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const author = authorInput.value.trim();
    const content = contentInput.value.trim();

    if (!author || !content) return;

    // Save author name for next time
    localStorage.setItem('kesherAuthor', author);

    const reportTypeElement = document.querySelector('input[name="reportType"]:checked');
    const reportType = reportTypeElement ? reportTypeElement.value : 'event';

    try {
        // Disable button while processing
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>שולח מידע...</span>';

        // Create new event reference
        const newEventRef = push(eventsRef);

        // Set data
        await set(newEventRef, {
            author: author,
            content: content,
            type: reportType,
            status: reportType === 'fault' ? 'open' : null,
            timestamp: serverTimestamp(),
            clientTime: Date.now() // Standby if server timestamp is slow/unavailable
        });

        // Reset form content, keep author
        contentInput.value = '';

        // Restore button state with success
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>נשלח בהצלחה</span>';
        submitBtn.style.background = 'linear-gradient(135deg, var(--success-color), #00b35c)';
        submitBtn.style.color = '#fff';

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>שלח דיווח עכשיו</span> <i class="fa-solid fa-paper-plane"></i>';
            submitBtn.style.background = ''; // reset to default css
        }, 2000);

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("אירעה שגיאה בשליחת הדיווח. אנא בדוק את החיבור לאינטרנט ונסה שוב.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>שלח דיווח עכשיו</span> <i class="fa-solid fa-paper-plane"></i>';
    }
});

// Listen for realtime updates
onValue(eventsQuery, (snapshot) => {
    reportsContainer.innerHTML = '';

    if (!snapshot.exists()) {
        reportsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-list" style="font-size: 2.5rem; margin-bottom: 15px; color: var(--secondary-color);"></i>
                <p>אין דיווחים במערכת עדיין.<br>שלח את הדיווח הראשון!</p>
            </div>
        `;
        return;
    }

    const events = [];
    snapshot.forEach((childSnapshot) => {
        events.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
        });
    });

    // Sort descending (newest first)
    events.sort((a, b) => {
        const timeA = a.timestamp || a.clientTime || 0;
        const timeB = b.timestamp || b.clientTime || 0;
        return timeB - timeA;
    });

    // Render events
    events.forEach((event, index) => {
        const reportEl = document.createElement('div');
        reportEl.className = 'report-item';
        // Staggered animation delay
        reportEl.style.animationDelay = `${index * 0.05}s`;

        // Format date and time
        const eventTime = event.timestamp ? new Date(event.timestamp) : new Date(event.clientTime);
        let dateStr = '';
        let timeStr = '';

        if (!isNaN(eventTime.getTime())) {
            // Check if today
            const today = new Date();
            const isToday = eventTime.getDate() === today.getDate() &&
                eventTime.getMonth() === today.getMonth() &&
                eventTime.getFullYear() === today.getFullYear();

            dateStr = isToday ? 'היום' : eventTime.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
            timeStr = eventTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        }

        // Escape HTML to prevent XSS
        const escapeHTML = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // Determine type display
        let typeBadgeStr = '';
        let isResolved = false;
        if (event.type === 'fault') {
            isResolved = event.status === 'resolved';
            if (isResolved) {
                typeBadgeStr = `<span class="report-type-badge type-resolved"><i class="fa-solid fa-check-circle"></i> תקלה נסגרה</span>`;
            } else {
                typeBadgeStr = `<span class="report-type-badge type-fault"><i class="fa-solid fa-triangle-exclamation"></i> תקלה פתוחה</span>`;
            }
        } else {
            typeBadgeStr = `<span class="report-type-badge type-event"><i class="fa-solid fa-info-circle"></i> אירוע</span>`;
        }

        reportEl.innerHTML = `
            <div class="report-header">
                <div class="report-author">
                    ${typeBadgeStr}
                    <i class="fa-solid fa-user-astronaut"></i>
                    <span>${escapeHTML(event.author || 'אנונימי')}</span>
                </div>
                <div class="report-time">
                    <span class="report-date">${dateStr}</span>
                    <span>${timeStr}</span>
                </div>
            </div>
            <div class="report-content" ${isResolved ? 'style="opacity: 0.7;"' : ''}>${escapeHTML(event.content || '').replace(/\n/g, '<br>')}</div>
            <div class="report-actions">
                ${event.type === 'fault' && !isResolved ? `<button class="action-btn resolve-btn" data-id="${event.id}"><i class="fa-solid fa-check"></i> תקלה טופלה</button>` : ''}
                <button class="action-btn delete-btn" data-id="${event.id}"><i class="fa-solid fa-trash"></i> מחיקה</button>
            </div>
        `;

        reportsContainer.appendChild(reportEl);

        // Ensure opacity is 1 after animation in case it gets stuck
        setTimeout(() => {
            reportEl.classList.add('loaded');
        }, 100 + index * 50);

        // Add Action Event Listeners
        if (event.type === 'fault' && !isResolved) {
            const resolveBtn = reportEl.querySelector('.resolve-btn');
            if (resolveBtn) {
                resolveBtn.addEventListener('click', async () => {
                    if (confirm('האם אתה בטוח שהתקלה טופלה לחלוטין וניתן לסגור אותה?')) {
                        try {
                            const eventToUpdateRef = ref(database, 'events/' + event.id);
                            await update(eventToUpdateRef, { status: 'resolved' });
                        } catch (error) {
                            console.error("Error updating document", error);
                            alert("שגיאה בעדכון הסטטוס");
                        }
                    }
                });
            }
        }

        const deleteBtn = reportEl.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('האם למחוק דיווח זה? פעולה זו סופית ולא ניתנת לביטול.')) {
                    try {
                        const eventToDeleteRef = ref(database, 'events/' + event.id);
                        await remove(eventToDeleteRef);
                    } catch (error) {
                        console.error("Error deleting document", error);
                        alert("שגיאה במחיקת הדיווח");
                    }
                }
            });
        }
    });
}, (error) => {
    console.error("Firebase read error: ", error);
    reportsContainer.innerHTML = `
        <div class="error-msg" style="display:block; text-align:center; padding:20px; background: rgba(255,0,0,0.1); border-radius: 8px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #ff1744; margin-bottom: 10px;"></i>
            <p>שגיאת התחברות למסד הנתונים</p>
            <p style="font-size: 0.9rem; margin-top: 10px;"><strong>הערה למנהל האתר:</strong><br>יש לוודא שהוגדרו הרשאות קריאה וכתיבה (Rules) ב-Firebase Realtime Database.</p>
        </div>
    `;
});
