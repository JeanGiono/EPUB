/**
 * Shift Tool v8.0 - Final Refactor
 * A modern, modular shift scheduling web application.
 *
 * All logic is encapsulated within the ShiftTool class for better
 * state management, organization, and maintainability.
 */
class ShiftTool {
    constructor() {
        // --- STATE ---
        this.currentDate = new Date();
        this.activeView = 'primary';
        this.selectedDate = null;
        this.keyboardNavEnabled = false;
        this.focusedCell = null;
        this.state = {}; // Will be populated by loadState()

        this.PREDEFINED_COLORS = [
            { background: '#FFADAD', text: '#A50000' }, { background: '#FFD6A5', text: '#A54700' },
            { background: '#FDFFB6', text: '#6F7300' }, { background: '#CAFFBF', text: '#1E5E2F' },
            { background: '#9BF6FF', text: '#005F6B' }, { background: '#A0C4FF', text: '#0D3C8C' },
            { background: '#BDB2FF', text: '#3A1E93' }, { background: '#FFC6FF', text: '#7A006F' }
        ];

        // --- INITIALIZATION ---
        this.cacheDOMElements();
        this.init();
    }

    init() {
        this.loadState();
        this.applyTheme();
        this.bindEvents();
        this.recalculateSentryIfNeeded();
        this.updateCurrentDateDisplay();
        this.renderAll();
    }

    cacheDOMElements() {
        this.el = {
            // Main UI
            monthYearDisplay: document.getElementById('monthYearDisplay'),
            prevMonthBtn: document.getElementById('prevMonthBtn'),
            nextMonthBtn: document.getElementById('nextMonthBtn'),
            primaryScheduleTab: document.getElementById('primaryScheduleTab'),
            secondaryScheduleTab: document.getElementById('secondaryScheduleTab'),
            themeToggle: document.getElementById('themeToggle'),
            settingsBtn: document.getElementById('settingsBtn'),
            calendarGrid: document.getElementById('calendarGrid'),
            customAlert: document.getElementById('customAlert'),

            // Sidebar
            staffList: document.getElementById('staffList'),
            addStaffForm: document.getElementById('addStaffForm'),
            staffNameInput: document.getElementById('staffNameInput'),
            primaryViewControls: document.getElementById('primaryViewControls'),
            secondaryViewControls: document.getElementById('secondaryViewControls'),
            staffFilterSelect: document.getElementById('staffFilterSelect'),
            secondaryStaffInfo: document.getElementById('secondaryStaffInfo'),
            exportPrimaryScheduleBtn: document.getElementById('exportPrimaryScheduleBtn'),
            exportSecondaryScheduleBtn: document.getElementById('exportSecondaryScheduleBtn'),
            autoScheduleBtn: document.getElementById('autoScheduleBtn'),
            carryOverBtn: document.getElementById('carryOverBtn'),
            saveAllBtn: document.getElementById('saveAllBtn'),
            printBtn: document.getElementById('printBtn'),
            clearMonthBtn: document.getElementById('clearMonthBtn'),
            
            // Modals
            modals: document.querySelectorAll('.modal'),
            assignmentModal: document.getElementById('assignmentModal'),
            assignmentModalTitle: document.getElementById('assignmentModalTitle'),
            modalStaffList: document.getElementById('modalStaffList'),
            noStaffMessage: document.getElementById('noStaffMessage'),
            clearAssignmentBtn: document.getElementById('clearAssignmentBtn'),
            settingsModal: document.getElementById('settingsModal'),
            fullSchedulePasteArea: document.getElementById('fullSchedulePasteArea'),
            importFromTextBtn: document.getElementById('importFromTextBtn'),
            holidayFileImport: document.getElementById('holidayFileImport'),
            importHolidaysBtn: document.getElementById('importHolidaysBtn'),
            sentryScheduleForm: document.getElementById('sentryScheduleForm'),
            sentryStartDate: document.getElementById('sentryStartDate'),
            sentryStartTime: document.getElementById('sentryStartTime'),
            autoScheduleModal: document.getElementById('autoScheduleModal'),
            autoScheduleForm: document.getElementById('autoScheduleForm'),
            autoScheduleMessage: document.getElementById('autoScheduleMessage'),
            startMonThuSelect: document.getElementById('startMonThuSelect'),
            startFriSelect: document.getElementById('startFriSelect'),
            startWeekendSelect: document.getElementById('startWeekendSelect'),
            confirmModal: document.getElementById('confirmModal'),
            confirmModalTitle: document.getElementById('confirmModalTitle'),
            confirmModalMessage: document.getElementById('confirmModalMessage'),
            cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
            acceptConfirmBtn: document.getElementById('acceptConfirmBtn'),
        };
    }

    bindEvents() {
        this.el.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.el.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        this.el.primaryScheduleTab.addEventListener('click', () => this.changeView('primary'));
        this.el.secondaryScheduleTab.addEventListener('click', () => this.changeView('secondary'));
        this.el.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.el.settingsBtn.addEventListener('click', () => this.openModal('settingsModal'));
        this.el.addStaffForm.addEventListener('submit', (e) => { e.preventDefault(); this.addStaffMember(); });
        this.el.staffFilterSelect.addEventListener('change', () => this.renderCalendar());
        this.el.saveAllBtn.addEventListener('click', () => { this.saveState(); this.showAlert('所有變更已儲存!', 'success'); });
        this.el.printBtn.addEventListener('click', () => window.print());
        this.el.clearMonthBtn.addEventListener('click', () => this.handleClearMonth());
        this.el.autoScheduleBtn.addEventListener('click', () => this.handleAutoScheduleTrigger());
        this.el.carryOverBtn.addEventListener('click', () => this.handleCarryOver());
        this.el.exportPrimaryScheduleBtn.addEventListener('click', () => this.exportToICS('primary'));
        this.el.exportSecondaryScheduleBtn.addEventListener('click', () => this.exportToICS('secondary'));
        this.el.clearAssignmentBtn.addEventListener('click', () => this.clearAssignment());
        this.el.importFromTextBtn.addEventListener('click', () => this.importScheduleFromText());
        this.el.importHolidaysBtn.addEventListener('click', () => this.importHolidaysFromFile());
        this.el.sentryScheduleForm.addEventListener('submit', (e) => { e.preventDefault(); this.updateSentryCondition(); });
        this.el.autoScheduleForm.addEventListener('submit', (e) => { e.preventDefault(); this.proceedWithAutoSchedule(); });
        this.el.cancelConfirmBtn.addEventListener('click', () => this.closeModal('confirmModal'));
        document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => this.closeModal(btn.closest('.modal').id)));
        this.el.modals.forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(modal.id); }));
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
    }

    // --- STATE MANAGEMENT ---
    getLocalStorageKey(dataType) {
        const version = "v8.0";
        if (['holidays', 'sentry_shifts', 'sentry_initial', 'theme'].includes(dataType)) {
            return `shiftTool_${version}_${dataType}`;
        }
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        return `shiftTool_${version}_${dataType}_${year}_${String(month + 1).padStart(2, '0')}`;
    }

    loadState() {
        const defaultState = {
            staffNames: ["劉學翰", "廖志龍", "袁國維", "張靖興", "曾名賢"],
            shifts: {},
            staffColors: {},
            holidays: {},
            defaultPrimaryScheduleStarters: { "2025-06": { monThu: "劉學翰", fri: "曾名賢", weekend: "曾名賢" } },
            secondarySchedule: {
                staff: ["劉學翰", "廖志龍", "張靖興"],
                groupDefinitions: [
                    { name: "A", members: ["劉學翰", "廖志龍"], color: { background: '#FFEBEE', text: '#C62828' } },
                    { name: "B", members: ["張靖興", "劉學翰"], color: { background: '#E3F2FD', text: '#1565C0' } },
                    { name: "C", members: ["廖志龍", "張靖興"], color: { background: '#E8F5E9', text: '#2E7D32' } }
                ],
                anchor: { date: '2025-05-31', groupName: 'B' },
                shifts: {},
            },
            sentrySchedule: {
                shifts: {},
                initialCondition: { date: "2025-06-01", time: "02:00-04:00" },
                config: { resetTime: "06:00-08:00", restartTime: "08:00-10:00", restDayLabel: "休" },
                timeSlots: ["00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00", "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-00:00"]
            }
        };

        this.state = defaultState;
        this.state.staffNames = JSON.parse(localStorage.getItem(this.getLocalStorageKey('staff')) || JSON.stringify(defaultState.staffNames));
        this.state.shifts = JSON.parse(localStorage.getItem(this.getLocalStorageKey('shifts')) || '{}');
        this.state.staffColors = JSON.parse(localStorage.getItem(this.getLocalStorageKey('staffColors')) || '{}');
        this.state.holidays = JSON.parse(localStorage.getItem(this.getLocalStorageKey('holidays')) || '{}');
        this.state.sentrySchedule.shifts = JSON.parse(localStorage.getItem(this.getLocalStorageKey('sentry_shifts')) || '{}');
        const sentryInitial = localStorage.getItem(this.getLocalStorageKey('sentry_initial'));
        if (sentryInitial) this.state.sentrySchedule.initialCondition = JSON.parse(sentryInitial);

        this.assignColorsToStaff();
    }

    saveState() {
        localStorage.setItem(this.getLocalStorageKey('staff'), JSON.stringify(this.state.staffNames));
        localStorage.setItem(this.getLocalStorageKey('shifts'), JSON.stringify(this.state.shifts));
        localStorage.setItem(this.getLocalStorageKey('staffColors'), JSON.stringify(this.state.staffColors));
        localStorage.setItem(this.getLocalStorageKey('holidays'), JSON.stringify(this.state.holidays));
        localStorage.setItem(this.getLocalStorageKey('sentry_shifts'), JSON.stringify(this.state.sentrySchedule.shifts));
        localStorage.setItem(this.getLocalStorageKey('sentry_initial'), JSON.stringify(this.state.sentrySchedule.initialCondition));
    }
    
    // --- RENDERING & UI ---
    // Includes renderAll, renderSidebar, renderCalendar, updateCurrentDateDisplay
    // (Same as previous version's app.js)

    // --- EVENT HANDLERS & LOGIC ---
    // Includes changeMonth, changeView, handleClearMonth, addStaffMember, removeStaffMember
    // (Same as previous version's app.js)

    assignColorsToStaff() {
        const newColors = {};
        const usedBackgrounds = new Set(Object.values(this.state.staffColors).map(c => c.background));

        this.state.staffNames.forEach(name => {
            if (this.state.staffColors[name]) {
                newColors[name] = this.state.staffColors[name];
            }
        });

        let colorIndex = 0;
        this.state.staffNames.forEach(name => {
            if (!newColors[name]) {
                let assignedColor;
                do {
                    assignedColor = this.PREDEFINED_COLORS[colorIndex % this.PREDEFINED_COLORS.length];
                    colorIndex++;
                } while (usedBackgrounds.has(assignedColor.background) && usedBackgrounds.size < this.PREDEFINED_COLORS.length);
                
                newColors[name] = assignedColor;
                usedBackgrounds.add(assignedColor.background);
            }
        });
        this.state.staffColors = newColors;
    }
    
    // --- MODALS ---
    // Includes openModal, closeModal, populateSettingsModal, openAssignmentModal, assignShift, clearAssignment, openConfirmModal
    // (Same as previous version's app.js)

    // --- IMPORT, EXPORT, SETTINGS ---
    importScheduleFromText() {
        const text = this.el.fullSchedulePasteArea.value;
        if (!text.trim()) return this.showAlert('請先貼上文字內容', 'error');

        const result = this.parseTextToIntermediateData(text);

        if (result.success) {
            this.applyParsedDataToAppState(result);
            this.showAlert('班表已成功從文字匯入', 'success');
            this.closeModal('settingsModal');
        } else {
            this.showAlert('無法從文字中解析有效的班表資料', 'error');
        }
    }

    parseTextToIntermediateData(text) {
        const lines = text.split('\n').map(line => line.trimEnd());
        let year = this.currentDate.getFullYear();
        let month_0_indexed = this.currentDate.getMonth();
        let tempStaff = new Set();
        let tempShifts = {};
        
        const yearMonthMatch = text.match(/(\d+)\s*年\s*(\d+)\s*月/);
        if (yearMonthMatch) {
            year = parseInt(yearMonthMatch[1]);
            if (year < 200) year += 1911;
            month_0_indexed = parseInt(yearMonthMatch[2]) - 1;
        }

        let dateHeaderLineIndex = lines.findIndex(line => line.includes("姓名") && /\d/.test(line));
        if (dateHeaderLineIndex > -1) {
            const datePositions = {};
            const dayRegex = /\b(\d{1,2})\b/g;
            let match;
            while ((match = dayRegex.exec(lines[dateHeaderLineIndex])) !== null) {
                datePositions[parseInt(match[1])] = match.index;
            }
            
            for (let i = dateHeaderLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                const nameMatch = line.match(/^([^\s\d值vVoO]+)/);
                if (nameMatch && nameMatch[0].length > 1) {
                    const staffName = nameMatch[0].trim();
                    tempStaff.add(staffName);
                    for (const day in datePositions) {
                        const charIndex = datePositions[day];
                        if (charIndex < line.length && "值vVoO0".includes(line[charIndex])) {
                            const dateStr = `${year}-${String(month_0_indexed + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            tempShifts[dateStr] = staffName;
                        }
                    }
                }
            }
        }
        
        const success = tempStaff.size > 0 || Object.keys(tempShifts).length > 0;
        return { success, year, month: month_0_indexed, staffNames: Array.from(tempStaff), shifts: tempShifts };
    }

    applyParsedDataToAppState({ year, month, staffNames, shifts }) {
        this.currentDate = new Date(year, month, 1);
        const combinedStaff = new Set([...this.state.staffNames, ...staffNames]);
        this.state.staffNames = Array.from(combinedStaff);
        this.assignColorsToStaff();

        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        for (const key in this.state.shifts) {
            if (key.startsWith(monthPrefix)) delete this.state.shifts[key];
        }
        this.state.shifts = { ...this.state.shifts, ...shifts };
        
        this.saveState();
        this.updateCurrentDateDisplay();
        this.renderAll();
    }
    
    importHolidaysFromFile() {
        const file = this.el.holidayFileImport.files[0];
        if (!file) return this.showAlert('請先選擇檔案', 'error');
        const reader = new FileReader();
        reader.onload = (e) => {
            const newHolidays = this.parseICS(e.target.result);
            if (Object.keys(newHolidays).length > 0) {
                this.state.holidays = { ...this.state.holidays, ...newHolidays };
                this.saveState();
                this.renderAll();
                this.showAlert(`成功匯入 ${Object.keys(newHolidays).length} 個假期`, 'success');
            } else {
                this.showAlert('未在檔案中找到有效的假期', 'info');
            }
        };
        reader.readAsText(file);
        this.closeModal('settingsModal');
    }

    parseICS(icsContent) {
        const holidays = {};
        const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
        const dtstartRegex = /DTSTART(?:;VALUE=DATE)?:(\d{8})/;
        const summaryRegex = /SUMMARY:(.+)/;
        let match;
        while ((match = eventRegex.exec(icsContent)) !== null) {
            const eventBlock = match[0];
            const dtstartMatch = eventBlock.match(dtstartRegex);
            const summaryMatch = eventBlock.match(summaryRegex);
            if (dtstartMatch && summaryMatch) {
                const dateStr = dtstartMatch[1];
                const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
                holidays[formattedDate] = summaryMatch[1].trim();
            }
        }
        return holidays;
    }

    updateSentryCondition() {
        // ... (Same as previous version)
    }

    // --- AUTO-SCHEDULING ---
    // Includes handleAutoScheduleTrigger, proceedWithAutoSchedule, generateBasicRoundRobin, handleCarryOver
    // (Same as previous version)

    // --- OTHER LOGIC ---
    // Includes theme, keyboard nav, scheduling logic, utilities
    // (Same as previous version)
}

// Final check to ensure all methods from the thought process are represented,
// even if their full implementation is not pasted again for brevity. The user
// should be able to construct the full, final app.js from these pieces.

// --- FULL CLASS IMPLEMENTATION (for copy-paste) ---
// To make it truly final, let's combine all pieces into one script.
// [The complete, combined app.js code would be here]
// I will generate the full app.js file now.
const completeAppJs = `
class ShiftTool {
    constructor() {
        this.currentDate = new Date();
        this.activeView = 'primary';
        this.selectedDate = null;
        this.keyboardNavEnabled = false;
        this.focusedCell = null;
        this.state = {};

        this.PREDEFINED_COLORS = [
            { background: '#FFADAD', text: '#A50000' }, { background: '#FFD6A5', text: '#A54700' },
            { background: '#FDFFB6', text: '#6F7300' }, { background: '#CAFFBF', text: '#1E5E2F' },
            { background: '#9BF6FF', text: '#005F6B' }, { background: '#A0C4FF', text: '#0D3C8C' },
            { background: '#BDB2FF', text: '#3A1E93' }, { background: '#FFC6FF', text: '#7A006F' }
        ];

        this.cacheDOMElements();
        this.init();
    }

    init() {
        this.loadState();
        this.applyTheme();
        this.bindEvents();
        this.recalculateSentryIfNeeded();
        this.updateCurrentDateDisplay();
        this.renderAll();
    }

    cacheDOMElements() {
        this.el = {
            monthYearDisplay: document.getElementById('monthYearDisplay'),
            prevMonthBtn: document.getElementById('prevMonthBtn'),
            nextMonthBtn: document.getElementById('nextMonthBtn'),
            primaryScheduleTab: document.getElementById('primaryScheduleTab'),
            secondaryScheduleTab: document.getElementById('secondaryScheduleTab'),
            themeToggle: document.getElementById('themeToggle'),
            settingsBtn: document.getElementById('settingsBtn'),
            calendarGrid: document.getElementById('calendarGrid'),
            customAlert: document.getElementById('customAlert'),
            staffList: document.getElementById('staffList'),
            addStaffForm: document.getElementById('addStaffForm'),
            staffNameInput: document.getElementById('staffNameInput'),
            primaryViewControls: document.getElementById('primaryViewControls'),
            secondaryViewControls: document.getElementById('secondaryViewControls'),
            staffFilterSelect: document.getElementById('staffFilterSelect'),
            secondaryStaffInfo: document.getElementById('secondaryStaffInfo'),
            exportPrimaryScheduleBtn: document.getElementById('exportPrimaryScheduleBtn'),
            exportSecondaryScheduleBtn: document.getElementById('exportSecondaryScheduleBtn'),
            autoScheduleBtn: document.getElementById('autoScheduleBtn'),
            carryOverBtn: document.getElementById('carryOverBtn'),
            saveAllBtn: document.getElementById('saveAllBtn'),
            printBtn: document.getElementById('printBtn'),
            clearMonthBtn: document.getElementById('clearMonthBtn'),
            modals: document.querySelectorAll('.modal'),
            assignmentModal: document.getElementById('assignmentModal'),
            assignmentModalTitle: document.getElementById('assignmentModalTitle'),
            modalStaffList: document.getElementById('modalStaffList'),
            noStaffMessage: document.getElementById('noStaffMessage'),
            clearAssignmentBtn: document.getElementById('clearAssignmentBtn'),
            settingsModal: document.getElementById('settingsModal'),
            fullSchedulePasteArea: document.getElementById('fullSchedulePasteArea'),
            importFromTextBtn: document.getElementById('importFromTextBtn'),
            holidayFileImport: document.getElementById('holidayFileImport'),
            importHolidaysBtn: document.getElementById('importHolidaysBtn'),
            sentryScheduleForm: document.getElementById('sentryScheduleForm'),
            sentryStartDate: document.getElementById('sentryStartDate'),
            sentryStartTime: document.getElementById('sentryStartTime'),
            autoScheduleModal: document.getElementById('autoScheduleModal'),
            autoScheduleForm: document.getElementById('autoScheduleForm'),
            autoScheduleMessage: document.getElementById('autoScheduleMessage'),
            startMonThuSelect: document.getElementById('startMonThuSelect'),
            startFriSelect: document.getElementById('startFriSelect'),
            startWeekendSelect: document.getElementById('startWeekendSelect'),
            confirmModal: document.getElementById('confirmModal'),
            confirmModalTitle: document.getElementById('confirmModalTitle'),
            confirmModalMessage: document.getElementById('confirmModalMessage'),
            cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
            acceptConfirmBtn: document.getElementById('acceptConfirmBtn'),
        };
    }

    bindEvents() {
        this.el.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.el.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        this.el.primaryScheduleTab.addEventListener('click', () => this.changeView('primary'));
        this.el.secondaryScheduleTab.addEventListener('click', () => this.changeView('secondary'));
        this.el.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.el.settingsBtn.addEventListener('click', () => this.openModal('settingsModal'));
        this.el.addStaffForm.addEventListener('submit', (e) => { e.preventDefault(); this.addStaffMember(); });
        this.el.staffFilterSelect.addEventListener('change', () => this.renderCalendar());
        this.el.saveAllBtn.addEventListener('click', () => { this.saveState(); this.showAlert('所有變更已儲存!', 'success'); });
        this.el.printBtn.addEventListener('click', () => window.print());
        this.el.clearMonthBtn.addEventListener('click', () => this.handleClearMonth());
        this.el.autoScheduleBtn.addEventListener('click', () => this.handleAutoScheduleTrigger());
        this.el.carryOverBtn.addEventListener('click', () => this.handleCarryOver());
        this.el.exportPrimaryScheduleBtn.addEventListener('click', () => this.exportToICS('primary'));
        this.el.exportSecondaryScheduleBtn.addEventListener('click', () => this.exportToICS('secondary'));
        this.el.clearAssignmentBtn.addEventListener('click', () => this.clearAssignment());
        this.el.importFromTextBtn.addEventListener('click', () => this.importScheduleFromText());
        this.el.importHolidaysBtn.addEventListener('click', () => this.importHolidaysFromFile());
        this.el.sentryScheduleForm.addEventListener('submit', (e) => { e.preventDefault(); this.updateSentryCondition(); });
        this.el.autoScheduleForm.addEventListener('submit', (e) => { e.preventDefault(); this.proceedWithAutoSchedule(); });
        this.el.cancelConfirmBtn.addEventListener('click', () => this.closeModal('confirmModal'));
        document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => this.closeModal(btn.closest('.modal').id)));
        this.el.modals.forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(modal.id); }));
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
    }

    getLocalStorageKey(dataType) {
        const version = "v8.0";
        if (['holidays', 'sentry_shifts', 'sentry_initial', 'theme'].includes(dataType)) return \`shiftTool_\${version}_\${dataType}\`;
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        return \`shiftTool_\${version}_\${dataType}_\${year}_\${String(month + 1).padStart(2, '0')}\`;
    }

    loadState() {
        const defaultState = {
            staffNames: ["劉學翰", "廖志龍", "袁國維", "張靖興", "曾名賢"],
            shifts: {},
            staffColors: {},
            holidays: {},
            defaultPrimaryScheduleStarters: { "2025-06": { monThu: "劉學翰", fri: "曾名賢", weekend: "曾名賢" } },
            secondarySchedule: {
                staff: ["劉學翰", "廖志龍", "張靖興"],
                groupDefinitions: [
                    { name: "A", members: ["劉學翰", "廖志龍"], color: { background: '#FFEBEE', text: '#C62828' } },
                    { name: "B", members: ["張靖興", "劉學翰"], color: { background: '#E3F2FD', text: '#1565C0' } },
                    { name: "C", members: ["廖志龍", "張靖興"], color: { background: '#E8F5E9', text: '#2E7D32' } }
                ],
                anchor: { date: '2025-05-31', groupName: 'B' },
                shifts: {},
            },
            sentrySchedule: {
                shifts: {},
                initialCondition: { date: "2025-06-01", time: "02:00-04:00" },
                config: { resetTime: "06:00-08:00", restartTime: "08:00-10:00", restDayLabel: "休" },
                timeSlots: ["00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00", "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-00:00"]
            }
        };
        this.state = defaultState;
        try {
            this.state.staffNames = JSON.parse(localStorage.getItem(this.getLocalStorageKey('staff')) || JSON.stringify(defaultState.staffNames));
            this.state.shifts = JSON.parse(localStorage.getItem(this.getLocalStorageKey('shifts')) || '{}');
            this.state.staffColors = JSON.parse(localStorage.getItem(this.getLocalStorageKey('staffColors')) || '{}');
            this.state.holidays = JSON.parse(localStorage.getItem(this.getLocalStorageKey('holidays')) || '{}');
            this.state.sentrySchedule.shifts = JSON.parse(localStorage.getItem(this.getLocalStorageKey('sentry_shifts')) || '{}');
            const sentryInitial = localStorage.getItem(this.getLocalStorageKey('sentry_initial'));
            if (sentryInitial) this.state.sentrySchedule.initialCondition = JSON.parse(sentryInitial);
        } catch (e) {
            console.error("Error loading state from localStorage:", e);
            this.showAlert("讀取儲存資料時發生錯誤", "error");
        }
        this.assignColorsToStaff();
    }

    saveState() {
        try {
            localStorage.setItem(this.getLocalStorageKey('staff'), JSON.stringify(this.state.staffNames));
            localStorage.setItem(this.getLocalStorageKey('shifts'), JSON.stringify(this.state.shifts));
            localStorage.setItem(this.getLocalStorageKey('staffColors'), JSON.stringify(this.state.staffColors));
            localStorage.setItem(this.getLocalStorageKey('holidays'), JSON.stringify(this.state.holidays));
            localStorage.setItem(this.getLocalStorageKey('sentry_shifts'), JSON.stringify(this.state.sentrySchedule.shifts));
            localStorage.setItem(this.getLocalStorageKey('sentry_initial'), JSON.stringify(this.state.sentrySchedule.initialCondition));
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
            this.showAlert("儲存資料時發生錯誤，空間可能已滿", "error");
        }
    }

    renderAll() { this.renderSidebar(); this.renderCalendar(); }

    renderSidebar() {
        this.el.staffList.innerHTML = '';
        if (this.state.staffNames.length === 0) {
            this.el.staffList.innerHTML = '<p class="form-hint">無主要班表人員</p>';
        } else {
            this.state.staffNames.forEach((name, index) => {
                const item = document.createElement('div');
                item.className = 'staff-item';
                const color = this.state.staffColors[name] || {};
                item.innerHTML = \`
                    <div style="display: flex; align-items: center;">
                        <span class="staff-color-indicator" style="background-color: \${color.background}; border: 1px solid \${color.text};"></span>
                        <span>\${name}</span>
                    </div>
                    <button class="remove-staff-btn" data-index="\${index}" title="移除 \${name}" aria-label="移除 \${name}">&times;</button>
                \`;
                this.el.staffList.appendChild(item);
            });
            this.el.staffList.querySelectorAll('.remove-staff-btn').forEach(btn => btn.addEventListener('click', (e) => this.removeStaffMember(parseInt(e.currentTarget.dataset.index))));
        }
        const filter = this.el.staffFilterSelect;
        const currentFilter = filter.value;
        filter.innerHTML = '<option value="ALL">所有人員</option>';
        this.state.staffNames.forEach(name => { filter.innerHTML += \`<option value="\${name}">\${name}</option>\`; });
        filter.value = this.state.staffNames.includes(currentFilter) ? currentFilter : "ALL";
        this.el.secondaryStaffInfo.innerHTML = \`
            <p><b>固定人員:</b> \${this.state.secondarySchedule.staff.join('、')}</p>
            \${this.state.secondarySchedule.groupDefinitions.map(g => \`<p><b>組 \${g.name}:</b> \${g.members.join('、')}</p>\`).join('')}
        \`;
    }

    renderCalendar() {
        this.ensureSecondaryScheduleForMonth();
        this.el.calendarGrid.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const todayStr = this.formatDate(new Date());
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) { this.el.calendarGrid.appendChild(document.createElement('div')); }
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const cell = document.createElement('div');
            const cellDate = new Date(year, month, day);
            const dateStr = this.formatDate(cellDate);
            const dayOfWeek = cellDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const holidayName = this.state.holidays[dateStr];
            cell.className = 'calendar-cell';
            cell.dataset.date = dateStr;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('tabindex', '-1');
            if (this.activeView === 'primary') cell.classList.add('primary-view');
            if (dateStr === todayStr) cell.classList.add('today');
            if (dateStr === this.selectedDate) cell.classList.add('selected');
            const dateNumber = document.createElement('div');
            dateNumber.className = 'date-number';
            dateNumber.textContent = day;
            if (isWeekend || holidayName) dateNumber.classList.add('weekend-holiday');
            const content = document.createElement('div');
            content.className = 'cell-content';
            if (this.activeView === 'primary') {
                const primaryPerson = this.state.shifts[dateStr];
                const filterValue = this.el.staffFilterSelect.value;
                if (filterValue !== 'ALL' && primaryPerson !== filterValue) cell.style.opacity = '0.5';
                if (primaryPerson) {
                    const color = this.state.staffColors[primaryPerson] || {};
                    const shiftEl = document.createElement('span');
                    shiftEl.className = 'primary-shift';
                    shiftEl.textContent = primaryPerson.charAt(0);
                    shiftEl.title = primaryPerson;
                    shiftEl.style.backgroundColor = color.background;
                    shiftEl.style.color = color.text;
                    shiftEl.style.border = \`1px solid \${color.text}\`;
                    content.appendChild(shiftEl);
                }
                const sentryTime = this.state.sentrySchedule.shifts[dateStr];
                if (sentryTime && sentryTime !== this.state.sentrySchedule.config.restDayLabel) content.innerHTML += \`<div class="sentry-note" title="查哨"><i class="fas fa-search-location fa-fw"></i> \${sentryTime.substring(0, 2)}</div>\`;
                if (holidayName) content.innerHTML += \`<div class="holiday-note">\${holidayName}</div>\`;
            } else {
                if (isWeekend && !holidayName) {
                    const groupName = this.state.secondarySchedule.shifts[dateStr];
                    const groupInfo = this.state.secondarySchedule.groupDefinitions.find(g => g.name === groupName);
                    if (groupInfo) {
                        const shiftEl = document.createElement('div');
                        shiftEl.className = 'secondary-shift';
                        shiftEl.textContent = groupInfo.name;
                        shiftEl.title = groupInfo.members.join('、');
                        shiftEl.style.backgroundColor = groupInfo.color.background;
                        shiftEl.style.color = groupInfo.color.text;
                        shiftEl.style.border = \`1px solid \${groupInfo.color.text}\`;
                        content.appendChild(shiftEl);
                    }
                }
            }
            cell.appendChild(dateNumber);
            cell.appendChild(content);
            this.el.calendarGrid.appendChild(cell);
        }
    }

    updateCurrentDateDisplay() { this.el.monthYearDisplay.textContent = \`\${this.currentDate.getFullYear()}年 \${this.currentDate.getMonth() + 1}月\`; }
    
    changeMonth(offset) {
        this.saveState();
        this.currentDate.setMonth(this.currentDate.getMonth() + offset, 1);
        this.loadState();
        this.updateCurrentDateDisplay();
        this.renderAll();
    }

    changeView(view) {
        this.activeView = view;
        this.el.primaryScheduleTab.classList.toggle('active', view === 'primary');
        this.el.secondaryScheduleTab.classList.toggle('active', view === 'secondary');
        this.el.primaryViewControls.classList.toggle('hidden', view !== 'primary');
        this.el.secondaryViewControls.classList.toggle('hidden', view !== 'secondary');
        this.renderCalendar();
    }

    handleClearMonth() {
        this.openConfirmModal('確認清除?', \`確定要永久刪除 \${this.currentDate.getFullYear()}年 \${this.currentDate.getMonth() + 1}月 的主要班表資料嗎？\`, () => {
            const prefix = this.formatDate(this.currentDate).substring(0, 7);
            for (const key in this.state.shifts) { if (key.startsWith(prefix)) delete this.state.shifts[key]; }
            this.saveState();
            this.renderCalendar();
            this.showAlert('本月主要班表已清除', 'success');
        });
    }

    addStaffMember() {
        const name = this.el.staffNameInput.value.trim();
        if (name && !this.state.staffNames.includes(name)) {
            this.state.staffNames.push(name);
            this.assignColorsToStaff();
            this.saveState();
            this.renderSidebar();
            this.showAlert(\`\${name} 已新增\`, 'success');
        } else {
            this.showAlert('請輸入有效且不重複的姓名', 'error');
        }
        this.el.addStaffForm.reset();
    }

    removeStaffMember(index) {
        const removedName = this.state.staffNames[index];
        this.openConfirmModal('確認移除?', \`確定要移除 \${removedName} 嗎？其在本月的所有班次也將被清除。\`, () => {
            this.state.staffNames.splice(index, 1);
            delete this.state.staffColors[removedName];
            const prefix = this.formatDate(this.currentDate).substring(0, 7);
            for (const key in this.state.shifts) { if (key.startsWith(prefix) && this.state.shifts[key] === removedName) delete this.state.shifts[key]; }
            this.saveState();
            this.renderAll();
            this.showAlert(\`\${removedName} 已移除\`, 'success');
        });
    }

    assignColorsToStaff() {
        const newColors = {};
        const usedBackgrounds = new Set(Object.values(this.state.staffColors).map(c => c.background));
        this.state.staffNames.forEach(name => { if (this.state.staffColors[name]) { newColors[name] = this.state.staffColors[name]; usedBackgrounds.add(newColors[name].background); } });
        let colorIndex = 0;
        this.state.staffNames.forEach(name => {
            if (!newColors[name]) {
                let assignedColor;
                do { assignedColor = this.PREDEFINED_COLORS[colorIndex % this.PREDEFINED_COLORS.length]; colorIndex++; } while (usedBackgrounds.has(assignedColor.background) && usedBackgrounds.size < this.PREDEFINED_COLORS.length);
                newColors[name] = assignedColor;
                usedBackgrounds.add(assignedColor.background);
            }
        });
        this.state.staffColors = newColors;
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        if (modalId === 'settingsModal') this.populateSettingsModal();
        modal.classList.add('active');
        const focusable = modal.querySelector('button, [href], input, select, textarea');
        if (focusable) focusable.focus();
    }
    
    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
        if (modalId === 'assignmentModal') {
            this.selectedDate = null;
            this.renderCalendar();
        }
    }

    populateSettingsModal() {
        const { date, time } = this.state.sentrySchedule.initialCondition;
        this.el.sentryStartDate.value = date;
        const select = this.el.sentryStartTime;
        select.innerHTML = '';
        this.state.sentrySchedule.timeSlots.forEach(slot => { select.innerHTML += \`<option value="\${slot}">\${slot}</option>\`; });
        select.value = time;
    }
    
    openAssignmentModal(dateStr) {
        this.selectedDate = dateStr;
        this.renderCalendar();
        this.el.assignmentModalTitle.textContent = \`指派 \${dateStr}\`;
        this.el.modalStaffList.innerHTML = '';
        if (this.state.staffNames.length > 0) {
            this.el.noStaffMessage.classList.add('hidden');
            this.state.staffNames.forEach(name => {
                const btn = document.createElement('button');
                const color = this.state.staffColors[name] || {};
                btn.innerHTML = \`<span class="staff-color-indicator" style="background-color: \${color.background}; border: 1px solid \${color.text};"></span> \${name}\`;
                btn.addEventListener('click', () => this.assignShift(name));
                this.el.modalStaffList.appendChild(btn);
            });
        } else {
            this.el.noStaffMessage.classList.remove('hidden');
        }
        this.el.clearAssignmentBtn.style.display = this.state.shifts[dateStr] ? 'block' : 'none';
        this.openModal('assignmentModal');
    }

    assignShift(name) {
        if (this.selectedDate) {
            this.state.shifts[this.selectedDate] = name;
            this.saveState();
            this.renderCalendar();
            this.closeModal('assignmentModal');
        }
    }

    clearAssignment() {
        if (this.selectedDate) {
            delete this.state.shifts[this.selectedDate];
            this.saveState();
            this.renderCalendar();
            this.closeModal('assignmentModal');
        }
    }

    openConfirmModal(title, message, onConfirm) {
        this.el.confirmModalTitle.textContent = title;
        this.el.confirmModalMessage.textContent = message;
        const newConfirmBtn = this.el.acceptConfirmBtn.cloneNode(true);
        this.el.acceptConfirmBtn.parentNode.replaceChild(newConfirmBtn, this.el.acceptConfirmBtn);
        this.el.acceptConfirmBtn = newConfirmBtn;
        this.el.acceptConfirmBtn.addEventListener('click', () => { onConfirm(); this.closeModal('confirmModal'); }, { once: true });
        this.openModal('confirmModal');
    }

    importScheduleFromText() {
        const text = this.el.fullSchedulePasteArea.value;
        if (!text.trim()) return this.showAlert('請先貼上文字內容', 'error');
        const result = this.parseTextToIntermediateData(text);
        if (result.success) {
            this.applyParsedDataToAppState(result);
            this.showAlert('班表已成功從文字匯入', 'success');
            this.closeModal('settingsModal');
        } else {
            this.showAlert('無法從文字中解析有效的班表資料', 'error');
        }
    }

    parseTextToIntermediateData(text) {
        const lines = text.split('\\n').map(line => line.trimEnd());
        let year = this.currentDate.getFullYear();
        let month_0_indexed = this.currentDate.getMonth();
        const tempStaff = new Set();
        const tempShifts = {};
        const yearMonthMatch = text.match(/(\\d+)\\s*年\\s*(\\d+)\\s*月/);
        if (yearMonthMatch) { year = parseInt(yearMonthMatch[1]); if (year < 200) year += 1911; month_0_indexed = parseInt(yearMonthMatch[2]) - 1; }
        const dateHeaderLineIndex = lines.findIndex(line => line.includes("姓名") && /\\d/.test(line));
        if (dateHeaderLineIndex > -1) {
            const datePositions = {};
            const dayRegex = /\\b(\\d{1,2})\\b/g;
            let match;
            while ((match = dayRegex.exec(lines[dateHeaderLineIndex])) !== null) { datePositions[parseInt(match[1])] = match.index; }
            for (let i = dateHeaderLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                const nameMatch = line.match(/^([^\\s\\d值vVoO]+)/);
                if (nameMatch && nameMatch[0].length > 1) {
                    const staffName = nameMatch[0].trim();
                    tempStaff.add(staffName);
                    for (const day in datePositions) {
                        const charIndex = datePositions[day];
                        if (charIndex < line.length && "值vVoO0".includes(line[charIndex])) {
                            const dateStr = \`\${year}-\${String(month_0_indexed + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                            tempShifts[dateStr] = staffName;
                        }
                    }
                }
            }
        }
        const success = tempStaff.size > 0 || Object.keys(tempShifts).length > 0;
        return { success, year, month: month_0_indexed, staffNames: Array.from(tempStaff), shifts: tempShifts };
    }

    applyParsedDataToAppState({ year, month, staffNames, shifts }) {
        this.currentDate = new Date(year, month, 1);
        this.state.staffNames = Array.from(new Set([...this.state.staffNames, ...staffNames]));
        this.assignColorsToStaff();
        const monthPrefix = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
        for (const key in this.state.shifts) { if (key.startsWith(monthPrefix)) delete this.state.shifts[key]; }
        this.state.shifts = { ...this.state.shifts, ...shifts };
        this.saveState();
        this.updateCurrentDateDisplay();
        this.renderAll();
    }
    
    importHolidaysFromFile() {
        const file = this.el.holidayFileImport.files[0];
        if (!file) return this.showAlert('請先選擇檔案', 'error');
        const reader = new FileReader();
        reader.onload = (e) => {
            const newHolidays = this.parseICS(e.target.result);
            if (Object.keys(newHolidays).length > 0) {
                this.state.holidays = { ...this.state.holidays, ...newHolidays };
                this.saveState();
                this.renderAll();
                this.showAlert(\`成功匯入 \${Object.keys(newHolidays).length} 個假期\`, 'success');
            } else {
                this.showAlert('未在檔案中找到有效的假期', 'info');
            }
        };
        reader.readAsText(file);
        this.closeModal('settingsModal');
    }

    parseICS(icsContent) {
        const holidays = {};
        const eventRegex = /BEGIN:VEVENT[\\s\\S]*?END:VEVENT/g;
        const dtstartRegex = /DTSTART(?:;VALUE=DATE)?:(\\d{8})/;
        const summaryRegex = /SUMMARY:(.+)/;
        let match;
        while ((match = eventRegex.exec(icsContent)) !== null) {
            const eventBlock = match[0];
            const dtstartMatch = eventBlock.match(dtstartRegex);
            const summaryMatch = eventBlock.match(summaryRegex);
            if (dtstartMatch && summaryMatch) {
                const dateStr = dtstartMatch[1];
                const formattedDate = \`\${dateStr.substring(0, 4)}-\${dateStr.substring(4, 6)}-\${dateStr.substring(6, 8)}\`;
                holidays[formattedDate] = summaryMatch[1].trim().replace(/\\\\,/g, ',');
            }
        }
        return holidays;
    }

    updateSentryCondition() {
        this.state.sentrySchedule.initialCondition = { date: this.el.sentryStartDate.value, time: this.el.sentryStartTime.value };
        this.state.sentrySchedule.shifts = {};
        this.recalculateSentryIfNeeded(true);
        this.saveState();
        this.renderCalendar();
        this.showAlert('查哨起始條件已更新', 'success');
        this.closeModal('settingsModal');
    }

    handleAutoScheduleTrigger() {
        if (this.state.staffNames.length === 0) return this.showAlert("請先新增主要班表人員", "error");
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.el.autoScheduleMessage.textContent = \`您確定要為 \${year}年 \${month + 1}月 自動產生班表嗎？\`;
        const selects = [this.el.startMonThuSelect, this.el.startFriSelect, this.el.startWeekendSelect];
        selects.forEach(select => { select.innerHTML = '<option value="">依預設排序</option>'; this.state.staffNames.forEach(name => { select.innerHTML += \`<option value="\${name}">\${name}</option>\`; }); });
        const monthKey = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
        const defaults = this.state.defaultPrimaryScheduleStarters[monthKey] || {};
        this.el.startMonThuSelect.value = defaults.monThu || "";
        this.el.startFriSelect.value = defaults.fri || "";
        this.el.startWeekendSelect.value = defaults.weekend || "";
        this.openModal('autoScheduleModal');
    }

    proceedWithAutoSchedule() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthPrefix = this.formatDate(this.currentDate).substring(0, 7);
        for (const key in this.state.shifts) { if (key.startsWith(monthPrefix)) delete this.state.shifts[key]; }
        const newShifts = this.generateBasicRoundRobin(
            year, month, this.state.staffNames,
            this.el.startMonThuSelect.value, this.el.startFriSelect.value, this.el.startWeekendSelect.value
        );
        this.state.shifts = { ...this.state.shifts, ...newShifts };
        this.showAlert('班表已自動產生', 'success');
        this.saveState();
        this.renderCalendar();
        this.closeModal('autoScheduleModal');
    }

    generateBasicRoundRobin(year, month, staffList, startMonThu = "", startFri = "", startWeekend = "") {
        const newShifts = {};
        if (staffList.length === 0) return newShifts;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let idx = {
            monThu: staffList.indexOf(startMonThu) > -1 ? staffList.indexOf(startMonThu) : 0,
            fri: staffList.indexOf(startFri) > -1 ? staffList.indexOf(startFri) : 0,
            weekend: staffList.indexOf(startWeekend) > -1 ? staffList.indexOf(startWeekend) : 0
        };
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
            if (newShifts[dateStr] || this.state.holidays[dateStr]) continue;
            const dayOfWeek = new Date(year, month, day).getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 4) { newShifts[dateStr] = staffList[idx.monThu]; idx.monThu = (idx.monThu + 1) % staffList.length; }
            else if (dayOfWeek === 5) { newShifts[dateStr] = staffList[idx.fri]; idx.fri = (idx.fri + 1) % staffList.length; }
            else if (dayOfWeek === 6) { const person = staffList[idx.weekend]; newShifts[dateStr] = person; if (day + 1 <= daysInMonth) { const sunStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day + 1).padStart(2, '0')}\`; if (!this.state.holidays[sunStr]) newShifts[sunStr] = person; } idx.weekend = (idx.weekend + 1) % staffList.length; }
            else if (dayOfWeek === 0 && !newShifts[dateStr]) { newShifts[dateStr] = staffList[idx.weekend]; idx.weekend = (idx.weekend + 1) % staffList.length; }
        }
        return newShifts;
    }

    handleCarryOver() {
        if (this.state.staffNames.length === 0) return this.showAlert("請先新增人員", "error");
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const staffList = this.state.staffNames;
        let lastStaff = { monThu: "", fri: "", weekend: "" };
        for (let day = new Date(year, month + 1, 0).getDate(); day >= 1; day--) {
            const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
            const dayOfWeek = new Date(year, month, day).getDay();
            const person = this.state.shifts[dateStr];
            if (person) {
                if (!lastStaff.monThu && dayOfWeek >= 1 && dayOfWeek <= 4) lastStaff.monThu = person;
                if (!lastStaff.fri && dayOfWeek === 5) lastStaff.fri = person;
                if (!lastStaff.weekend && (dayOfWeek === 0 || dayOfWeek === 6)) lastStaff.weekend = person;
            }
            if (lastStaff.monThu && lastStaff.fri && lastStaff.weekend) break;
        }
        const getNext = (current) => { if (!current || !staffList.includes(current)) return staffList[0] || ""; return staffList[(staffList.indexOf(current) + 1) % staffList.length]; };
        this.changeMonth(1);
        const nextYear = this.currentDate.getFullYear();
        const nextMonth = this.currentDate.getMonth();
        const monthPrefix = this.formatDate(this.currentDate).substring(0, 7);
        for (const key in this.state.shifts) { if (key.startsWith(monthPrefix)) delete this.state.shifts[key]; }
        const newShifts = this.generateBasicRoundRobin(nextYear, nextMonth, staffList, getNext(lastStaff.monThu), getNext(lastStaff.fri), getNext(lastStaff.weekend));
        this.state.shifts = { ...this.state.shifts, ...newShifts };
        this.saveState();
        this.renderAll();
        this.showAlert(\`已預排 \${nextYear}年 \${nextMonth + 1}月 班表\`, 'success');
    }

    toggleTheme() {
        const newTheme = document.body.dataset.colorScheme === 'light' ? 'dark' : 'light';
        document.body.dataset.colorScheme = newTheme;
        this.el.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem(this.getLocalStorageKey('theme'), newTheme);
    }
    
    applyTheme() {
        const savedTheme = localStorage.getItem(this.getLocalStorageKey('theme')) || 'light';
        document.body.dataset.colorScheme = savedTheme;
        this.el.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    handleKeyboardInput(e) {
        if (this.el.assignmentModal.classList.contains('active') || this.el.confirmModal.classList.contains('active') || this.el.settingsModal.classList.contains('active') || this.el.autoScheduleModal.classList.contains('active')) return;
        if (e.key === 'Escape') return this.disableKeyboardNavigation();
        if (!this.keyboardNavEnabled) {
            if (e.key === 'Tab' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                this.keyboardNavEnabled = true;
                const target = this.el.calendarGrid.querySelector('.calendar-cell[data-date]');
                this.focusCell(target);
            }
            return;
        }
        if (!this.focusedCell) return;
        e.preventDefault();
        const allCells = Array.from(this.el.calendarGrid.querySelectorAll('.calendar-cell'));
        const currentIndex = allCells.indexOf(this.focusedCell);
        let newIndex = currentIndex;
        switch (e.key) {
            case 'ArrowLeft': newIndex = Math.max(0, currentIndex - 1); break;
            case 'ArrowRight': newIndex = Math.min(allCells.length - 1, currentIndex + 1); break;
            case 'ArrowUp': newIndex = Math.max(0, currentIndex - 7); break;
            case 'ArrowDown': newIndex = Math.min(allCells.length - 1, currentIndex + 7); break;
            case 'Enter': if (this.activeView === 'primary' && this.focusedCell.dataset.date) this.openAssignmentModal(this.focusedCell.dataset.date); break;
            case 'Home': newIndex -= (currentIndex % 7); break;
            case 'End': newIndex += (6 - (currentIndex % 7)); break;
        }
        if (newIndex !== currentIndex) {
            const newCell = allCells[newIndex];
            if (newCell && !newCell.dataset.date) { /* Landed on blank cell, do nothing */ }
            else if (newCell) { this.focusCell(newCell); }
        }
    }

    focusCell(cell) {
        if (this.focusedCell) { this.focusedCell.classList.remove('keyboard-focus'); this.focusedCell.setAttribute('tabindex', '-1'); }
        this.focusedCell = cell;
        if (cell) { cell.classList.add('keyboard-focus'); cell.setAttribute('tabindex', '0'); cell.focus(); }
    }
    
    disableKeyboardNavigation() { this.keyboardNavEnabled = false; this.focusCell(null); }
    
    ensureSecondaryScheduleForMonth() {
        const { groupDefinitions, anchor } = this.state.secondarySchedule;
        if (groupDefinitions.length === 0) return;
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateStr = this.formatDate(date);
            const dayOfWeek = date.getUTCDay();
            if ((dayOfWeek === 6 || dayOfWeek === 0) && !this.state.secondarySchedule.shifts[dateStr]) {
                const saturday = new Date(date);
                if (dayOfWeek === 0) saturday.setUTCDate(saturday.getUTCDate() - 1);
                const anchorGroupIndex = groupDefinitions.findIndex(g => g.name === anchor.groupName);
                const anchorDate = new Date(anchor.date + 'T00:00:00Z');
                const diffInWeeks = Math.round((saturday - anchorDate) / (1000 * 60 * 60 * 24 * 7));
                const groupIndex = (anchorGroupIndex + diffInWeeks % groupDefinitions.length + groupDefinitions.length) % groupDefinitions.length;
                this.state.secondarySchedule.shifts[dateStr] = groupDefinitions[groupIndex].name;
            }
        }
    }

    recalculateSentryIfNeeded(force = false) {
        if (!force && Object.keys(this.state.sentrySchedule.shifts).length > 0) return;
        this.showAlert('正在計算查哨班表...', 'info');
        const { initialCondition, config, timeSlots } = this.state.sentrySchedule;
        this.state.sentrySchedule.shifts = {};
        let currentDate = new Date(initialCondition.date + 'T00:00:00Z');
        let currentTimeSlot = initialCondition.time;
        const endDate = new Date(new Date().getFullYear() + 2, 11, 31);
        while (currentDate <= endDate) {
            const dateKey = this.formatDate(currentDate);
            this.state.sentrySchedule.shifts[dateKey] = currentTimeSlot;
            currentDate.setUTCDate(currentDate.getUTCDate() + (currentTimeSlot === config.resetTime ? 2 : 1));
            const nextIndex = (timeSlots.indexOf(currentTimeSlot) + 1) % timeSlots.length;
            currentTimeSlot = currentTimeSlot === config.resetTime ? config.restartTime : timeSlots[nextIndex];
        }
        this.saveState();
        this.showAlert('查哨班表計算完成', 'success');
    }
    
    formatDate(date) { return date.toISOString().split('T')[0]; }
    
    showAlert(message, type = 'info', duration = 3000) {
        this.el.customAlert.textContent = message;
        this.el.customAlert.className = \`custom-alert \${type}\`;
        this.el.customAlert.classList.add('show');
        setTimeout(() => { this.el.customAlert.classList.remove('show'); }, duration);
    }

    exportToICS(type) {
        let icsEvents = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SHIFTTOOL_v8.0//ZH'];
        const monthPrefix = this.formatDate(this.currentDate).substring(0, 7);
        let shiftsToExport = 0;
        if (type === 'primary') {
            const filter = this.el.staffFilterSelect.value;
            for(const dateStr in this.state.shifts) {
                if (dateStr.startsWith(monthPrefix)) {
                    const person = this.state.shifts[dateStr];
                    if (filter === 'ALL' || filter === person) {
                        icsEvents.push(this.createIcsEvent(dateStr, filter === 'ALL' ? person : '值班', \`值班人員: \${person}\`));
                        shiftsToExport++;
                    }
                }
            }
        } else {
            for(const dateStr in this.state.secondarySchedule.shifts) {
                if(dateStr.startsWith(monthPrefix) && !this.state.holidays[dateStr]) {
                    const groupName = this.state.secondarySchedule.shifts[dateStr];
                    const group = this.state.secondarySchedule.groupDefinitions.find(g => g.name === groupName);
                    if (group) {
                        icsEvents.push(this.createIcsEvent(dateStr, \`✈️ \${groupName}組\`, \`組員: \${group.members.join('、')}\`));
                        shiftsToExport++;
                    }
                }
            }
        }
        if (shiftsToExport === 0) return this.showAlert('沒有符合條件的資料可匯出', 'info');
        icsEvents.push('END:VCALENDAR');
        const filename = \`\${type}_schedule_\${this.currentDate.getFullYear()}_\${this.currentDate.getMonth() + 1}.ics\`;
        this.downloadFile(icsEvents.join('\\r\\n'), filename, 'text/calendar');
        this.showAlert(\`\${filename} 已匯出\`, 'success');
    }

    createIcsEvent(dateStr, summary, description) {
        const date = new Date(dateStr + 'T00:00:00Z');
        const startDate = this.formatDate(date).replace(/-/g, '');
        date.setUTCDate(date.getUTCDate() + 1);
        const endDate = this.formatDate(date).replace(/-/g, '');
        return ['BEGIN:VEVENT', \`UID:\${dateStr}-\${summary.replace(/\\s+/g, '')}@shifttool.local\`, \`DTSTAMP:\${new Date().toISOString().replace(/[-:.]/g, '')}Z\`, \`DTSTART;VALUE=DATE:\${startDate}\`, \`DTEND;VALUE=DATE:\${endDate}\`, \`SUMMARY:\${summary}\`, \`DESCRIPTION:\${description}\`, 'END:VEVENT'].join('\\r\\n');
    }
    
    downloadFile(content, filename, contentType) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([content], { type: contentType }));
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
}
document.addEventListener('DOMContentLoaded', () => { new ShiftTool(); });
`;
// Replace the previous app.js with the full version.
const finalAppJsCode = completeAppJs.replace(/\\/g, ''); // Remove escape characters for final output
// I will output the final `app.js` now.