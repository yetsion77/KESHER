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
const faultLocationGroup = document.getElementById('fault-location-group');
const faultLocationSelect = document.getElementById('fault-location');
const faultTechnicianGroup = document.getElementById('fault-technician-group');
const faultTechnicianInput = document.getElementById('fault-technician');
const lessonInput = document.getElementById('lesson');
const submitBtn = document.getElementById('submit-btn');
const reportsContainer = document.getElementById('reports-container');
const exportBtn = document.getElementById('export-btn');
const reportTypeRadios = document.querySelectorAll('input[name="reportType"]');

// Toggle location visibility
reportTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'fault') {
            faultLocationGroup.style.display = 'block';
            faultTechnicianGroup.style.display = 'block';
        } else {
            faultLocationGroup.style.display = 'none';
            faultTechnicianGroup.style.display = 'none';
            faultLocationSelect.value = ''; // Reset if switched back
            faultTechnicianInput.value = '';
        }
    });
});

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
    const lesson = lessonInput.value.trim();
    const faultLocation = faultLocationSelect.value;
    const faultTechnician = faultTechnicianInput.value.trim();

    if (!author || !content) return;

    // Save author name for next time
    localStorage.setItem('kesherAuthor', author);

    const reportTypeElement = document.querySelector('input[name="reportType"]:checked');
    const reportType = reportTypeElement ? reportTypeElement.value : 'event';

    if (reportType === 'fault' && !faultLocation) {
        alert("נא לבחור את מקום התקלה.");
        return;
    }

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
            location: reportType === 'fault' ? faultLocation : null,
            technician: reportType === 'fault' ? faultTechnician : null,
            lesson: lesson || null,
            timestamp: serverTimestamp(),
            clientTime: Date.now() // Standby if server timestamp is slow/unavailable
        });

        // Reset form content, keep author
        contentInput.value = '';
        lessonInput.value = '';
        faultLocationSelect.value = '';
        faultTechnicianInput.value = '';
        document.querySelector('input[name="reportType"][value="event"]').checked = true;
        faultLocationGroup.style.display = 'none';
        faultTechnicianGroup.style.display = 'none';

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

    window.currentEvents = events; // Store for export

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
            ${(event.location || event.lesson || event.technician) ? `
                <div class="report-metadata">
                    ${event.location ? `<div class="metadata-item"><i class="fa-solid fa-location-dot"></i> <span><strong>מיקום:</strong> ${escapeHTML(event.location)}</span></div>` : ''}
                    ${event.technician ? `<div class="metadata-item"><i class="fa-solid fa-screwdriver-wrench"></i> <span><strong>טופל ע"י:</strong> ${escapeHTML(event.technician)}</span></div>` : ''}
                    ${event.lesson ? `<div class="metadata-item"><i class="fa-solid fa-lightbulb"></i> <span><strong>לקח:</strong> ${escapeHTML(event.lesson)}</span></div>` : ''}
                </div>
            ` : ''}
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

// Export functionality
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const eventsToExport = window.currentEvents;
        if (!eventsToExport || eventsToExport.length === 0) {
            alert("אין נתונים לייצוא.");
            return;
        }

        let csvContent = "\uFEFF"; // UTF-8 BOM for Hebrew support in Excel
        csvContent += "תאריך,שעה,סוג הדיווח,סטטוס תקלה,מדווח,גורם מטפל בתקלה,מיקום תקלה,תיאור האירוע,לקח מקצועי\r\n";

        eventsToExport.forEach(event => {
            const dateObj = event.timestamp ? new Date(event.timestamp) : new Date(event.clientTime);
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('he-IL') : '';
            const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';

            const typeStr = event.type === 'fault' ? 'תקלה פתוחה' : 'אירוע רגיל';
            const statusStr = event.status === 'resolved' ? 'תקלה נסגרה' : (event.status === 'open' ? 'פתוחה' : '');

            const rowArray = [
                dateStr,
                timeStr,
                typeStr,
                statusStr,
                event.author || '',
                event.technician || '',
                event.location || '',
                event.content || '',
                event.lesson || ''
            ].map(item => {
                let str = String(item).replace(/"/g, '""').replace(/\n/g, ' ');
                return `"${str}"`;
            });

            csvContent += rowArray.join(",") + "\r\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        // Replace dots and slashes to make valid filename
        const dateFilename = new Date().toLocaleDateString('he-IL').replace(/[\.\/]/g, '-');
        link.setAttribute("download", `kesher1891_log_${dateFilename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Modal logic
const btnFaults = document.getElementById('btn-faults');
const btnPhones = document.getElementById('btn-phones');
const btnGuards = document.getElementById('btn-guards');
const modalFaults = document.getElementById('modal-faults');
const modalPhones = document.getElementById('modal-phones');
const modalGuards = document.getElementById('modal-guards');
const closeFaults = document.getElementById('close-faults');
const closePhones = document.getElementById('close-phones');
const closeGuards = document.getElementById('close-guards');
const guardsContainer = document.getElementById('guards-container');
const resetGuardsBtn = document.getElementById('reset-guards-btn');

if (btnFaults && modalFaults) {
    btnFaults.addEventListener('click', () => modalFaults.style.display = 'block');
    closeFaults.addEventListener('click', () => modalFaults.style.display = 'none');
}

if (btnPhones && modalPhones) {
    btnPhones.addEventListener('click', () => modalPhones.style.display = 'block');
    closePhones.addEventListener('click', () => modalPhones.style.display = 'none');
}

if (btnGuards && modalGuards) {
    btnGuards.addEventListener('click', () => modalGuards.style.display = 'block');
    closeGuards.addEventListener('click', () => modalGuards.style.display = 'none');
}

window.addEventListener('click', (e) => {
    if (e.target === modalFaults) modalFaults.style.display = 'none';
    if (e.target === modalPhones) modalPhones.style.display = 'none';
    if (e.target === modalGuards) modalGuards.style.display = 'none';
});

// Guards feature integration
const guardsRef = ref(database, 'guards');

const defaultGuardsData = {
    day1: {
        name: "שני, 16.3",
        order: 1,
        shifts: {
            "00:00": "יעקב", "02:00": "רן", "04:00": "נועם", "06:00": "גיא", "08:00": "דני",
            "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "פלס״ם", "16:00": "פלס״ם", "18:00": "פלס״ם", "20:00": "פלס״ם", "22:00": "פלס״ם"
        }
    },
    day2: {
        name: "שלישי, 17.3",
        order: 2,
        shifts: {
            "00:00": "פלס״ם", "02:00": "שוהם", "04:00": "אלעד", "06:00": "?", "08:00": "אביב",
            "10:00": "?", "12:00": "?", "14:00": "פלס״ם", "16:00": "פלס״ם", "18:00": "פלס״ם", "20:00": "פלס״ם", "22:00": "פלס״ם"
        }
    },
    day3: {
        name: "רביעי",
        order: 3,
        shifts: {
            "00:00": "?", "02:00": "פלס״ם", "04:00": "פלס״ם", "06:00": "פלס״ם", "08:00": "פלס״ם",
            "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "?", "16:00": "?", "18:00": "?", "20:00": "?", "22:00": "?"
        }
    },
    day4: {
        name: "חמישי",
        order: 4,
        shifts: {
            "00:00": "?", "02:00": "פלס״ם", "04:00": "פלס״ם", "06:00": "פלס״ם", "08:00": "פלס״ם",
            "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "?", "16:00": "?", "18:00": "?", "20:00": "?", "22:00": "?"
        }
    },
    day5: {
        name: "שישי",
        order: 5,
        shifts: {
            "00:00": "?", "02:00": "פלס״ם", "04:00": "פלס״ם", "06:00": "פלס״ם", "08:00": "פלס״ם",
            "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "?", "16:00": "?", "18:00": "?", "20:00": "?", "22:00": "?"
        }
    },
    day6: {
        name: "שבת",
        order: 6,
        shifts: {
            "00:00": "?", "02:00": "פלס״ם", "04:00": "פלס״ם", "06:00": "פלס״ם", "08:00": "פלס״ם",
            "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "?", "16:00": "?", "18:00": "?", "20:00": "?", "22:00": "?"
        }
    }
};

if (resetGuardsBtn) {
    resetGuardsBtn.addEventListener('click', async () => {
        if (confirm('מחיקת ושחזור הרשימה למצב המקורי, האם אתה בטוח?')) {
            await set(guardsRef, defaultGuardsData);
        }
    });
}

const timeSort = (a, b) => {
    return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
};

onValue(guardsRef, (snapshot) => {
    if (!guardsContainer) return;

    if (!snapshot.exists()) {
        set(guardsRef, defaultGuardsData);
        return;
    }

    const data = snapshot.val();
    let html = '';

    const sortedDays = Object.keys(data).sort((a, b) => (data[a].order || 0) - (data[b].order || 0));

    sortedDays.forEach(dayKey => {
        const dayInfo = data[dayKey];
        html += `<div class="guard-day">
            <h3>${dayInfo.name}</h3>
            <div class="shifts-list">`;

        const sortedTimes = Object.keys(dayInfo.shifts).sort(timeSort);
        sortedTimes.forEach(time => {
            const assignee = dayInfo.shifts[time];
            html += `<div class="shift-row">
                        <div class="shift-time">${time}</div>
                        <div class="shift-assignee">`;

            if (assignee === "פלס״ם") {
                html += `<span class="assignee-palsam">פלס״ם</span>`;
            } else if (!assignee || assignee === "?") {
                html += `<button class="assign-btn" onclick="window.assignShift('${dayKey}', '${time}')">שבץ אותי</button>`;
            } else {
                html += `<span class="assignee-name">${assignee}</span>
                         <button class="unassign-btn" onclick="window.unassignShift('${dayKey}', '${time}')" title="הסר שיבוץ"><i class="fa-solid fa-times"></i></button>`;
            }

            html += `</div></div>`;
        });
        html += `</div></div>`;
    });

    guardsContainer.innerHTML = html;
});

window.assignShift = async (dayKey, time) => {
    const savedName = localStorage.getItem('kesherAuthor');
    const name = window.prompt("הכנס שם לשמירה פה:", savedName || "");
    if (name && name.trim()) {
        localStorage.setItem('kesherAuthor', name.trim());
        const specificRef = ref(database, `guards/${dayKey}/shifts/${time}`);
        await set(specificRef, name.trim());
    }
};

window.unassignShift = async (dayKey, time) => {
    if (confirm("האם להסיר את השומר משעה זו? כולם יראו עמדה פנויה.")) {
        const specificRef = ref(database, `guards/${dayKey}/shifts/${time}`);
        await set(specificRef, "?");
    }
};
