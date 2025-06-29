// SHIFT TOOL v6.3 (優化版) - Main Application JavaScript
// 全面優化的排班管理工具

// Utility Functions
class Utils {
    // Debounce function for performance optimization
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    // Throttle function for performance optimization
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Generate random color
    static generateRandomColor() {
        const colors = [
            '#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F',
            '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Format date
    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD':
                return `${month}/${day}`;
            case 'YYYY年MM月':
                return `${year}年${month}月`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    // Check if date is holiday
    static isHoliday(date, holidays = []) {
        const dateStr = this.formatDate(date);
        return holidays.includes(dateStr);
    }

    // Get Chinese weekday
    static getChineseWeekday(dayIndex) {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        return weekdays[dayIndex];
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Batch DOM operations
    static batchDOMUpdates(callback) {
        requestAnimationFrame(() => {
            callback();
        });
    }

    // Validate form data
    static validateForm(formData, rules) {
        const errors = {};
        
        for (const [field, value] of Object.entries(formData)) {
            const rule = rules[field];
            if (!rule) continue;
            
            if (rule.required && (!value || value.trim() === '')) {
                errors[field] = '此欄位為必填';
                continue;
            }
            
            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = `至少需要 ${rule.minLength} 個字元`;
            }
            
            if (rule.pattern && !rule.pattern.test(value)) {
                errors[field] = rule.message || '格式不正確';
            }
        }
        
        return errors;
    }
}

// Data Storage Manager
class DataStorage {
    constructor() {
        this.storageKey = 'shiftTool_v6_3';
        this.defaultData = {
            staff: [],
            schedules: {
                main: {},
                weekend: {}
            },
            settings: {
                workDaysPerWeek: 5,
                weekendRotation: 'weekly',
                exportFormat: 'excel',
                customHolidays: []
            },
            version: '6.3'
        };
    }

    // Load data from localStorage
    loadData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                // Merge with default data to handle missing properties
                return { ...this.defaultData, ...parsed };
            }
        } catch (error) {
            console.error('Error loading data:', error);
            NotificationManager.show('資料載入失敗', 'error');
        }
        return this.defaultData;
    }

    // Save data to localStorage with error handling
    saveData(data) {
        try {
            const dataToSave = { ...data, version: '6.3', lastModified: new Date().toISOString() };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            NotificationManager.show('資料儲存失敗', 'error');
            return false;
        }
    }

    // Get staff by ID
    getStaff(staffId) {
        const data = this.loadData();
        return data.staff.find(s => s.id === staffId);
    }

    // Add or update staff
    saveStaff(staffData) {
        const data = this.loadData();
        const existingIndex = data.staff.findIndex(s => s.id === staffData.id);
        
        if (existingIndex >= 0) {
            data.staff[existingIndex] = { ...data.staff[existingIndex], ...staffData };
        } else {
            staffData.id = staffData.id || Utils.generateId();
            staffData.createdAt = new Date().toISOString();
            data.staff.push(staffData);
        }
        
        return this.saveData(data);
    }

    // Delete staff
    deleteStaff(staffId) {
        const data = this.loadData();
        data.staff = data.staff.filter(s => s.id !== staffId);
        
        // Remove from schedules
        Object.keys(data.schedules.main).forEach(date => {
            data.schedules.main[date] = data.schedules.main[date].filter(id => id !== staffId);
            if (data.schedules.main[date].length === 0) {
                delete data.schedules.main[date];
            }
        });
        
        Object.keys(data.schedules.weekend).forEach(date => {
            data.schedules.weekend[date] = data.schedules.weekend[date].filter(id => id !== staffId);
            if (data.schedules.weekend[date].length === 0) {
                delete data.schedules.weekend[date];
            }
        });
        
        return this.saveData(data);
    }

    // Save schedule
    saveSchedule(date, staffIds, type = 'main') {
        const data = this.loadData();
        const dateStr = Utils.formatDate(date);
        
        if (staffIds && staffIds.length > 0) {
            data.schedules[type][dateStr] = staffIds;
        } else {
            delete data.schedules[type][dateStr];
        }
        
        return this.saveData(data);
    }

    // Get schedule for date
    getSchedule(date, type = 'main') {
        const data = this.loadData();
        const dateStr = Utils.formatDate(date);
        return data.schedules[type][dateStr] || [];
    }

    // Export data
    exportData(format = 'json') {
        const data = this.loadData();
        const timestamp = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        
        switch (format) {
            case 'json':
                return {
                    filename: `shift_tool_backup_${timestamp}.json`,
                    content: JSON.stringify(data, null, 2),
                    type: 'application/json'
                };
            case 'csv':
                return this.exportToCSV(data, timestamp);
            default:
                return null;
        }
    }

    // Export to CSV format
    exportToCSV(data, timestamp) {
        const staff = data.staff;
        const schedules = data.schedules;
        
        let csvContent = '日期,班表類型,人員姓名,部門\n';
        
        // Export main schedules
        Object.entries(schedules.main).forEach(([date, staffIds]) => {
            staffIds.forEach(staffId => {
                const staffMember = staff.find(s => s.id === staffId);
                if (staffMember) {
                    csvContent += `${date},主要班表,${staffMember.name},${staffMember.department || ''}\n`;
                }
            });
        });
        
        // Export weekend schedules
        Object.entries(schedules.weekend).forEach(([date, staffIds]) => {
            staffIds.forEach(staffId => {
                const staffMember = staff.find(s => s.id === staffId);
                if (staffMember) {
                    csvContent += `${date},次要班表,${staffMember.name},${staffMember.department || ''}\n`;
                }
            });
        });
        
        return {
            filename: `shift_schedule_${timestamp}.csv`,
            content: csvContent,
            type: 'text/csv'
        };
    }
}

// UI Elements Manager
class UIElements {
    constructor() {
        this.currentDate = new Date();
        this.currentScheduleType = 'main';
        this.selectedStaff = null;
    }

    // Initialize all UI components
    init() {
        this.renderCalendarHeaders();
        this.renderCalendar();
        this.renderStaffList();
        this.updateCurrentMonth();
        this.bindEvents();
    }

    // Render calendar headers
    renderCalendarHeaders() {
        const calendar = document.getElementById('calendar');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        // Clear existing content
        calendar.innerHTML = '';
        
        // Add weekday headers
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            header.setAttribute('role', 'columnheader');
            calendar.appendChild(header);
        });
    }

    // Render calendar with optimized DOM operations
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Remove existing day cells
        const existingDays = calendar.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());
        
        // Create document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Add previous month days
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayElement = this.createDayElement(
                new Date(year, month - 1, daysInPrevMonth - i),
                true
            );
            fragment.appendChild(dayElement);
        }
        
        // Add current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month, day),
                false
            );
            fragment.appendChild(dayElement);
        }
        
        // Add next month days to fill the grid
        const totalCells = fragment.children.length;
        const remainingCells = 35 - totalCells; // 5 rows × 7 days
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month + 1, day),
                true
            );
            fragment.appendChild(dayElement);
        }
        
        // Batch update DOM
        Utils.batchDOMUpdates(() => {
            calendar.appendChild(fragment);
        });
    }

    // Create individual day element
    createDayElement(date, isOtherMonth) {
        const dayElement = document.createElement('button');
        dayElement.className = 'calendar-day';
        dayElement.setAttribute('type', 'button');
        dayElement.setAttribute('role', 'gridcell');
        dayElement.setAttribute('tabindex', '0');
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // Check if today
        const today = new Date();
        if (Utils.formatDate(date) === Utils.formatDate(today)) {
            dayElement.classList.add('today');
            dayElement.setAttribute('aria-current', 'date');
        }
        
        // Check if holiday
        const data = app.dataStorage.loadData();
        if (Utils.isHoliday(date, data.settings.customHolidays)) {
            dayElement.classList.add('holiday');
        }
        
        // Create day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // Add scheduled staff
        const staffIds = app.dataStorage.getSchedule(date, this.currentScheduleType);
        staffIds.forEach(staffId => {
            const staff = app.dataStorage.getStaff(staffId);
            if (staff) {
                const staffElement = document.createElement('div');
                staffElement.className = 'day-staff';
                staffElement.textContent = staff.name;
                staffElement.style.backgroundColor = staff.color;
                dayElement.appendChild(staffElement);
            }
        });
        
        // Add click event
        dayElement.addEventListener('click', () => {
            this.handleDayClick(date);
        });
        
        // Add keyboard support
        dayElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleDayClick(date);
            }
        });
        
        return dayElement;
    }

    // Handle day click for scheduling
    handleDayClick(date) {
        if (!app.selectedStaff) {
            NotificationManager.show('請先選擇一位人員', 'warning');
            return;
        }
        
        const staffIds = app.dataStorage.getSchedule(date, this.currentScheduleType);
        const staffIndex = staffIds.indexOf(app.selectedStaff.id);
        
        if (staffIndex >= 0) {
            // Remove staff from schedule
            staffIds.splice(staffIndex, 1);
            NotificationManager.show(`已將 ${app.selectedStaff.name} 從 ${Utils.formatDate(date)} 移除`, 'info');
        } else {
            // Add staff to schedule
            staffIds.push(app.selectedStaff.id);
            NotificationManager.show(`已將 ${app.selectedStaff.name} 安排到 ${Utils.formatDate(date)}`, 'success');
        }
        
        app.dataStorage.saveSchedule(date, staffIds, this.currentScheduleType);
        this.renderCalendar();
    }

    // Render staff list with search and filter support
    renderStaffList(searchTerm = '', filter = 'all') {
        const staffList = document.getElementById('staffList');
        const data = app.dataStorage.loadData();
        let staff = data.staff;
        
        // Apply search filter
        if (searchTerm) {
            staff = staff.filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // Apply status filter
        if (filter !== 'all') {
            // For now, we'll consider all staff as active
            // This can be extended based on requirements
        }
        
        // Clear existing content
        staffList.innerHTML = '';
        
        if (staff.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p>沒有找到符合條件的人員</p>
                <button class="btn btn--primary" onclick="app.uiElements.showStaffModal()">
                    <i class="fas fa-plus"></i> 新增人員
                </button>
            `;
            staffList.appendChild(emptyState);
            return;
        }
        
        // Create document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
        staff.forEach(staffMember => {
            const staffCard = this.createStaffCard(staffMember);
            fragment.appendChild(staffCard);
        });
        
        // Batch update DOM
        Utils.batchDOMUpdates(() => {
            staffList.appendChild(fragment);
        });
    }

    // Create staff card element
    createStaffCard(staff) {
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.setAttribute('role', 'article');
        
        if (app.selectedStaff && app.selectedStaff.id === staff.id) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="staff-card-header">
                <div class="staff-color" style="background-color: ${staff.color}"></div>
                <h4 class="staff-name">${staff.name}</h4>
            </div>
            ${staff.department ? `<div class="staff-department">${staff.department}</div>` : ''}
            <div class="staff-actions">
                <button class="btn btn--sm btn--outline" onclick="app.uiElements.editStaff('${staff.id}')" aria-label="編輯 ${staff.name}">
                    <i class="fas fa-edit" aria-hidden="true"></i> 編輯
                </button>
                <button class="btn btn--sm btn--secondary" onclick="app.uiElements.selectStaff('${staff.id}')" aria-label="選擇 ${staff.name}">
                    <i class="fas fa-user-check" aria-hidden="true"></i> 選擇
                </button>
            </div>
        `;
        
        // Add click to select
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.selectStaff(staff.id);
            }
        });
        
        return card;
    }

    // Select staff for scheduling
    selectStaff(staffId) {
        const staff = app.dataStorage.getStaff(staffId);
        if (staff) {
            app.selectedStaff = staff;
            this.renderStaffList();
            NotificationManager.show(`已選擇 ${staff.name}`, 'info');
        }
    }

    // Edit staff
    editStaff(staffId) {
        const staff = app.dataStorage.getStaff(staffId);
        if (staff) {
            this.showStaffModal(staff);
        }
    }

    // Show staff modal
    showStaffModal(staff = null) {
        const modal = document.getElementById('staffModal');
        const title = document.getElementById('staffModalTitle');
        const form = document.getElementById('staffForm');
        
        // Reset form
        form.reset();
        
        if (staff) {
            title.textContent = '編輯人員';
            document.getElementById('staffName').value = staff.name;
            document.getElementById('staffDepartment').value = staff.department || '';
            document.getElementById('staffColor').value = staff.color;
            document.getElementById('staffMainSchedule').checked = staff.mainSchedule !== false;
            document.getElementById('staffWeekendSchedule').checked = staff.weekendSchedule === true;
            form.dataset.staffId = staff.id;
        } else {
            title.textContent = '新增人員';
            document.getElementById('staffColor').value = Utils.generateRandomColor();
            delete form.dataset.staffId;
        }
        
        this.showModal('staffModal');
    }

    // Show modal with accessibility support
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        const previousFocus = document.activeElement;
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus on first focusable element
        const focusableElements = modal.querySelectorAll('input, button, select, textarea');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
        
        // Store previous focus for restoration
        modal.dataset.previousFocus = previousFocus;
        
        // Trap focus within modal
        this.trapFocusInModal(modal);
    }

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        const previousFocus = document.querySelector(`[data-previous-focus]`) || document.body;
        
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        
        // Restore focus
        if (modal.dataset.previousFocus) {
            const elementToFocus = document.querySelector(`[data-id="${modal.dataset.previousFocus}"]`) || previousFocus;
            elementToFocus.focus();
        }
        
        delete modal.dataset.previousFocus;
    }

    // Trap focus within modal for accessibility
    trapFocusInModal(modal) {
        const focusableElements = modal.querySelectorAll(
            'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                this.hideModal(modal.id);
            }
        });
    }

    // Update current month display
    updateCurrentMonth() {
        const currentMonthElement = document.getElementById('currentMonth');
        currentMonthElement.textContent = Utils.formatDate(this.currentDate, 'YYYY年MM月');
    }

    // Navigate to previous month
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // Go to today
    goToToday() {
        this.currentDate = new Date();
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // Change schedule type
    changeScheduleType(type) {
        this.currentScheduleType = type;
        this.renderCalendar();
    }

    // Bind all event listeners
    bindEvents() {
        // Navigation events
        document.getElementById('prevMonth').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // Schedule type change
        document.getElementById('scheduleType').addEventListener('change', (e) => {
            this.changeScheduleType(e.target.value);
        });
        
        // Staff management events
        document.getElementById('addStaffBtn').addEventListener('click', () => this.showStaffModal());
        document.getElementById('manageStaffBtn').addEventListener('click', () => this.showStaffModal());
        
        // Search with debounce
        const searchInput = document.getElementById('staffSearch');
        const debouncedSearch = Utils.debounce((searchTerm) => {
            this.renderStaffList(searchTerm);
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        // Staff filter
        document.getElementById('staffFilter').addEventListener('change', (e) => {
            const searchTerm = document.getElementById('staffSearch').value;
            this.renderStaffList(searchTerm, e.target.value);
        });
        
        // Modal events
        this.bindModalEvents();
        
        // Settings and export events
        document.getElementById('settingsBtn').addEventListener('click', () => this.showModal('settingsModal'));
        document.getElementById('exportBtn').addEventListener('click', () => this.showModal('exportModal'));
        
        // Quick actions
        document.getElementById('clearScheduleBtn').addEventListener('click', () => this.clearSchedule());
        document.getElementById('autoScheduleBtn').addEventListener('click', () => this.autoSchedule());
    }

    // Bind modal events
    bindModalEvents() {
        // Close modal events
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });
        
        // Cancel button events
        document.getElementById('cancelStaffBtn').addEventListener('click', () => this.hideModal('staffModal'));
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => this.hideModal('settingsModal'));
        document.getElementById('cancelExportBtn').addEventListener('click', () => this.hideModal('exportModal'));
        
        // Save button events
        document.getElementById('saveStaffBtn').addEventListener('click', () => this.saveStaff());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('startExportBtn').addEventListener('click', () => this.startExport());
        
        // Tab navigation in settings
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // Save staff
    saveStaff() {
        const form = document.getElementById('staffForm');
        const formData = new FormData(form);
        
        const staffData = {
            id: form.dataset.staffId || null,
            name: formData.get('staffName') || document.getElementById('staffName').value,
            department: formData.get('staffDepartment') || document.getElementById('staffDepartment').value,
            color: document.getElementById('staffColor').value,
            mainSchedule: document.getElementById('staffMainSchedule').checked,
            weekendSchedule: document.getElementById('staffWeekendSchedule').checked
        };
        
        // Validate form
        const errors = Utils.validateForm(staffData, {
            name: { required: true, minLength: 1 }
        });
        
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, message]) => {
                const errorElement = document.getElementById(`${field}Error`);
                if (errorElement) {
                    errorElement.textContent = message;
                }
            });
            return;
        }
        
        if (app.dataStorage.saveStaff(staffData)) {
            this.hideModal('staffModal');
            this.renderStaffList();
            NotificationManager.show(
                staffData.id ? '人員資料已更新' : '新增人員成功',
                'success'
            );
        }
    }

    // Save settings
    saveSettings() {
        const data = app.dataStorage.loadData();
        
        data.settings = {
            workDaysPerWeek: parseInt(document.getElementById('workDaysPerWeek').value),
            weekendRotation: document.getElementById('weekendRotation').value,
            exportFormat: document.getElementById('exportFormat').value,
            customHolidays: document.getElementById('holidayList').value
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && line.match(/^\d{4}-\d{2}-\d{2}$/))
        };
        
        if (app.dataStorage.saveData(data)) {
            this.hideModal('settingsModal');
            this.renderCalendar(); // Re-render to show holiday changes
            NotificationManager.show('設定已儲存', 'success');
        }
    }

    // Start export process
    async startExport() {
        const format = document.getElementById('exportFileFormat').value;
        const type = document.getElementById('exportType').value;
        
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');
        
        progressContainer.classList.remove('hidden');
        
        // Simulate export progress
        const steps = ['準備資料...', '處理排班資訊...', '生成檔案...', '完成'];
        
        for (let i = 0; i < steps.length; i++) {
            progressText.textContent = steps[i];
            progressFill.style.width = `${((i + 1) / steps.length) * 100}%`;
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Generate and download file
        const exportData = app.dataStorage.exportData(format);
        if (exportData) {
            this.downloadFile(exportData.filename, exportData.content, exportData.type);
            NotificationManager.show('匯出完成', 'success');
        }
        
        this.hideModal('exportModal');
        progressContainer.classList.add('hidden');
        progressFill.style.width = '0%';
    }

    // Download file
    downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Switch tabs in settings modal
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Tab`);
        });
    }

    // Clear schedule
    clearSchedule() {
        if (confirm('確定要清空當前月份的班表嗎？此操作無法復原。')) {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const data = app.dataStorage.loadData();
            
            // Remove schedules for current month
            Object.keys(data.schedules[this.currentScheduleType]).forEach(dateStr => {
                const date = new Date(dateStr);
                if (date.getFullYear() === year && date.getMonth() === month) {
                    delete data.schedules[this.currentScheduleType][dateStr];
                }
            });
            
            if (app.dataStorage.saveData(data)) {
                this.renderCalendar();
                NotificationManager.show('班表已清空', 'info');
            }
        }
    }

    // Auto schedule (basic implementation)
    autoSchedule() {
        const data = app.dataStorage.loadData();
        const availableStaff = data.staff.filter(s => 
            this.currentScheduleType === 'main' ? s.mainSchedule !== false : s.weekendSchedule === true
        );
        
        if (availableStaff.length === 0) {
            NotificationManager.show('沒有可用的人員進行自動排班', 'warning');
            return;
        }
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let staffIndex = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            
            // Skip based on schedule type
            if (this.currentScheduleType === 'weekend' && dayOfWeek !== 0 && dayOfWeek !== 6) {
                continue;
            }
            if (this.currentScheduleType === 'main' && (dayOfWeek === 0 || dayOfWeek === 6)) {
                continue;
            }
            
            // Assign staff in rotation
            const staff = availableStaff[staffIndex % availableStaff.length];
            app.dataStorage.saveSchedule(date, [staff.id], this.currentScheduleType);
            staffIndex++;
        }
        
        this.renderCalendar();
        NotificationManager.show('自動排班完成', 'success');
    }
}

// Notification Manager
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        notification.className = 'notification';
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon ${type}">
                <i class="${icons[type]}" aria-hidden="true"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="關閉通知">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;
        
        // Add close event
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hide(notification);
        });
        
        // Add to container
        container.appendChild(notification);
        
        // Show with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto hide
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
    }
    
    static hide(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Main Application Class
class ShiftToolApp {
    constructor() {
        this.dataStorage = new DataStorage();
        this.uiElements = new UIElements();
        this.selectedStaff = null;
        this.isInitialized = false;
    }

    // Initialize application
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Simulate loading time for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Initialize UI
            this.uiElements.init();
            
            // Load settings
            this.loadSettings();
            
            // Hide loading screen and show main app
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            
            NotificationManager.show('系統已載入完成', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            NotificationManager.show('系統載入失敗', 'error');
            this.hideLoadingScreen();
        }
    }

    // Show loading screen
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        loadingScreen.style.display = 'flex';
        mainApp.classList.add('hidden');
    }

    // Hide loading screen
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainApp.classList.remove('hidden');
        }, 300);
    }

    // Load settings from storage
    loadSettings() {
        const data = this.dataStorage.loadData();
        const settings = data.settings;
        
        // Apply settings to UI
        document.getElementById('workDaysPerWeek').value = settings.workDaysPerWeek;
        document.getElementById('weekendRotation').value = settings.weekendRotation;
        document.getElementById('exportFormat').value = settings.exportFormat;
        document.getElementById('holidayList').value = settings.customHolidays.join('\n');
    }

    // Handle app errors
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        NotificationManager.show(
            context ? `${context} 發生錯誤` : '發生未知錯誤',
            'error'
        );
    }
}

// Initialize application when DOM is loaded
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ShiftToolApp();
    app.init().catch(error => {
        console.error('Failed to initialize app:', error);
    });
});

// Handle page visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app && app.isInitialized) {
        // Refresh data when page becomes visible
        app.uiElements.renderCalendar();
        app.uiElements.renderStaffList();
    }
});

// Handle window resize with throttle
window.addEventListener('resize', Utils.throttle(() => {
    if (app && app.isInitialized) {
        app.uiElements.renderCalendar();
    }
}, 250));

// Export for global access
window.ShiftToolApp = ShiftToolApp;
window.Utils = Utils;
window.NotificationManager = NotificationManager;