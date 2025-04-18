// Global variables
let schedules = [];

// DOM elements
const elements = {
  homeBtn: document.getElementById('home'),
  addScheduleBtn: document.getElementById('add-schedule'),
  viewTemplatesBtn: document.getElementById('view-templates'),
  openSettingsBtn: document.getElementById('open-settings'),
  scheduleList: document.getElementById('schedule-list'),
  addScheduleForm: document.getElementById('add-schedule-form'),
  scheduleForm: document.getElementById('schedule-form'),
  cancelAddBtn: document.getElementById('cancel-add'),
  templatesSection: document.getElementById('templates'),
  backFromTemplatesBtn: document.getElementById('back-from-templates'),
  settingsSection: document.getElementById('settings'),
  backFromSettingsBtn: document.getElementById('back-from-settings'),
  notificationToggle: document.getElementById('notification-toggle'),
  resetAllBtn: document.getElementById('reset-all'),
  todayScheduleSection: document.getElementById('today-schedule')
};

// Preset templates
const templates = {
  'basic-daily': {
    title: 'Basic Daily Care',
    description: 'Basic daily care plan suitable for most pets',
    schedules: [
      { name: 'Breakfast', time: '07:30', frequency: 'daily', note: 'Breakfast portion: 1 serving' },
      { name: 'Lunch', time: '12:30', frequency: 'daily', note: 'Lunch portion: 1 serving' },
      { name: 'Dinner', time: '18:30', frequency: 'daily', note: 'Dinner portion: 1 serving' },
      { name: 'Water Change', time: '08:00', frequency: 'daily', note: 'Replace with fresh water' },
      { name: 'Grooming', time: '20:00', frequency: 'daily', note: 'Daily fur brushing' }
    ]
  },
  'puppy-care': {
    title: 'Puppy Care',
    description: 'Care plan for puppies under 6 months',
    schedules: [
      { name: 'Breakfast', time: '07:00', frequency: 'daily', note: '1 portion puppy food' },
      { name: 'Morning Snack', time: '10:00', frequency: 'daily', note: 'Small treat' },
      { name: 'Lunch', time: '13:00', frequency: 'daily', note: '1 portion puppy food' },
      { name: 'Afternoon Snack', time: '16:00', frequency: 'daily', note: 'Small treat' },
      { name: 'Dinner', time: '19:00', frequency: 'daily', note: '1 portion puppy food' },
      { name: 'Water Change', time: '08:00', frequency: 'daily', note: 'Replace with fresh water' },
      { name: 'Exercise', time: '09:00', frequency: 'daily', note: '15 min morning walk' },
      { name: 'Exercise', time: '17:00', frequency: 'daily', note: '15 min evening walk' }
    ]
  },
  'kitten-care': {
    title: 'Kitten Care',
    description: 'Care plan for kittens under 6 months',
    schedules: [
      { name: 'Breakfast', time: '07:00', frequency: 'daily', note: '1 portion kitten food' },
      { name: 'Lunch', time: '13:00', frequency: 'daily', note: '1 portion kitten food' },
      { name: 'Dinner', time: '19:00', frequency: 'daily', note: '1 portion kitten food' },
      { name: 'Water Change', time: '08:00', frequency: 'daily', note: 'Replace with fresh water' },
      { name: 'Litter Box', time: '08:30', frequency: 'daily', note: 'Clean litter box' },
      { name: 'Litter Box', time: '20:30', frequency: 'daily', note: 'Clean litter box' },
      { name: 'Playtime', time: '10:00', frequency: 'daily', note: '15 min interactive play' },
      { name: 'Playtime', time: '16:00', frequency: 'daily', note: '15 min interactive play' }
    ]
  },
  'medical-care': {
    title: 'Medical Care',
    description: 'Care plan for sick or post-surgery recovery',
    schedules: [
      { name: 'Temperature Check', time: '07:00', frequency: 'daily', note: 'Record temperature' },
      { name: 'Morning Meds', time: '08:00', frequency: 'daily', note: 'Take morning medication' },
      { name: 'Afternoon Meds', time: '14:00', frequency: 'daily', note: 'Take afternoon medication' },
      { name: 'Evening Meds', time: '20:00', frequency: 'daily', note: 'Take evening medication' },
      { name: 'Wound Care', time: '10:00', frequency: 'daily', note: 'Clean and disinfect' },
      { name: 'Health Log', time: '21:00', frequency: 'daily', note: 'Record daily condition' }
    ]
  },
  'grooming': {
    title: 'Grooming Care',
    description: 'Regular grooming and cleaning care plan',
    schedules: [
      { name: 'Brushing', time: '09:00', frequency: 'daily', note: 'Daily brushing' },
      { name: 'Teeth', time: '20:00', frequency: 'daily', note: 'Teeth cleaning' },
      { name: 'Bath', time: '14:00', frequency: 'weekly', note: 'Weekly bath' },
      { name: 'Nail Trim', time: '15:00', frequency: 'weekly', note: 'Weekly nail trimming' },
      { name: 'Ear Clean', time: '16:00', frequency: 'weekly', note: 'Weekly ear cleaning' }
    ]
  },
  'training': {
    title: 'Training Plan',
    description: 'Basic training and behavior development plan',
    schedules: [
      { name: 'Morning Training', time: '08:30', frequency: 'daily', note: 'Basic command training' },
      { name: 'Outdoor Training', time: '16:30', frequency: 'daily', note: 'Outdoor behavior training' },
      { name: 'Interactive Games', time: '19:30', frequency: 'daily', note: 'Mental stimulation games' }
    ]
  }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Load saved schedules
  loadSchedules();
  
  // Load settings
  loadSettings();
  
  // Bind event listeners
  bindEventListeners();
  
  // Set "Add Schedule" button as active by default
  updateActiveButton(elements.addScheduleBtn);
  
  // Clean invalid schedules
  cleanInvalidSchedules();

  // 检查是否有待处理提醒并展示
  showPendingReminder();

  // 清除徽章和停止闪烁
  console.log('Attempting to remove all reminders and clear badge');
  chrome.runtime.sendMessage({ action: 'removeAllReminders' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error removing all reminders:', chrome.runtime.lastError);
    } else {
      console.log('Successfully removed all reminders');
    }
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF' });
  });
});

// Update active button style
function updateActiveButton(activeButton) {
  // Remove active class from all buttons
  elements.homeBtn.classList.remove('active');
  elements.addScheduleBtn.classList.remove('active');
  elements.viewTemplatesBtn.classList.remove('active');
  elements.openSettingsBtn.classList.remove('active');
  
  // Add active class to current button
  activeButton.classList.add('active');
}

// Bind event listeners
function bindEventListeners() {
  // Navigation buttons
  elements.homeBtn.addEventListener('click', showHome);
  elements.addScheduleBtn.addEventListener('click', showAddScheduleForm);
  elements.viewTemplatesBtn.addEventListener('click', showTemplates);
  elements.openSettingsBtn.addEventListener('click', showSettings);

  // Show home by default
  showHome();
  
  // Add click event to logo/title to show schedule list
  document.querySelector('.logo').addEventListener('click', () => {
    hideAddScheduleForm();
    hideTemplates();
    hideSettings();
    elements.todayScheduleSection.classList.remove('hidden');
    updateActiveButton(elements.addScheduleBtn);
  });
  
  // Form submission
  elements.scheduleForm.addEventListener('submit', handleFormSubmit);
  elements.cancelAddBtn.addEventListener('click', hideAddScheduleForm);
  
  // Frequency selection change event to show/hide weekday selector
  document.getElementById('task-frequency').addEventListener('change', function(e) {
    const weekdaySelector = document.getElementById('weekday-selector');
    if (e.target.value === 'weekly') {
      weekdaySelector.style.display = 'block';
    } else {
      weekdaySelector.style.display = 'none';
    }
  });
  
  // Template related
  document.querySelectorAll('.apply-template').forEach(btn => {
    btn.addEventListener('click', applyTemplate);
  });
  
  // Settings related
  elements.notificationToggle.addEventListener('change', saveSettings);
}

// Show home section
function showHome() {
  elements.todayScheduleSection.classList.remove('hidden');
  elements.addScheduleForm.classList.add('hidden');
  elements.templatesSection.classList.add('hidden');
  elements.settingsSection.classList.add('hidden');
  updateActiveButton(elements.homeBtn);
}

// Show/hide sections
function showAddScheduleForm() {
  elements.todayScheduleSection.classList.add('hidden');
  elements.addScheduleForm.classList.remove('hidden');
  elements.templatesSection.classList.add('hidden');
  elements.settingsSection.classList.add('hidden');
  
  // Update active button style
  updateActiveButton(elements.addScheduleBtn);
}

function hideAddScheduleForm() {
  elements.addScheduleForm.classList.add('hidden');
  elements.todayScheduleSection.classList.remove('hidden');
  elements.scheduleForm.reset();
  
  // Update active button style
  updateActiveButton(elements.addScheduleBtn);
}

function renderTemplates() {
  const templatesContainer = document.querySelector('.templates-container');
  templatesContainer.innerHTML = '';

  Object.keys(templates).forEach(key => {
    const template = templates[key];
    const templateElement = document.createElement('div');
    templateElement.classList.add('template-item');
    templateElement.innerHTML = `
      <h3>${template.title}</h3>
      <p>${template.description}</p>
      <button class="apply-template" data-template="${key}">Apply</button>
    `;
    templatesContainer.appendChild(templateElement);
  });

  // Re-bind event listeners for new buttons
  document.querySelectorAll('.apply-template').forEach(btn => {
    btn.addEventListener('click', applyTemplate);
  });
}

// Call renderTemplates when showing templates
function showTemplates() {
  elements.todayScheduleSection.classList.add('hidden');
  elements.addScheduleForm.classList.add('hidden');
  elements.templatesSection.classList.remove('hidden');
  elements.settingsSection.classList.add('hidden');

  // Update active button style
  updateActiveButton(elements.viewTemplatesBtn);

  // Render templates
  renderTemplates();
}

function hideTemplates() {
  elements.templatesSection.classList.add('hidden');
  elements.todayScheduleSection.classList.remove('hidden');
  
  // Update active button style
  updateActiveButton(elements.addScheduleBtn);
}

function showSettings() {
  elements.todayScheduleSection.classList.add('hidden');
  elements.addScheduleForm.classList.add('hidden');
  elements.templatesSection.classList.add('hidden');
  elements.settingsSection.classList.remove('hidden');
  
  // Update active button style
  updateActiveButton(elements.openSettingsBtn);
}

function hideSettings() {
  elements.settingsSection.classList.add('hidden');
  elements.todayScheduleSection.classList.remove('hidden');
  
  // Update active button style
  updateActiveButton(elements.addScheduleBtn);
}

// Form submission handling
function handleFormSubmit(e) {
  e.preventDefault();
  
  const taskName = document.getElementById('task-name').value.trim();
  const taskTime = document.getElementById('task-time').value;
  const taskFrequency = document.getElementById('task-frequency').value;
  const taskNote = document.getElementById('task-note').value.trim();
  
  // Strictly validate required fields
  if (!taskName) {
    showTemporaryMessage('Please enter a task name');
    return;
  }
  
  if (!taskTime) {
    showTemporaryMessage('Please select a time');
    return;
  }
  
  // Validate time format
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timePattern.test(taskTime)) {
    showTemporaryMessage('Invalid time format');
    return;
  }
  
  // Handle weekday selection
  let selectedDays = [];
  if (taskFrequency === 'weekly') {
    const checkedDays = document.querySelectorAll('#weekday-selector input[type="checkbox"]:checked');
    if (checkedDays.length === 0) {
      showTemporaryMessage('Please select at least one day');
      return;
    }
    checkedDays.forEach(checkbox => {
      selectedDays.push(parseInt(checkbox.value));
    });
  }
  
  const newSchedule = {
    id: Date.now(),
    name: taskName,
    time: taskTime,
    frequency: taskFrequency,
    note: taskNote,
    active: true,
    weekdays: selectedDays
  };
  
  try {
    // Attempt to set reminder first
    chrome.runtime.sendMessage({
      action: 'setReminder',
      schedule: newSchedule
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error setting reminder:', chrome.runtime.lastError);
        showTemporaryMessage('Failed to set reminder, please try again');
        return;
      }
      
      if (response && response.success) {
        // Save schedule after reminder is set successfully
        schedules.push(newSchedule);
        saveSchedules();
        renderSchedules();
        elements.scheduleForm.reset();
        hideAddScheduleForm();
        showTemporaryMessage('Schedule added');
      } else {
        showTemporaryMessage('Failed to set reminder, please try again');
      }
    });
  } catch (error) {
    console.error('Error in handleFormSubmit:', error);
    showTemporaryMessage('Failed to add schedule, please try again');
  }
}

// Modify setReminder function
async function setReminder(schedule) {
  try {
    // Validate data integrity
    if (!schedule.name || !schedule.time || !schedule.frequency) {
      showTemporaryMessage('Please complete the schedule information');
      return false;
    }

    // Validate time format
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(schedule.time)) {
      showTemporaryMessage('Invalid time format');
      return false;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'setReminder',
      schedule: schedule
    });

    if (response.success) {
      console.log('Reminder set successfully for:', schedule);
      return true;
    } else {
      console.error('Failed to set reminder:', response.error);
      showTemporaryMessage('Failed to set reminder, please try again');
      return false;
    }
  } catch (error) {
    console.error('Error setting reminder:', error);
    showTemporaryMessage('Failed to set reminder, please try again');
    return false;
  }
}

// Apply template
function applyTemplate(e) {
  const templateName = e.target.dataset.template;
  const templateData = templates[templateName];
  
  if (templateData && templateData.schedules) {
    let successCount = 0;
    const totalSchedules = templateData.schedules.length;
    
    // 添加所有日程
    templateData.schedules.forEach(template => {
      const newSchedule = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: template.name,
        time: template.time,
        frequency: template.frequency,
        note: template.note,
        active: true
      };
      
      // 设置提醒
      chrome.runtime.sendMessage({
        action: 'setReminder',
        schedule: newSchedule
      }, response => {
        if (response && response.success) {
          successCount++;
          schedules.push(newSchedule);
          
          if (successCount === totalSchedules) {
            // 所有日程都添加成功后
            saveSchedules();
            renderSchedules();
            hideTemplates();
            showTemporaryMessage('护理计划已应用');
          }
        }
      });
    });
  }
}

// Render schedule list
function renderSchedules() {
  const scheduleList = elements.scheduleList;
  
  // Clear current list
  scheduleList.innerHTML = '';
  
  if (schedules.length === 0) {
    scheduleList.innerHTML = '<div class="empty-state">No schedules yet. Click "Add Schedule" or "View Templates" to get started</div>';
    return;
  }
  
  // Sort by time
  const sortedSchedules = [...schedules].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  // Create schedule items
  sortedSchedules.forEach(schedule => {
    const scheduleItem = document.createElement('div');
    scheduleItem.className = `schedule-item ${!schedule.active ? 'inactive' : ''}`;
    scheduleItem.dataset.id = schedule.id;
    
    const timeFormatted = formatTime(schedule.time);
    const frequencyText = getFrequencyText(schedule.frequency);
    
    scheduleItem.innerHTML = `
      <div class="schedule-info">
        <div class="schedule-time">${timeFormatted}</div>
        <div class="schedule-name">${schedule.name}</div>
        <div class="schedule-frequency">${frequencyText}</div>
        ${schedule.note ? `<div class="schedule-note">${schedule.note}</div>` : ''}
      </div>
      <div class="schedule-actions">
        <label class="switch toggle-schedule" title="${schedule.active ? 'Pause' : 'Enable'}">
          <input type="checkbox" ${schedule.active ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
        <button class="btn secondary edit-schedule" title="Edit">Edit</button>
        <button class="btn danger delete-schedule" title="Delete">Delete</button>
      </div>
    `;
    
    scheduleList.appendChild(scheduleItem);
    
    // 添加事件监听器
    scheduleItem.querySelector('.toggle-schedule input').addEventListener('change', () => toggleSchedule(schedule.id));
    scheduleItem.querySelector('.edit-schedule').addEventListener('click', () => editSchedule(schedule.id));
    scheduleItem.querySelector('.delete-schedule').addEventListener('click', () => deleteSchedule(schedule.id));
  });
}

// 格式化时间显示
function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

// Get frequency text
function getFrequencyText(frequency) {
  const frequencyMap = {
    'daily': 'Daily',
    'weekly': 'Weekly',
    'weekdays': 'Weekdays',
    'weekends': 'Weekends'
  };
  return frequencyMap[frequency] || frequency;
}

// 切换日程状态（启用/暂停）
function toggleSchedule(id) {
  const scheduleIndex = schedules.findIndex(s => s.id === id);
  if (scheduleIndex !== -1) {
    schedules[scheduleIndex].active = !schedules[scheduleIndex].active;
    
    // 更新存储和UI
    saveSchedules();
    renderSchedules();
    
    // 更新提醒
    if (schedules[scheduleIndex].active) {
      setReminder(schedules[scheduleIndex]);
    } else {
      removeReminder(schedules[scheduleIndex]);
    }
  }
}

// 编辑日程
function editSchedule(id) {
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return;
  
  // 填充表单
  document.getElementById('task-name').value = schedule.name;
  document.getElementById('task-time').value = schedule.time;
  document.getElementById('task-frequency').value = schedule.frequency;
  document.getElementById('task-note').value = schedule.note || '';
  
  // 显示表单
  showAddScheduleForm();
  
  // 移除默认的表单提交处理函数
  elements.scheduleForm.removeEventListener('submit', handleFormSubmit);

  // 修改表单提交处理
  const submitHandler = async function(e) {
    e.preventDefault();
    
    // 更新日程
    schedule.name = document.getElementById('task-name').value;
    schedule.time = document.getElementById('task-time').value;
    schedule.frequency = document.getElementById('task-frequency').value;
    schedule.note = document.getElementById('task-note').value;
    
    // 更新提醒
    await removeReminder(schedule);
    const reminderSet = await setReminder(schedule);
    
    if (reminderSet) {
      // Save to storage
      saveSchedules();
      
      // Update UI
      renderSchedules();
      
      // 重置表单并返回主界面
      elements.scheduleForm.reset();
      hideAddScheduleForm();
      
      // 恢复默认的表单提交处理函数
      elements.scheduleForm.addEventListener('submit', handleFormSubmit);
    }
  };
  
  // 修改取消按钮处理
  const cancelHandler = function() {
    hideAddScheduleForm();
    elements.scheduleForm.removeEventListener('submit', submitHandler);
    elements.cancelAddBtn.removeEventListener('click', cancelHandler);
  };
  
  // 添加临时事件处理函数
  elements.scheduleForm.addEventListener('submit', submitHandler);
  elements.cancelAddBtn.addEventListener('click', cancelHandler);
}

// Delete schedule
function deleteSchedule(id) {
  // Directly delete schedule without confirmation
  const scheduleIndex = schedules.findIndex(s => s.id === id);
  if (scheduleIndex !== -1) {
    // Remove reminder
    removeReminder(schedules[scheduleIndex]);
    
    // Remove from array
    schedules.splice(scheduleIndex, 1);
    
    // Update storage and UI
    saveSchedules();
    renderSchedules();
    
    // Show temporary message (optional)
    showTemporaryMessage('Care plan deleted');
  }
}

// Show temporary message
function showTemporaryMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'temporary-message';
  messageElement.textContent = message;
  document.body.appendChild(messageElement);
  
  // Auto disappear after 2 seconds
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(messageElement);
    }, 300);
  }, 2000);
}

// Update setReminder function
async function setReminder(schedule) {
  try {
    // Validate data integrity
    if (!schedule.name || !schedule.time || !schedule.frequency) {
      showTemporaryMessage('Please complete the schedule information');
      return false;
    }

    // Validate time format
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(schedule.time)) {
      showTemporaryMessage('Invalid time format');
      return false;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'setReminder',
      schedule: schedule
    });

    if (response.success) {
      console.log('Reminder set successfully for:', schedule);
      return true;
    } else {
      console.error('Failed to set reminder:', response.error);
      showTemporaryMessage('Failed to set reminder, please try again');
      return false;
    }
  } catch (error) {
    console.error('Error setting reminder:', error);
    showTemporaryMessage('Failed to set reminder, please try again');
    return false;
  }
}

// Remove reminder
function removeReminder(schedule) {
  chrome.runtime.sendMessage({
    action: 'removeReminder',
    scheduleId: schedule.id
  });
}

// Load schedules
function loadSchedules() {
  chrome.storage.local.get('schedules', (result) => {
    schedules = result.schedules || [];
    renderSchedules();
  });
}

// Save schedules
function saveSchedules() {
  chrome.storage.local.set({ 'schedules': schedules });
}

// Load settings
function loadSettings() {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || { notifications: true };
    elements.notificationToggle.checked = settings.notifications;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    notifications: elements.notificationToggle.checked
  };
  
  chrome.storage.local.set({ 'settings': settings });
  
  // Notify background script settings changed
  chrome.runtime.sendMessage({
    action: 'settingsChanged',
    settings: settings
  });
}

// Reset all schedules
function clearSchedules() {
  if (confirm('Are you sure you want to clear all care plans? This cannot be undone.')) {
    chrome.runtime.sendMessage({
      action: 'removeAllReminders'
    });
    schedules = [];
    saveSchedules();
    renderSchedules();
    showTemporaryMessage('All care plans have been cleared');
  }
}

// Notification display
function showNotification(schedule) {
  const options = {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: 'Pet Care Reminder',
    message: `You have a pending reminder: ${schedule.name}`,
    buttons: [
      { title: 'Remind Later' }
    ]
  };
  chrome.notifications.create(`schedule-${schedule.id}`, options);
}

function validateScheduleTime(time) {
  if (!time || time === 'undefined:undefined' || time.includes('undefined')) {
    return false;
  }
  return true;
}

function saveSchedule(scheduleData) {
  if (!validateScheduleTime(scheduleData.time)) {
    showMessage('Please set a valid time');
    return false;
  }
  // ... rest of save logic
}

function displaySchedule(schedule) {
  if (!validateScheduleTime(schedule.time)) {
    return;
  }
  // ... rest of display logic
}

document.getElementById('schedule-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const taskTime = document.getElementById('task-time').value;
  if (!taskTime) {
    showMessage('Please select a time');
    return;
  }
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timePattern.test(taskTime)) {
    showMessage('Please enter a valid time format');
    return;
  }
  // ... rest of submit logic
});

function cleanInvalidSchedules() {
  chrome.storage.local.get('schedules', (result) => {
    const schedules = result.schedules || [];
    const validSchedules = schedules.filter(schedule => 
      validateScheduleTime(schedule.time)
    );
    if (validSchedules.length !== schedules.length) {
      chrome.storage.local.set({ schedules: validSchedules }, () => {
        console.log('Invalid schedules cleaned');
        loadSchedules();
      });
    }
  });
}

const applyPlansButton = document.getElementById('apply-plans');
if (applyPlansButton) {
  applyPlansButton.addEventListener('click', function() {
    // Logic for applying plans
  });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: 'getBadgeStatus' }, res => {
    if (res && res.badge && res.badge === '●') {
      renderPendingReminder({ name: 'You have pending reminders. Please check them!' });
    }
  });
});

function renderPendingReminder(reminder) {
  let reminderBar = document.getElementById('pending-reminder-bar');
  if (!reminderBar) {
    reminderBar = document.createElement('div');
    reminderBar.id = 'pending-reminder-bar';
    reminderBar.style.background = '#ffeeba';
    reminderBar.style.color = '#856404';
    reminderBar.style.padding = '8px 12px';
    reminderBar.style.fontWeight = 'bold';
    reminderBar.style.borderRadius = '6px';
    reminderBar.style.marginBottom = '10px';
    reminderBar.style.display = 'flex';
    reminderBar.style.alignItems = 'center';
    reminderBar.style.justifyContent = 'center';
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(reminderBar, container.firstChild);
    } else {
      document.body.insertBefore(reminderBar, document.body.firstChild);
    }
  }
  if (reminder) {
    reminderBar.innerHTML = `You have a pending reminder: ${reminder.name}${reminder.note ? ' (' + reminder.note + ')' : ''} <button id="clear-reminder-bar" style="margin-left: 10px;">Clear</button>`;
    
    // Add event listener to clear the reminder bar and remove reminder
    document.getElementById('clear-reminder-bar').addEventListener('click', () => {
      reminderBar.style.display = 'none';
      chrome.runtime.sendMessage({ action: 'removeAllReminders' }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error removing reminder:', chrome.runtime.lastError);
        } else {
          console.log('Successfully removed reminder');
        }
      });
    });
    reminderBar.style.display = 'flex';
  } else {
    reminderBar.style.display = 'none';
  }
}

// 获取待处理提醒并渲染
function showPendingReminder() {
  chrome.runtime.sendMessage({ action: 'getPendingReminder' }, function(response) {
    if (chrome.runtime.lastError) {
      renderPendingReminder(null);
      return;
    }
    if (response && response.reminder) {
      renderPendingReminder(response.reminder);
    } else {
      renderPendingReminder(null);
    }
  });
}