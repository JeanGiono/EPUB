// Professional Shift Tool Application - JavaScript
class ShiftTool {
    constructor() {
        // State
        this.currentDate = new Date();
        this.activeView = 'primary';
        this.selectedDate = null;
        this.keyboardNavEnabled = false;
        this.focusedCell = null;
        
        this.state = {
            staffNames: [],
            shifts: {},
            staffColors: {},
            holidays: {},
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
                config: { restDayLabel: "休" },
                timeSlots: ["00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00", "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-00:00"]
            }
        };

        this.PREDEFINED_COLORS = [
            { background: '#FFADAD', text: '#A50000' }, { background: '#FFD6A5', text: '#A54700' },
            { background: '#FDFFB6', text: '#6F7300' }, { background: '#CAFFBF', text: '#1E5E2F' },
            { background: '#9BF6FF', text: '#005F6B' }, { background: '#A0C4FF', text: '#0D3C8C' },
            { background: '#BDB2FF', text: '#3A1E93' }, { background: '#FFC6FF', text: '#7A006F' }
        ];

        this.cacheDOMElements();
        this.init();
    }

    // --- INITIALIZATION & SETUP ---
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
            // Navigation
            monthYearDisplay: document.getElementById('monthYearDisplay'),
            prevMonthBtn: document.getElementById('prevMonthBtn'),
            nextMonthBtn: document.getElementById('nextMonthBtn'),
            primaryScheduleTab: document.getElementById('primaryScheduleTab'),
            secondaryScheduleTab: document.getElementById('secondaryScheduleTab'),
            themeToggle: document.getElementById('themeToggle'),

            // Calendar
            calendarGrid: document.getElementById('calendarGrid'),

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
            
            // Modals & Alerts
            assignmentModal: document.getElementById('assignmentModal'),
            assignmentModalTitle: document.getElementById('assignmentModalTitle'),
            closeAssignmentModal: document.getElementById('closeAssignmentModal'),
            modalStaffList: document.getElementById('modalStaffList'),
            noStaffMessage: document.getElementById('noStaffMessage'),
            clearAssignmentBtn: document.getElementById('clearAssignmentBtn'),
            confirmModal: document.getElementById('confirmModal'),
            confirmModalTitle: document.getElementById('confirmModalTitle'),
            confirmModalMessage: document.getElementById('confirmModalMessage'),
            closeConfirmModal: document.getElementById('closeConfirmModal'),
            cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
            acceptConfirmBtn: document.getElementById('acceptConfirmBtn'),
            customAlert: document.getElementById('customAlert'),
        };
    }

    bindEvents() {
        // Navigation
        this.el.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.el.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        this.el.primaryScheduleTab.addEventListener('click', () => this.changeView('primary'));
        this.el.secondaryScheduleTab.addEventListener('click', () => this.changeView('secondary'));
        
        // Theme
        this.el.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Sidebar Forms & Buttons
        this.el.addStaffForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStaffMember();
        });
        this.el.staffFilterSelect.addEventListener('change', () => this.renderCalendar());
        this.el.saveAllBtn.addEventListener('click', () => {
            this.saveState();
            this.showAlert('所有變更已儲存!', 'success');
        });
        this.el.printBtn.addEventListener('click', () => window.print());
        this.el.clearMonthBtn.addEventListener('click', () => this.handleClearMonth());
        this.el.exportPrimaryScheduleBtn.addEventListener('click', () => this.exportToICS('primary'));
        this.el.exportSecondaryScheduleBtn.addEventListener('click', () => this.exportToICS('secondary'));

        // Modals
        this.el.closeAssignmentModal.addEventListener('click', () => this.closeAssignmentModal());
        this.el.clearAssignmentBtn.addEventListener('click', () => this.clearAssignment());
        this.el.assignmentModal.addEventListener('click', (e) => { if (e.target === this.el.assignmentModal) this.closeAssignmentModal() });
        this.el.closeConfirmModal.addEventListener('click', () => this.closeConfirmModal());
        this.el.cancelConfirmBtn.addEventListener('click', () => this.closeConfirmModal());
        
        // NEW: Keyboard Navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
    }

    // --- STATE MANAGEMENT (DATA) ---
    getLocalStorageKey(dataType) {
        const version = "v7.0";
        if (['holidays', 'sentry_shifts', 'sentry_initial', 'theme'].includes(dataType)) {
            return `shiftTool_${version}_${dataType}`;
        }
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        return `shiftTool_${version}_${dataType}_${year}_${String(month + 1).padStart(2, '0')}`;
    }

    loadState() {
        const staff = localStorage.getItem(this.getLocalStorageKey('staff'));
        this.state.staffNames = staff ? JSON.parse(staff) : ["劉學翰", "廖志龍", "袁國維", "張靖興", "曾名賢"];

        const shifts = localStorage.getItem(this.getLocalStorageKey('shifts'));
        this.state.shifts = shifts ? JSON.parse(shifts) : {};

        const colors = localStorage.getItem(this.getLocalStorageKey('staffColors'));
        this.state.staffColors = colors ? JSON.parse(colors) : {};

        this.assignColorsToStaff(); // Ensure colors are always set
        
        // Global data
        const holidays = localStorage.getItem(this.getLocalStorageKey('holidays'));
        this.state.holidays = holidays ? JSON.parse(holidays) : {};

        const sentryShifts = localStorage.getItem(this.getLocalStorageKey('sentry_shifts'));
        this.state.sentrySchedule.shifts = sentryShifts ? JSON.parse(sentryShifts) : {};
        
        const sentryInitial = localStorage.getItem(this.getLocalStorageKey('sentry_initial'));
        if (sentryInitial) this.state.sentrySchedule.initialCondition = JSON.parse(sentryInitial);
    }

    saveState() {
        localStorage.setItem(this.getLocalStorageKey('staff'), JSON.stringify(this.state.staffNames));
        localStorage.setItem(this.getLocalStorageKey('shifts'), JSON.stringify(this.state.shifts));
        localStorage.setItem(this.getLocalStorageKey('staffColors'), JSON.stringify(this.state.staffColors));
        localStorage.setItem(this.getLocalStorageKey('holidays'), JSON.stringify(this.state.holidays));
        localStorage.setItem(this.getLocalStorageKey('sentry_shifts'), JSON.stringify(this.state.sentrySchedule.shifts));
        localStorage.setItem(this.getLocalStorageKey('sentry_initial'), JSON.stringify(this.state.sentrySchedule.initialCondition));
    }

    // --- RENDERING (UI) ---
    renderAll() {
        this.renderSidebar();
        this.renderCalendar();
    }
    
    renderSidebar() {
        // Staff List
        this.el.staffList.innerHTML = '';
        if (this.state.staffNames.length === 0) {
            this.el.staffList.innerHTML = '<p class="text-sm text-slate-500">無主要班表人員</p>';
        } else {
            this.state.staffNames.forEach((name, index) => {
                const item = document.createElement('div');
                item.className = 'staff-item';
                const color = this.state.staffColors[name] || {};
                item.innerHTML = `
                    <div class="flex items-center">
                        <span class="staff-color-indicator" style="background-color: ${color.background}; border: 1px solid ${color.text};"></span>
                        <span>${name}</span>
                    </div>
                    <button class="remove-staff-btn" data-index="${index}" title="移除 ${name}">&times;</button>
                `;
                this.el.staffList.appendChild(item);
            });
            this.el.staffList.querySelectorAll('.remove-staff-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.removeStaffMember(parseInt(e.currentTarget.dataset.index)));
            });
        }

        // Filter Dropdown
        const filter = this.el.staffFilterSelect;
        const currentFilter = filter.value;
        filter.innerHTML = '<option value="ALL">所有人員</option>';
        this.state.staffNames.forEach(name => {
            filter.innerHTML += `<option value="${name}">${name}</option>`;
        });
        filter.value = this.state.staffNames.includes(currentFilter) ? currentFilter : "ALL";

        // Secondary Info
        this.el.secondaryStaffInfo.innerHTML = `
            <p><b>固定人員:</b> ${this.state.secondarySchedule.staff.join('、')}</p>
            ${this.state.secondarySchedule.groupDefinitions.map(g => 
                `<p><b>組 ${g.name}:</b> ${g.members.join('、')}</p>`
            ).join('')}
        `;
    }

    renderCalendar() {
        this.ensureSecondaryScheduleForMonth();
        this.el.calendarGrid.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const today = new Date();
        const todayStr = this.formatDate(today);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();

        // Fill blank days at the start
        for (let i = 0; i < startDayOfWeek; i++) {
            this.el.calendarGrid.appendChild(document.createElement('div'));
        }

        // Fill days of the month
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
            
            // Date Number
            const dateNumber = document.createElement('div');
            dateNumber.className = 'date-number';
            dateNumber.textContent = day;
            if (isWeekend || holidayName) dateNumber.classList.add('weekend-holiday');
            
            // Content
            const content = document.createElement('div');
            content.className = 'cell-content';

            if (this.activeView === 'primary') {
                // Filter logic
                const primaryPerson = this.state.shifts[dateStr];
                const filterValue = this.el.staffFilterSelect.value;
                if (filterValue !== 'ALL' && primaryPerson !== filterValue) {
                    cell.style.opacity = '0.5';
                }

                // Primary Shift
                if (primaryPerson) {
                    const color = this.state.staffColors[primaryPerson] || {};
                    const shiftEl = document.createElement('span');
                    shiftEl.className = 'primary-shift';
                    shiftEl.textContent = primaryPerson.charAt(0);
                    shiftEl.title = primaryPerson;
                    shiftEl.style.backgroundColor = color.background;
                    shiftEl.style.color = color.text;
                    shiftEl.style.border = `1px solid ${color.text}`;
                    content.appendChild(shiftEl);
                }
                
                // Sentry & Holiday Info
                const sentryTime = this.state.sentrySchedule.shifts[dateStr];
                if (sentryTime && sentryTime !== this.state.sentrySchedule.config.restDayLabel) {
                    content.innerHTML += `<div class="sentry-note" title="查哨"><i class="fas fa-search-location fa-fw"></i> ${sentryTime.substring(0,2)}</div>`;
                }
                if (holidayName) {
                    content.innerHTML += `<div class="holiday-note">${holidayName}</div>`;
                }

            } else { // Secondary View
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
                        shiftEl.style.border = `1px solid ${groupInfo.color.text}`;
                        content.appendChild(shiftEl);
                    }
                }
            }
            
            cell.appendChild(dateNumber);
            cell.appendChild(content);
            this.el.calendarGrid.appendChild(cell);
        }
    }
    
    updateCurrentDateDisplay() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.el.monthYearDisplay.textContent = `${year}年 ${month + 1}月`;
    }

    // --- EVENT HANDLERS & LOGIC ---
    changeMonth(offset) {
        this.saveState();
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);
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
        this.openConfirmModal('確認清除?', `確定要永久刪除 ${this.currentDate.getFullYear()}年 ${this.currentDate.getMonth() + 1}月 的主要班表資料嗎？`, () => {
            const prefix = this.formatDate(this.currentDate).substring(0, 7);
            for (const key in this.state.shifts) {
                if (key.startsWith(prefix)) {
                    delete this.state.shifts[key];
                }
            }
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
            this.showAlert(`${name} 已新增`, 'success');
        } else {
            this.showAlert('請輸入有效且不重複的姓名', 'error');
        }
        this.el.addStaffForm.reset();
    }

    removeStaffMember(index) {
        const removedName = this.state.staffNames[index];
        this.openConfirmModal('確認移除?', `確定要移除 ${removedName} 嗎？其在本月的所有班次也將被清除。`, () => {
            this.state.staffNames.splice(index, 1);
            delete this.state.staffColors[removedName];
            // Remove shifts for this person in the current month
            const prefix = this.formatDate(this.currentDate).substring(0, 7);
            for (const key in this.state.shifts) {
                if (key.startsWith(prefix) && this.state.shifts[key] === removedName) {
                    delete this.state.shifts[key];
                }
            }
            this.saveState();
            this.renderAll();
            this.showAlert(`${removedName} 已移除`, 'success');
        });
    }
    
    assignColorsToStaff() {
        const newColors = {};
        const usedBackgrounds = new Set();
        this.state.staffNames.forEach(name => {
            if (this.state.staffColors[name]) {
                newColors[name] = this.state.staffColors[name];
                usedBackgrounds.add(newColors[name].background);
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
    
    // --- MODAL LOGIC ---
    openAssignmentModal(dateStr) {
        this.selectedDate = dateStr;
        this.renderCalendar(); // Re-render to show selection
        this.el.assignmentModalTitle.textContent = `指派 ${dateStr}`;
        this.el.modalStaffList.innerHTML = '';

        if (this.state.staffNames.length > 0) {
            this.el.noStaffMessage.classList.add('hidden');
            this.state.staffNames.forEach(name => {
                const btn = document.createElement('button');
                const color = this.state.staffColors[name] || {};
                btn.innerHTML = `<span class="staff-color-indicator" style="background-color: ${color.background}; border: 1px solid ${color.text};"></span> ${name}`;
                btn.addEventListener('click', () => this.assignShift(name));
                this.el.modalStaffList.appendChild(btn);
            });
        } else {
            this.el.noStaffMessage.classList.remove('hidden');
        }
        
        this.el.clearAssignmentBtn.style.display = this.state.shifts[dateStr] ? 'block' : 'none';
        this.el.assignmentModal.classList.add('active');
        this.el.closeAssignmentModal.focus();
    }

    closeAssignmentModal() {
        this.selectedDate = null;
        this.el.assignmentModal.classList.remove('active');
        this.renderCalendar();
    }

    assignShift(name) {
        if (this.selectedDate) {
            this.state.shifts[this.selectedDate] = name;
            this.saveState();
            this.renderCalendar();
            this.closeAssignmentModal();
        }
    }

    clearAssignment() {
        if (this.selectedDate) {
            delete this.state.shifts[this.selectedDate];
            this.saveState();
            this.renderCalendar();
            this.closeAssignmentModal();
        }
    }
    
    openConfirmModal(title, message, onConfirm) {
        this.el.confirmModalTitle.textContent = title;
        this.el.confirmModalMessage.textContent = message;
        
        // Clone and replace button to remove old listeners
        const newConfirmBtn = this.el.acceptConfirmBtn.cloneNode(true);
        this.el.acceptConfirmBtn.parentNode.replaceChild(newConfirmBtn, this.el.acceptConfirmBtn);
        this.el.acceptConfirmBtn = newConfirmBtn;
        
        this.el.acceptConfirmBtn.addEventListener('click', () => {
            onConfirm();
            this.closeConfirmModal();
        }, { once: true });

        this.el.confirmModal.classList.add('active');
        this.el.acceptConfirmBtn.focus();
    }

    closeConfirmModal() {
        this.el.confirmModal.classList.remove('active');
    }

    // --- THEME ---
    toggleTheme() {
        const currentTheme = document.body.dataset.colorScheme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.colorScheme = newTheme;
        this.el.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem(this.getLocalStorageKey('theme'), newTheme);
    }
    
    applyTheme() {
        const savedTheme = localStorage.getItem(this.getLocalStorageKey('theme')) || 'light';
        document.body.dataset.colorScheme = savedTheme;
        this.el.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    // --- SCHEDULING LOGIC (Secondary & Sentry) ---
    ensureSecondaryScheduleForMonth() {
        const { groupDefinitions, anchor } = this.state.secondarySchedule;
        if (groupDefinitions.length === 0) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateStr = this.formatDate(date);
            const dayOfWeek = date.getUTCDay();

            if (dayOfWeek === 6 || dayOfWeek === 0) { // Saturday or Sunday
                if (!this.state.secondarySchedule.shifts[dateStr]) {
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
    }

    recalculateSentryIfNeeded() {
        if (Object.keys(this.state.sentrySchedule.shifts).length > 0) return;
        this.showAlert('正在首次計算查哨班表...', 'info');
        // This is a simplified version; a full implementation would be more complex
        let currentDate = new Date(this.state.sentrySchedule.initialCondition.date + 'T00:00:00Z');
        let currentTimeSlot = this.state.sentrySchedule.initialCondition.time;
        const endDate = new Date(new Date().getFullYear() + 2, 11, 31);
        
        while (currentDate <= endDate) {
            const dateKey = this.formatDate(currentDate);
            this.state.sentrySchedule.shifts[dateKey] = currentTimeSlot;
            
            // Move to next day and next time slot (simplified logic)
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            const currentIndex = this.state.sentrySchedule.timeSlots.indexOf(currentTimeSlot);
            currentTimeSlot = this.state.sentrySchedule.timeSlots[(currentIndex + 1) % this.state.sentrySchedule.timeSlots.length];
        }
        this.saveState();
        this.showAlert('查哨班表計算完成', 'success');
    }
    
    // --- KEYBOARD NAVIGATION (NEW FEATURE) ---
    handleKeyboardInput(e) {
        if (this.el.assignmentModal.classList.contains('active') || this.el.confirmModal.classList.contains('active')) return;
        
        // Start navigation with Tab
        if (e.key === 'Tab' && !this.keyboardNavEnabled && document.activeElement.tagName !== 'INPUT') {
             e.preventDefault();
             this.keyboardNavEnabled = true;
             const target = this.el.calendarGrid.querySelector('.calendar-cell:not(:empty)') || this.el.calendarGrid.querySelector('.calendar-cell');
             this.focusCell(target);
             return;
        }

        if (e.key === 'Escape') {
            this.disableKeyboardNavigation();
            return;
        }
        
        if (!this.keyboardNavEnabled || !this.focusedCell) return;
        
        e.preventDefault();
        const allCells = Array.from(this.el.calendarGrid.querySelectorAll('.calendar-cell'));
        const currentIndex = allCells.indexOf(this.focusedCell);
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowLeft': newIndex = Math.max(0, currentIndex - 1); break;
            case 'ArrowRight': newIndex = Math.min(allCells.length - 1, currentIndex + 1); break;
            case 'ArrowUp': newIndex = Math.max(0, currentIndex - 7); break;
            case 'ArrowDown': newIndex = Math.min(allCells.length - 1, currentIndex + 7); break;
            case 'Enter': this.openAssignmentModal(this.focusedCell.dataset.date); break;
        }

        if (newIndex !== currentIndex) {
            const newCell = allCells[newIndex];
            // Check if we navigated to a blank cell at the beginning/end
            if (newCell && newCell.dataset.date) {
                this.focusCell(newCell);
            } else if (newIndex < currentIndex) { // Moved before first day
                this.changeMonth(-1);
                setTimeout(() => this.focusCell(this.el.calendarGrid.querySelector('.calendar-cell[data-date$="-01"]'), 50));
            } else { // Moved after last day
                this.changeMonth(1);
                setTimeout(() => this.focusCell(this.el.calendarGrid.querySelector('.calendar-cell:last-child'), 50));
            }
        }
    }

    focusCell(cell) {
        if (this.focusedCell) {
            this.focusedCell.classList.remove('keyboard-focus');
            this.focusedCell.setAttribute('tabindex', '-1');
        }
        this.focusedCell = cell;
        if (cell) {
            cell.classList.add('keyboard-focus');
            cell.setAttribute('tabindex', '0');
            cell.focus();
        }
    }
    
    disableKeyboardNavigation() {
        this.keyboardNavEnabled = false;
        this.focusCell(null);
    }
    
    // --- UTILITIES ---
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    showAlert(message, type = 'info', duration = 3000) {
        this.el.customAlert.textContent = message;
        this.el.customAlert.className = `custom-alert ${type}`;
        this.el.customAlert.classList.add('show');
        setTimeout(() => {
            this.el.customAlert.classList.remove('show');
        }, duration);
    }

    exportToICS(type) {
        let icsEvents = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SHIFTTOOL_v7.0//ZH'];
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthPrefix = this.formatDate(this.currentDate).substring(0, 7);
        let shiftsToExport = 0;

        if (type === 'primary') {
            const filter = this.el.staffFilterSelect.value;
            for(const dateStr in this.state.shifts) {
                if (dateStr.startsWith(monthPrefix)) {
                    const person = this.state.shifts[dateStr];
                    if (filter === 'ALL' || filter === person) {
                        const summary = filter === 'ALL' ? person : '值班';
                        icsEvents.push(this.createIcsEvent(dateStr, summary, `值班人員: ${person}`));
                        shiftsToExport++;
                    }
                }
            }
        } else { // Secondary
            for(const dateStr in this.state.secondarySchedule.shifts) {
                if(dateStr.startsWith(monthPrefix) && !this.state.holidays[dateStr]) {
                    const groupName = this.state.secondarySchedule.shifts[dateStr];
                    const group = this.state.secondarySchedule.groupDefinitions.find(g => g.name === groupName);
                    icsEvents.push(this.createIcsEvent(dateStr, `✈️ ${groupName}組`, `組員: ${group.members.join('、')}`));
                    shiftsToExport++;
                }
            }
        }
        
        if (shiftsToExport === 0) {
            this.showAlert('沒有符合條件的資料可匯出', 'info');
            return;
        }

        icsEvents.push('END:VCALENDAR');
        const filename = `${type}_schedule_${year}_${month + 1}.ics`;
        this.downloadFile(icsEvents.join('\r\n'), filename, 'text/calendar');
        this.showAlert(`${filename} 已匯出`, 'success');
    }

    createIcsEvent(dateStr, summary, description) {
        const date = new Date(dateStr + 'T00:00:00');
        const startDate = this.formatDate(date).replace(/-/g, '');
        date.setDate(date.getDate() + 1);
        const endDate = this.formatDate(date).replace(/-/g, '');
        return [
            'BEGIN:VEVENT',
            `UID:${dateStr}-${summary.replace(/\s+/g, '')}@shifttool.local`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}Z`,
            `DTSTART;VALUE=DATE:${startDate}`,
            `DTEND;VALUE=DATE:${endDate}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ].join('\r\n');
    }
    
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ShiftTool();
});