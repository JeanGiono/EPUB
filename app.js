// 排班管理工具 - 優化版
// 完全優化的排班管理系統，支援三輪序邏輯

// 工具函數類
class Utils {
    // 防抖函數，用於性能優化
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

    // 節流函數，用於性能優化
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

    // 生成隨機顏色
    static generateRandomColor() {
        const colors = [
            '#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F',
            '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 格式化日期
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

    // 獲取中文星期
    static getChineseWeekday(dayIndex) {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        return weekdays[dayIndex];
    }

    // 生成唯一ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 批量DOM操作
    static batchDOMUpdates(callback) {
        requestAnimationFrame(() => {
            callback();
        });
    }

    // 表單驗證
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

// 資料存儲管理器（使用內存存儲）
class DataStorage {
    constructor() {
        this.data = {
            staff: [
                {
                    id: 'staff1',
                    name: '張三',
                    department: '業務部',
                    color: '#1FB8CD',
                    mainSchedule: true,
                    weekendSchedule: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'staff2',
                    name: '李四',
                    department: '技術部',
                    color: '#FFC185',
                    mainSchedule: true,
                    weekendSchedule: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'staff3',
                    name: '王五',
                    department: '客服部',
                    color: '#B4413C',
                    mainSchedule: true,
                    weekendSchedule: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'staff4',
                    name: '趙六',
                    department: '行政部',
                    color: '#5D878F',
                    mainSchedule: true,
                    weekendSchedule: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'staff5',
                    name: '錢七',
                    department: '財務部',
                    color: '#DB4545',
                    mainSchedule: true,
                    weekendSchedule: true,
                    createdAt: new Date().toISOString()
                }
            ],
            schedules: {
                main: {},
                weekend: {}
            },
            settings: {
                startingStaff: null,
                rotationIndexes: {
                    monThu: 0,
                    fri: 0,
                    weekend: 0,
                    weekendSecondary: 0
                }
            },
            version: '1.0'
        };
    }

    // 載入資料
    loadData() {
        return this.data;
    }

    // 保存資料
    saveData(newData) {
        try {
            this.data = { ...this.data, ...newData, lastModified: new Date().toISOString() };
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            NotificationManager.show('資料儲存失敗', 'error');
            return false;
        }
    }

    // 根據ID獲取人員
    getStaff(staffId) {
        return this.data.staff.find(s => s.id === staffId);
    }

    // 新增或更新人員
    saveStaff(staffData) {
        const existingIndex = this.data.staff.findIndex(s => s.id === staffData.id);
        
        if (existingIndex >= 0) {
            this.data.staff[existingIndex] = { ...this.data.staff[existingIndex], ...staffData };
        } else {
            staffData.id = staffData.id || Utils.generateId();
            staffData.createdAt = new Date().toISOString();
            this.data.staff.push(staffData);
        }
        
        return this.saveData(this.data);
    }

    // 刪除人員
    deleteStaff(staffId) {
        this.data.staff = this.data.staff.filter(s => s.id !== staffId);
        
        // 從班表中移除
        Object.keys(this.data.schedules.main).forEach(date => {
            this.data.schedules.main[date] = this.data.schedules.main[date].filter(id => id !== staffId);
            if (this.data.schedules.main[date].length === 0) {
                delete this.data.schedules.main[date];
            }
        });
        
        Object.keys(this.data.schedules.weekend).forEach(date => {
            this.data.schedules.weekend[date] = this.data.schedules.weekend[date].filter(id => id !== staffId);
            if (this.data.schedules.weekend[date].length === 0) {
                delete this.data.schedules.weekend[date];
            }
        });
        
        return this.saveData(this.data);
    }

    // 保存班表
    saveSchedule(date, staffIds, type = 'main') {
        const dateStr = Utils.formatDate(date);
        
        if (staffIds && staffIds.length > 0) {
            this.data.schedules[type][dateStr] = Array.isArray(staffIds) ? staffIds : [staffIds];
        } else {
            delete this.data.schedules[type][dateStr];
        }
        
        return this.saveData(this.data);
    }

    // 獲取指定日期的班表
    getSchedule(date, type = 'main') {
        const dateStr = Utils.formatDate(date);
        return this.data.schedules[type][dateStr] || [];
    }

    // 匯出資料
    exportData(format = 'json') {
        const timestamp = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        
        switch (format) {
            case 'json':
                return {
                    filename: `shift_tool_backup_${timestamp}.json`,
                    content: JSON.stringify(this.data, null, 2),
                    type: 'application/json'
                };
            case 'csv':
                return this.exportToCSV(timestamp);
            default:
                return null;
        }
    }

    // 匯出為CSV格式
    exportToCSV(timestamp) {
        const staff = this.data.staff;
        const schedules = this.data.schedules;
        
        let csvContent = '日期,班表類型,人員姓名,部門\n';
        
        // 匯出主要班表
        Object.entries(schedules.main).forEach(([date, staffIds]) => {
            staffIds.forEach(staffId => {
                const staffMember = staff.find(s => s.id === staffId);
                if (staffMember) {
                    csvContent += `${date},主要班表,${staffMember.name},${staffMember.department || ''}\n`;
                }
            });
        });
        
        // 匯出次要班表
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

// UI元素管理器
class UIElements {
    constructor() {
        this.currentDate = new Date();
        this.currentScheduleType = 'main';
        this.selectedStaff = null;
    }

    // 初始化所有UI組件
    init() {
        this.renderCalendarHeaders();
        this.renderCalendar();
        this.renderStaffList();
        this.updateCurrentMonth();
        this.bindEvents();
        this.updateSelectedStaffInfo();
    }

    // 渲染日曆標題
    renderCalendarHeaders() {
        const calendar = document.getElementById('calendar');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        
        // 清除現有內容
        calendar.innerHTML = '';
        
        // 新增星期標題
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            header.setAttribute('role', 'columnheader');
            calendar.appendChild(header);
        });
    }

    // 渲染日曆
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 移除現有的日期格子
        const existingDays = calendar.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());
        
        // 創建文檔片段進行批量DOM更新
        const fragment = document.createDocumentFragment();
        
        // 獲取月份的第一天和最後一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // 新增上個月的日期
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayElement = this.createDayElement(
                new Date(year, month - 1, daysInPrevMonth - i),
                true
            );
            fragment.appendChild(dayElement);
        }
        
        // 新增當月日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month, day),
                false
            );
            fragment.appendChild(dayElement);
        }
        
        // 新增下個月的日期來填滿格子
        const totalCells = fragment.children.length;
        const remainingCells = 35 - totalCells; // 5 rows × 7 days
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month + 1, day),
                true
            );
            fragment.appendChild(dayElement);
        }
        
        // 批量更新DOM
        Utils.batchDOMUpdates(() => {
            calendar.appendChild(fragment);
        });
    }

    // 創建單個日期元素
    createDayElement(date, isOtherMonth) {
        const dayElement = document.createElement('button');
        dayElement.className = 'calendar-day';
        dayElement.setAttribute('type', 'button');
        dayElement.setAttribute('role', 'gridcell');
        dayElement.setAttribute('tabindex', '0');
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // 檢查是否為今天
        const today = new Date();
        if (Utils.formatDate(date) === Utils.formatDate(today)) {
            dayElement.classList.add('today');
            dayElement.setAttribute('aria-current', 'date');
        }
        
        // 創建日期數字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // 新增排班人員
        const staffIds = app.dataStorage.getSchedule(date, this.currentScheduleType);
        staffIds.forEach(staffId => {
            const staff = app.dataStorage.getStaff(staffId);
            if (staff) {
                const staffElement = document.createElement('div');
                staffElement.className = 'day-staff';
                staffElement.textContent = staff.name;
                staffElement.style.backgroundColor = staff.color;
                staffElement.style.color = this.getContrastColor(staff.color);
                dayElement.appendChild(staffElement);
            }
        });
        
        // 新增點擊事件
        dayElement.addEventListener('click', () => {
            this.handleDayClick(date);
        });
        
        // 新增鍵盤支援
        dayElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleDayClick(date);
            }
        });
        
        return dayElement;
    }

    // 獲取對比色
    getContrastColor(hexColor) {
        // 將十六進制轉換為RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // 計算亮度
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // 返回黑色或白色
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    // 處理日期點擊事件
    handleDayClick(date) {
        if (!this.selectedStaff) {
            NotificationManager.show('請先選擇一位人員', 'warning');
            return;
        }
        
        const staffIds = app.dataStorage.getSchedule(date, this.currentScheduleType);
        const staffIndex = staffIds.indexOf(this.selectedStaff.id);
        
        if (staffIndex >= 0) {
            // 從班表中移除人員
            staffIds.splice(staffIndex, 1);
            NotificationManager.show(`已將 ${this.selectedStaff.name} 從 ${Utils.formatDate(date)} 移除`, 'info');
        } else {
            // 新增人員到班表
            staffIds.push(this.selectedStaff.id);
            NotificationManager.show(`已將 ${this.selectedStaff.name} 安排到 ${Utils.formatDate(date)}`, 'success');
        }
        
        app.dataStorage.saveSchedule(date, staffIds, this.currentScheduleType);
        this.renderCalendar();
    }

    // 渲染人員列表
    renderStaffList(searchTerm = '') {
        const staffList = document.getElementById('staffList');
        const data = app.dataStorage.loadData();
        let staff = data.staff;
        
        // 套用搜尋篩選
        if (searchTerm) {
            staff = staff.filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // 根據班表類型篩選人員
        if (this.currentScheduleType === 'main') {
            staff = staff.filter(s => s.mainSchedule !== false);
        } else if (this.currentScheduleType === 'weekend') {
            staff = staff.filter(s => s.weekendSchedule === true);
        }
        
        // 清除現有內容
        staffList.innerHTML = '';
        
        if (staff.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p>沒有找到符合條件的人員</p>
                <button class="btn btn--primary" onclick="window.app.uiElements.showStaffModal()">
                    <i class="fas fa-plus"></i> 新增人員
                </button>
            `;
            staffList.appendChild(emptyState);
            return;
        }
        
        // 創建文檔片段進行批量DOM更新
        const fragment = document.createDocumentFragment();
        
        staff.forEach(staffMember => {
            const staffCard = this.createStaffCard(staffMember);
            fragment.appendChild(staffCard);
        });
        
        // 批量更新DOM
        Utils.batchDOMUpdates(() => {
            staffList.appendChild(fragment);
        });
    }

    // 創建人員卡片元素
    createStaffCard(staff) {
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.setAttribute('role', 'article');
        
        if (this.selectedStaff && this.selectedStaff.id === staff.id) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="staff-card-header">
                <div class="staff-color" style="background-color: ${staff.color}"></div>
                <h4 class="staff-name">${staff.name}</h4>
            </div>
            ${staff.department ? `<div class="staff-department">${staff.department}</div>` : ''}
            <div class="staff-actions">
                <button class="btn btn--sm btn--outline" data-action="edit" data-staff-id="${staff.id}" aria-label="編輯 ${staff.name}">
                    <i class="fas fa-edit" aria-hidden="true"></i> 編輯
                </button>
                <button class="btn btn--sm btn--secondary" data-action="select" data-staff-id="${staff.id}" aria-label="選擇 ${staff.name}">
                    <i class="fas fa-user-check" aria-hidden="true"></i> 選擇
                </button>
            </div>
        `;
        
        // 新增點擊選擇功能
        card.addEventListener('click', (e) => {
            if (e.target.closest('button[data-action="edit"]')) {
                this.editStaff(staff.id);
            } else if (e.target.closest('button[data-action="select"]') || !e.target.closest('button')) {
                this.selectStaff(staff.id);
            }
        });
        
        return card;
    }

    // 選擇人員進行排班
    selectStaff(staffId) {
        const staff = app.dataStorage.getStaff(staffId);
        if (staff) {
            this.selectedStaff = staff;
            this.renderStaffList();
            this.updateSelectedStaffInfo();
            NotificationManager.show(`已選擇 ${staff.name}`, 'info');
        }
    }

    // 更新選中人員資訊
    updateSelectedStaffInfo() {
        const selectedStaffInfo = document.getElementById('selectedStaffInfo');
        if (this.selectedStaff) {
            selectedStaffInfo.textContent = `已選擇：${this.selectedStaff.name}`;
            selectedStaffInfo.style.color = this.selectedStaff.color;
        } else {
            selectedStaffInfo.textContent = '請選擇人員進行排班';
            selectedStaffInfo.style.color = '';
        }
    }

    // 編輯人員
    editStaff(staffId) {
        const staff = app.dataStorage.getStaff(staffId);
        if (staff) {
            this.showStaffModal(staff);
        }
    }

    // 顯示人員模態框
    showStaffModal(staff = null) {
        const modal = document.getElementById('staffModal');
        const title = document.getElementById('staffModalTitle');
        const form = document.getElementById('staffForm');
        
        // 重置表單
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

    // 顯示模態框
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        
        // 聚焦到第一個可聚焦元素
        setTimeout(() => {
            const focusableElements = modal.querySelectorAll('input, button, select, textarea');
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }, 100);
        
        // 在模態框內捕獲焦點
        this.trapFocusInModal(modal);
    }

    // 隱藏模態框
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    // 在模態框內捕獲焦點，提升可訪問性
    trapFocusInModal(modal) {
        const focusableElements = modal.querySelectorAll(
            'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleKeyDown = (e) => {
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
                modal.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        modal.addEventListener('keydown', handleKeyDown);
    }

    // 更新當前月份顯示
    updateCurrentMonth() {
        const currentMonthElement = document.getElementById('currentMonth');
        currentMonthElement.textContent = Utils.formatDate(this.currentDate, 'YYYY年MM月');
    }

    // 導航到上個月
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // 導航到下個月
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // 回到今天
    goToToday() {
        this.currentDate = new Date();
        this.updateCurrentMonth();
        this.renderCalendar();
    }

    // 變更班表類型
    changeScheduleType(type) {
        this.currentScheduleType = type;
        this.renderCalendar();
        this.renderStaffList();
    }

    // 綁定所有事件監聽器
    bindEvents() {
        // 導航事件
        document.getElementById('prevMonth').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // 班表類型變更
        document.getElementById('scheduleType').addEventListener('change', (e) => {
            this.changeScheduleType(e.target.value);
        });
        
        // 人員管理事件
        document.getElementById('addStaffBtn').addEventListener('click', () => this.showStaffModal());
        
        // 搜尋功能（使用防抖）
        const searchInput = document.getElementById('staffSearch');
        const debouncedSearch = Utils.debounce((searchTerm) => {
            this.renderStaffList(searchTerm);
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        // 模態框事件
        this.bindModalEvents();
        
        // 設定和匯出事件
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.showModal('exportModal'));
        
        // 快速操作
        document.getElementById('clearScheduleBtn').addEventListener('click', () => this.clearSchedule());
        document.getElementById('autoScheduleBtn').addEventListener('click', () => this.autoSchedule());
    }

    // 綁定模態框事件
    bindModalEvents() {
        // 關閉模態框事件
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });
        
        // 取消按鈕事件
        const cancelStaffBtn = document.getElementById('cancelStaffBtn');
        const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        const cancelExportBtn = document.getElementById('cancelExportBtn');
        
        if (cancelStaffBtn) {
            cancelStaffBtn.addEventListener('click', () => this.hideModal('staffModal'));
        }
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => this.hideModal('settingsModal'));
        }
        if (cancelExportBtn) {
            cancelExportBtn.addEventListener('click', () => this.hideModal('exportModal'));
        }
        
        // 儲存按鈕事件
        const saveStaffBtn = document.getElementById('saveStaffBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const startExportBtn = document.getElementById('startExportBtn');
        
        if (saveStaffBtn) {
            saveStaffBtn.addEventListener('click', () => this.saveStaff());
        }
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        if (startExportBtn) {
            startExportBtn.addEventListener('click', () => this.startExport());
        }
        
        // 點擊背景關閉模態框
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // 儲存人員
    saveStaff() {
        const form = document.getElementById('staffForm');
        
        const staffData = {
            id: form.dataset.staffId || null,
            name: document.getElementById('staffName').value,
            department: document.getElementById('staffDepartment').value,
            color: document.getElementById('staffColor').value,
            mainSchedule: document.getElementById('staffMainSchedule').checked,
            weekendSchedule: document.getElementById('staffWeekendSchedule').checked
        };
        
        // 驗證表單
        const errors = Utils.validateForm(staffData, {
            name: { required: true, minLength: 1 }
        });
        
        // 清除之前的錯誤
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
            this.updateStartingStaffOptions();
            NotificationManager.show(
                staffData.id ? '人員資料已更新' : '新增人員成功',
                'success'
            );
        }
    }

    // 顯示設定模態框
    showSettingsModal() {
        this.updateStartingStaffOptions();
        this.showModal('settingsModal');
    }

    // 更新起始人員選項
    updateStartingStaffOptions() {
        const select = document.getElementById('startingStaff');
        if (!select) return;
        
        const data = app.dataStorage.loadData();
        
        select.innerHTML = '<option value="">請選擇起始人員</option>';
        
        data.staff.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.name;
            if (data.settings.startingStaff === staff.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // 儲存設定
    saveSettings() {
        const startingStaffSelect = document.getElementById('startingStaff');
        if (!startingStaffSelect) return;
        
        const data = app.dataStorage.loadData();
        data.settings.startingStaff = startingStaffSelect.value;
        
        if (app.dataStorage.saveData(data)) {
            this.hideModal('settingsModal');
            NotificationManager.show('設定已儲存', 'success');
        }
    }

    // 開始匯出流程
    async startExport() {
        const formatSelect = document.getElementById('exportFormat');
        const typeSelect = document.getElementById('exportType');
        
        if (!formatSelect || !typeSelect) return;
        
        const format = formatSelect.value;
        const type = typeSelect.value;
        
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');
        
        progressContainer.classList.remove('hidden');
        
        // 模擬匯出進度
        const steps = ['準備資料...', '處理排班資訊...', '生成檔案...', '完成'];
        
        for (let i = 0; i < steps.length; i++) {
            progressText.textContent = steps[i];
            progressFill.style.width = `${((i + 1) / steps.length) * 100}%`;
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 生成並下載檔案
        const exportData = app.dataStorage.exportData(format);
        if (exportData) {
            this.downloadFile(exportData.filename, exportData.content, exportData.type);
            NotificationManager.show('匯出完成', 'success');
        }
        
        this.hideModal('exportModal');
        progressContainer.classList.add('hidden');
        progressFill.style.width = '0%';
    }

    // 下載檔案
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

    // 清空班表
    clearSchedule() {
        if (confirm('確定要清空當前月份的班表嗎？此操作無法復原。')) {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const data = app.dataStorage.loadData();
            
            // 移除當前月份的班表
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

    // 自動排班（核心三輪序邏輯）
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
        
        // 獲取輪序索引
        let { monThu, fri, weekend, weekendSecondary } = data.settings.rotationIndexes;
        
        // 如果有設定起始人員，重置索引
        if (data.settings.startingStaff) {
            const startingIndex = availableStaff.findIndex(s => s.id === data.settings.startingStaff);
            if (startingIndex >= 0) {
                monThu = fri = weekend = weekendSecondary = startingIndex;
            }
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0=週日, 1=週一, ..., 6=週六
            
            let staffToAssign = null;
            
            if (this.currentScheduleType === 'main') {
                // 主要班表：三輪序邏輯
                if (dayOfWeek >= 1 && dayOfWeek <= 4) {
                    // 週一至週四：使用連續輪序
                    staffToAssign = availableStaff[monThu % availableStaff.length];
                    monThu = (monThu + 1) % availableStaff.length;
                } else if (dayOfWeek === 5) {
                    // 週五：使用獨立輪序
                    staffToAssign = availableStaff[fri % availableStaff.length];
                    fri = (fri + 1) % availableStaff.length;
                } else if (dayOfWeek === 6 || dayOfWeek === 0) {
                    // 週六日：使用共同輪序
                    staffToAssign = availableStaff[weekend % availableStaff.length];
                    weekend = (weekend + 1) % availableStaff.length;
                }
            } else if (this.currentScheduleType === 'weekend') {
                // 次要班表：僅週末，使用獨立輪序
                if (dayOfWeek === 6 || dayOfWeek === 0) {
                    staffToAssign = availableStaff[weekendSecondary % availableStaff.length];
                    weekendSecondary = (weekendSecondary + 1) % availableStaff.length;
                }
            }
            
            if (staffToAssign) {
                app.dataStorage.saveSchedule(date, [staffToAssign.id], this.currentScheduleType);
            }
        }
        
        // 儲存更新的輪序索引
        data.settings.rotationIndexes = { monThu, fri, weekend, weekendSecondary };
        app.dataStorage.saveData(data);
        
        this.renderCalendar();
        NotificationManager.show('自動排班完成', 'success');
    }
}

// 通知管理器
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
        
        // 新增關閉事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hide(notification);
        });
        
        // 新增到容器
        container.appendChild(notification);
        
        // 顯示動畫
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // 自動隱藏
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

// 主應用程式類別
class ShiftToolApp {
    constructor() {
        this.dataStorage = new DataStorage();
        this.uiElements = new UIElements();
        this.isInitialized = false;
    }

    // 初始化應用程式
    async init() {
        if (this.isInitialized) return;
        
        try {
            // 顯示載入畫面
            this.showLoadingScreen();
            
            // 模擬載入時間以提供更好的用戶體驗
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 初始化UI
            this.uiElements.init();
            
            // 隱藏載入畫面並顯示主應用程式
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            
            NotificationManager.show('系統已載入完成', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            NotificationManager.show('系統載入失敗', 'error');
            this.hideLoadingScreen();
        }
    }

    // 顯示載入畫面
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        loadingScreen.style.display = 'flex';
        mainApp.classList.add('hidden');
    }

    // 隱藏載入畫面
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainApp.classList.remove('hidden');
        }, 300);
    }

    // 處理應用程式錯誤
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        NotificationManager.show(
            context ? `${context} 發生錯誤` : '發生未知錯誤',
            'error'
        );
    }
}

// 初始化應用程式
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ShiftToolApp();
    window.app = app; // 全域存取
    app.init().catch(error => {
        console.error('Failed to initialize app:', error);
    });
});

// 處理頁面可見性變更以優化性能
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app && app.isInitialized) {
        // 當頁面變為可見時重新整理資料
        app.uiElements.renderCalendar();
        app.uiElements.renderStaffList();
    }
});

// 處理視窗大小變更（使用節流）
window.addEventListener('resize', Utils.throttle(() => {
    if (app && app.isInitialized) {
        app.uiElements.renderCalendar();
    }
}, 250));

// 匯出供全域存取
window.ShiftToolApp = ShiftToolApp;
window.Utils = Utils;
window.NotificationManager = NotificationManager;