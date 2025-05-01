let currentWeek = 1;
let daysInWeek = 7;
let reminders = {};
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const currentWeekDisplay = document.getElementById("current-week");
const calendarContainer = document.querySelector(".calendar");
const reminderModal = document.getElementById("reminder-modal");
const closeModalButton = document.getElementById("close-modal");
const saveReminderButton = document.getElementById("save-reminder");
const reminderInput = document.getElementById("reminder-input");
let selectedDay = null;

// Function to generate the days for the current week
function generateCalendar(week) {
    calendarContainer.innerHTML = ""; // Clear previous calendar

    // This will create 7 days for the week
    for (let i = 0; i < daysInWeek; i++) {
        const dayElement = document.createElement("div");
        dayElement.classList.add("day");

        // Display day number (simply using 1-7 for this example)
        const dayNumber = i + 1;
        dayElement.innerHTML = `<h4>Day ${dayNumber}</h4>`;

        const addButton = document.createElement("button");
        addButton.innerText = "Add Reminder";
        addButton.onclick = () => openReminderModal(dayNumber);

        dayElement.appendChild(addButton);
        calendarContainer.appendChild(dayElement);
    }

    currentWeekDisplay.innerText = `Week: ${week}`;
}

// Open modal to add a reminder
function openReminderModal(day) {
    selectedDay = day;
    reminderModal.style.display = "flex";
}

// Close the reminder modal
closeModalButton.onclick = () => {
    reminderModal.style.display = "none";
    reminderInput.value = "";
};

// Save the reminder
saveReminderButton.onclick = () => {
    const reminderText = reminderInput.value;
    if (reminderText) {
        reminders[selectedDay] = reminderText;
        alert(`Reminder for Day ${selectedDay}: "${reminderText}"`);
    }
    reminderModal.style.display = "none";
    reminderInput.value = "";
};

// Navigate to previous week
prevWeekButton.onclick = () => {
    if (currentWeek > 1) {
        currentWeek--;
        generateCalendar(currentWeek);
    }
};

// Navigate to next week
nextWeekButton.onclick = () => {
    currentWeek++;
    generateCalendar(currentWeek);
};

// Initialize calendar with the first week
generateCalendar(currentWeek);
