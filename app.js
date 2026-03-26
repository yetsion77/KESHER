// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref, push, serverTimestamp, set, onValue, query, remove, update, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

if (btnFaults && modalFaults) {
    btnFaults.addEventListener('click', () => modalFaults.style.display = 'block');
    closeFaults.addEventListener('click', () => modalFaults.style.display = 'none');
}

if (btnPhones && modalPhones) {
    btnPhones.addEventListener('click', () => modalPhones.style.display = 'block');
    closePhones.addEventListener('click', () => modalPhones.style.display = 'none');
}

if (btnGuards && modalGuards) {
    btnGuards.addEventListener('click', () => {
        modalGuards.style.display = 'block';
        setTimeout(() => {
            const todayEl = document.getElementById('today-guard-day');
            if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150);
    });
    closeGuards.addEventListener('click', () => modalGuards.style.display = 'none');
}

window.addEventListener('click', (e) => {
    if (e.target === modalFaults) modalFaults.style.display = 'none';
    if (e.target === modalPhones) modalPhones.style.display = 'none';
    if (e.target === modalGuards) modalGuards.style.display = 'none';
});

// Guards feature integration
const guardsRef = ref(database, 'guards');

const createShifts = (usTimes) => {
    const allTimes = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
    const shifts = {};
    for (let time of allTimes) shifts[time] = usTimes.includes(time) ? "?" : "פלס״ם";
    return shifts;
};

const pmUs = ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
const amUs = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"];

const defaultGuardsData = {
    day1: { name: "שני, 16.3", order: 1, shifts: { "00:00": "יעקב", "02:00": "רן", "04:00": "נועם", "06:00": "גיא", "08:00": "דני", "10:00": "פלס״ם", "12:00": "פלס״ם", "14:00": "פלס״ם", "16:00": "פלס״ם", "18:00": "פלס״ם", "20:00": "פלס״ם", "22:00": "פלס״ם" } },
    day2: { name: "שלישי, 17.3", order: 2, shifts: { "00:00": "פלס״ם", "02:00": "שוהם", "04:00": "אלעד", "06:00": "?", "08:00": "אביב", "10:00": "?", "12:00": "?", "14:00": "פלס״ם", "16:00": "פלס״ם", "18:00": "פלס״ם", "20:00": "פלס״ם", "22:00": "פלס״ם" } },
    day3: { name: "רביעי, 18.3", order: 3, shifts: createShifts(pmUs) },
    day4: { name: "חמישי, 19.3", order: 4, shifts: createShifts(pmUs) },
    day5: { name: "שישי, 20.3", order: 5, shifts: createShifts(pmUs) },
    day6: { name: "שבת, 21.3", order: 6, shifts: createShifts(pmUs) },
    day7: { name: "ראשון, 22.3", order: 7, shifts: createShifts(amUs) },
    day8: { name: "שני, 23.3", order: 8, shifts: createShifts(amUs) },
    day9: { name: "שלישי, 24.3", order: 9, shifts: createShifts(amUs) },
    day10: { name: "רביעי, 25.3", order: 10, shifts: createShifts(pmUs) },
    day11: { name: "חמישי, 26.3", order: 11, shifts: createShifts(pmUs) },
    day12: { name: "שישי, 27.3", order: 12, shifts: createShifts(pmUs) },
    day13: { name: "שבת, 28.3", order: 13, shifts: createShifts(pmUs) },
    day14: { name: "ראשון, 29.3", order: 14, shifts: createShifts(amUs) },
    day15: { name: "שני, 30.3", order: 15, shifts: createShifts(amUs) },
    day16: { name: "שלישי, 31.3", order: 16, shifts: createShifts(amUs) },
    day17: { name: "רביעי, 1.4", order: 17, shifts: createShifts(pmUs) },
    day18: { name: "חמישי, 2.4", order: 18, shifts: createShifts(pmUs) },
    day19: { name: "שישי, 3.4", order: 19, shifts: createShifts(pmUs) },
    day20: { name: "שבת, 4.4", order: 20, shifts: createShifts(pmUs) },
    day21: { name: "ראשון, 5.4", order: 21, shifts: createShifts(amUs) },
    day22: { name: "שני, 6.4", order: 22, shifts: createShifts(amUs) },
    day23: { name: "שלישי, 7.4", order: 23, shifts: createShifts(amUs) },
    day24: { name: "רביעי, 8.4", order: 24, shifts: createShifts(pmUs) },
    day25: { name: "חמישי, 9.4", order: 25, shifts: createShifts(pmUs) },
    day26: { name: "שישי, 10.4", order: 26, shifts: createShifts(pmUs) },
    day27: { name: "שבת, 11.4", order: 27, shifts: createShifts(pmUs) }
};

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

    // Auto-update missing days if database has already been initialized
    if (!data.day27) {
        let updates = {};
        for (let i = 3; i <= 27; i++) {
            let dk = "day" + i;
            if (!data[dk]) updates[dk] = defaultGuardsData[dk];
        }
        if (Object.keys(updates).length > 0) {
            update(guardsRef, updates);
            return; // onValue will trigger again after update
        }
    }

    const today = new Date();
    const todayStr = today.getDate() + '.' + (today.getMonth() + 1);

    // Calculate shift statistics
    const guardStats = {};
    const hardShifts = ["00:00", "02:00", "04:00", "06:00"];

    const nameMap = {
        "גאי": "גיא",
        "גאי זך": "גיא",
        "שהם": "שוהם",
        "סאסי": "נועם",
        "יסן": "נועם",
        "יעקב": "ינון"
    };

    Object.keys(data).forEach(dayKey => {
        const dayInfo = data[dayKey];
        if (dayInfo && dayInfo.shifts) {
            Object.keys(dayInfo.shifts).forEach(time => {
                let assignee = dayInfo.shifts[time];
                if (assignee && assignee !== "?" && assignee !== "פלס״ם") {
                    assignee = assignee.trim();
                    if (nameMap[assignee]) {
                        assignee = nameMap[assignee];
                    }
                    if (!guardStats[assignee]) {
                        guardStats[assignee] = { total: 0, hard: 0 };
                    }
                    guardStats[assignee].total++;
                    if (hardShifts.includes(time)) {
                        guardStats[assignee].hard++;
                    }
                }
            });
        }
    });

    let html = '';
    const sortedGuards = Object.keys(guardStats).sort((a, b) => guardStats[b].total - guardStats[a].total);

    if (sortedGuards.length > 0) {
        html += `<div class="guards-summary-box">
            <h4><i class="fa-solid fa-chart-pie"></i> סיכום שמירות</h4>
            <div class="summary-grid">`;

        sortedGuards.forEach(g => {
            const s = guardStats[g];
            html += `<div class="summary-item">
                <span class="summary-name">${g}</span>
                <span class="summary-stats">סה״כ: ${s.total} <span class="hard-shifts" title="חצות עד שמונה בבוקר">(לילה: ${s.hard})</span></span>
            </div>`;
        });
        html += `</div></div>`;
    }

    const sortedDays = Object.keys(data).sort((a, b) => (data[a].order || 0) - (data[b].order || 0));

    sortedDays.forEach(dayKey => {
        const dayInfo = data[dayKey];
        const isToday = dayInfo.name && dayInfo.name.includes(todayStr);
        const dayClass = isToday ? 'guard-day current-day-highlight' : 'guard-day';
        const dayId = isToday ? ' id="today-guard-day"' : '';
        const badgeHtml = isToday ? '<span class="current-day-badge">היום</span>' : '';

        html += `<div class="${dayClass}"${dayId}>
            <h3>${dayInfo.name} ${badgeHtml}</h3>
            <div class="shifts-list">`;

        const sortedTimes = Object.keys(dayInfo.shifts).sort(timeSort);
        sortedTimes.forEach(time => {
            const assignee = dayInfo.shifts[time];
            html += `<div class="shift-row">
                        <div class="shift-time">${time}</div>
                        <div class="shift-assignee">`;

            if (assignee === "פלס״ם") {
                html += `<span class="assignee-palsam" style="cursor:help;" onclick="window.togglePalsam('${dayKey}', '${time}', '${assignee}')" title="לחיצה תשנה חזרה לעמדה שלנו">פלס״ם</span>`;
            } else if (!assignee || assignee === "?") {
                html += `<button class="unassign-btn" style="opacity:0.3; font-size: 0.8em;" onclick="window.togglePalsam('${dayKey}', '${time}', '?')" title="העבר לשמירת פלס״ם"><i class="fa-solid fa-right-left"></i></button>
                         <button class="assign-btn" onclick="window.assignShift('${dayKey}', '${time}')">פנוי</button>`;
            } else {
                html += `<button class="unassign-btn" style="opacity:0.3; font-size: 0.8em;" onclick="window.togglePalsam('${dayKey}', '${time}', '${assignee}')" title="העבר לשמירת פלס״ם (ימחק את השם)"><i class="fa-solid fa-right-left"></i></button>
                         <span class="assignee-name">${assignee}</span>
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

window.togglePalsam = async (dayKey, time, currentAssignee) => {
    let newState = "";
    if (currentAssignee === "פלס״ם") {
        if (!confirm("להפוך זמן זה משמירת פלס״ם לשמירה פנויה שלנו?")) return;
        newState = "?";
    } else {
        if (!confirm("להעביר שמירה זו (כולל מי ששובץ) לאחריות פלס״ם?")) return;
        newState = "פלס״ם";
    }
    const specificRef = ref(database, `guards/${dayKey}/shifts/${time}`);
    await set(specificRef, newState);
};

// --- Custom Faults Logic ---
const customFaultsRef = ref(database, 'custom_faults');
const addFaultForm = document.getElementById('add-fault-form');
const faultListContainer = document.getElementById('fault-list-container');
const submitFaultBtn = document.getElementById('submit-fault-btn');

let staticFaultsHTML = '';
if (faultListContainer) {
    staticFaultsHTML = faultListContainer.innerHTML;
}

if (addFaultForm) {
    addFaultForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-fault-title').value.trim();
        const solution = document.getElementById('new-fault-solution').value.trim();
        
        if (!title || !solution) return;
        
        try {
            submitFaultBtn.disabled = true;
            const originalHtml = submitFaultBtn.innerHTML;
            submitFaultBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>שומר...</span>';
            
            const newFaultRef = push(customFaultsRef);
            await set(newFaultRef, {
                title: title,
                solution: solution,
                timestamp: serverTimestamp()
            });
            
            document.getElementById('new-fault-title').value = '';
            document.getElementById('new-fault-solution').value = '';
            
            submitFaultBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>נוסף בהצלחה</span>';
            submitFaultBtn.style.background = 'linear-gradient(135deg, var(--success-color), #00b35c)';
            
            setTimeout(() => {
                submitFaultBtn.disabled = false;
                submitFaultBtn.innerHTML = '<span>הוסף פתרון למאגר</span> <i class="fa-solid fa-plus-circle"></i>';
                submitFaultBtn.style.background = '';
            }, 2000);
            
        } catch (error) {
            console.error("Error adding fault: ", error);
            alert("אירעה שגיאה בשמירת התקלה. אנא נסה שוב.");
            submitFaultBtn.disabled = false;
            submitFaultBtn.innerHTML = '<span>הוסף פתרון למאגר</span> <i class="fa-solid fa-plus-circle"></i>';
        }
    });
}

onValue(customFaultsRef, (snapshot) => {
    if (!faultListContainer) return;

    // Helper to escape HTML safely
    const escapeCustomHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // Reset to static faults first
    faultListContainer.innerHTML = staticFaultsHTML;
    
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const id = childSnapshot.key;
            const fault = childSnapshot.val();
            
            const li = document.createElement('li');
            li.style.position = 'relative'; 
            
            const titleHtml = `<strong>${escapeCustomHTML(fault.title)}:</strong>`;
            let solutionHtml = '';
            const lines = (fault.solution || '').split('\\n').filter(line => line.trim() !== '');
            
            if (lines.length > 1) {
                solutionHtml = '<ol>' + lines.map(line => `<li>${escapeCustomHTML(line)}</li>`).join('') + '</ol>';
            } else {
                solutionHtml = ` ${escapeCustomHTML(lines[0] || '')}`;
            }
            
            li.innerHTML = `
                ${titleHtml}${solutionHtml}
                <button class="delete-custom-fault-btn" data-id="${id}" title="מחק תקלה זו" style="position:absolute; left:-10px; top:0; background:none; border:none; color:#ff5252; cursor:pointer; font-size:1.1em; opacity:0.7;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            
            // Add hover effect
            li.addEventListener('mouseenter', () => {
                const btn = li.querySelector('.delete-custom-fault-btn');
                if (btn) btn.style.opacity = '1';
            });
            li.addEventListener('mouseleave', () => {
                const btn = li.querySelector('.delete-custom-fault-btn');
                if (btn) btn.style.opacity = '0.7';
            });
            
            const deleteBtn = li.querySelector('.delete-custom-fault-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('האם אתה בטוח שברצונך למחוק תקלה זו מהמאגר?')) {
                        try {
                            const refToDelete = ref(database, 'custom_faults/' + id);
                            await remove(refToDelete);
                        } catch(err) {
                            console.error("Error deleting fault", err);
                            alert("שגיאה במחיקת תקלה");
                        }
                    }
                });
            }
            
            faultListContainer.appendChild(li);
        });
    }
});
