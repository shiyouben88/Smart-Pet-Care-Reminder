// Global variables
let activeReminders = {};
let settings = { notifications: true };
const ALARM_PREFIX = 'schedule-';
let badgeBlinkInterval = null;
let badgeBlinkState = false;

function startBadgeBlink() {
  if (badgeBlinkInterval) return;
  badgeBlinkInterval = setInterval(() => {
    badgeBlinkState = !badgeBlinkState;
    chrome.action.setBadgeBackgroundColor({ color: badgeBlinkState ? '#FF0000' : '#FFFFFF' });
  }, 600);
}

function stopBadgeBlink() {
  // 清除徽章和停止闪烁
  console.log('Attempting to stop badge blink and clear badge');
  if (badgeBlinkInterval) {
    clearInterval(badgeBlinkInterval);
    badgeBlinkInterval = null;
    console.log('Badge blink stopped');
  } else {
    console.log('No active badge blink to stop');
  }
  chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting badge background color:', chrome.runtime.lastError);
    } else {
      console.log('Badge background color set to white');
    }
  });
  chrome.action.setBadgeText({ text: '' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error clearing badge text:', chrome.runtime.lastError);
    } else {
      console.log('Badge text cleared');
    }
  });
}
// Initialization
chrome.runtime.onInstalled.addListener(async () => {
  // Load settings
  await loadSettings();
  
  // Load saved schedules and set reminders
  await loadSchedulesAndSetReminders();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.action === 'setReminder') {
    handleSetReminder(request.schedule).then(sendResponse);
    return true; // Keep the message channel open
  } else if (request.action === 'removeReminder') {
    removeReminder(request.scheduleId);
  } else if (request.action === 'resetAllReminders') {
    resetAllReminders(request.schedules);
  } else if (request.action === 'removeAllReminders') {
    removeAllReminders();
  } else if (request.action === 'settingsChanged') {
    settings = request.settings;
  } else if (request.action === 'getPendingReminder') {
    // 检查当前是否有未处理提醒（通过徽章和 storage）
    chrome.action.getBadgeText({}, async (badgeText) => {
      if (badgeText === '●') {
        // 有待处理提醒，查找最近的 schedule
        const result = await chrome.storage.local.get('schedules');
        const schedules = result.schedules || [];
        // 查找最近触发且 active 的提醒
        let reminder = null;
        if (schedules.length > 0) {
          // 选取最近时间的 active 日程
          const now = new Date();
          // 只查找 active 的
          const activeSchedules = schedules.filter(s => s.active);
          // 选取最近触发的（可优化为记录 lastTriggeredId）
          if (activeSchedules.length > 0) {
            // 这里简单返回第一个 active
            reminder = activeSchedules[0];
          }
        }
        sendResponse({ reminder });
      } else {
        sendResponse({ reminder: null });
      }
    });
    return true;
  }
  
  return true;
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm);
  try {
    if (alarm.name.startsWith('schedule-')) {
      const scheduleId = alarm.name.replace('schedule-', '');
      const result = await chrome.storage.local.get('schedules');
      const schedules = result.schedules || [];
      const schedule = schedules.find(s => s.id.toString() === scheduleId);
      if (schedule) {
        await showNotification(schedule);
        // 设置徽章为小红点
        chrome.action.setBadgeText({ text: '●' });
        startBadgeBlink();
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        const nextAlarm = calculateNextAlarmTime(schedule);
        if (nextAlarm) {
          chrome.alarms.create(`schedule-${schedule.id}`, {
            when: nextAlarm.getTime()
          });
        }
      }
    } else if (alarm.name.includes('-snooze')) {
      const scheduleId = parseInt(alarm.name.split('-')[2]);
      const result = await chrome.storage.local.get('schedules');
      const schedules = result.schedules || [];
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        await showNotification(schedule);
        // Set badge to red dot
        chrome.action.setBadgeText({ text: '●' });
        startBadgeBlink();
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      }
    }
  } catch (e) {
    console.error('Global exception in onAlarm:', e);
  }
});

// Listen for notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('pet-notification-')) {
    const scheduleId = parseInt(notificationId.replace('pet-notification-', ''));
    if (buttonIndex === 0) {
      chrome.notifications.clear(notificationId);
      // Clear badge when user clicks "Complete"
      chrome.action.setBadgeText({ text: '' });
    } else if (buttonIndex === 1) {
      chrome.notifications.clear(notificationId);
      handleSnooze(scheduleId);
      // Keep badge when user clicks "Remind Later"
    }
  }
});

async function handleSnooze(scheduleId) {
  try {
    const result = await chrome.storage.local.get('schedules');
    const schedules = result.schedules || [];
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      chrome.alarms.create(`schedule-${scheduleId}-snooze`, {
        when: Date.now() + 10 * 60 * 1000
      });
    }
  } catch (error) {
    console.error('Error handling snooze:', error);
  }
}



// Set reminder
async function handleSetReminder(schedule) {
  try {
    if (!isValidSchedule(schedule)) {
      return { success: false, error: 'Invalid schedule data' };
    }
    const when = getNextAlarmTime(schedule);
    if (!when) {
      return { success: false, error: 'Failed to calculate alarm time' };
    }
    const alarmName = `${ALARM_PREFIX}${schedule.id}`;
    chrome.alarms.create(alarmName, {
      when: when,
      periodInMinutes: getPeriodInMinutes(schedule)
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting reminder:', error);
    return { success: false, error: error.message };
  }
}

// Remove reminder
function removeReminder(scheduleId) {
  chrome.alarms.clear(`schedule-${scheduleId}`);
  chrome.alarms.clear(`schedule-${scheduleId}-snooze`);
  delete activeReminders[scheduleId];
}

// Reset all reminders
function resetAllReminders(schedules) {
  // 先移除所有提醒
  removeAllReminders();
  
  // 重新设置所有活动的提醒
  schedules.forEach(schedule => {
    if (schedule.active) {
      handleSetReminder(schedule);
    }
  });
}

// Remove all reminders
function removeAllReminders() {
  chrome.alarms.getAll(alarms => {
    alarms.forEach(alarm => {
      if (alarm.name.startsWith('schedule-')) {
        chrome.alarms.clear(alarm.name);
      }
    });
  });
  stopBadgeBlink();
}
activeReminders = {};

// Show notification
async function showNotification(schedule) {
  console.log('准备显示通知:', schedule, settings);
  if (!settings.notifications) {
    console.log('通知已关闭，未显示:', schedule);
    return;
  }
  try {
    const notificationId = `pet-notification-${schedule.id}`;
    const notificationOptions = {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('images/icon128.png'),
      title: 'Pet Care Reminder',
      message: `It's time for ${schedule.name}!${schedule.note ? '\nNote: ' + schedule.note : ''}`,
      buttons: [
        { title: 'Complete' },
        { title: 'Remind Later' }
      ],
      priority: 2,
      requireInteraction: true
    };
    console.log('通知参数:', notificationId, notificationOptions);
    chrome.notifications.create(notificationId, notificationOptions, (notificationIdResult) => {
      if (chrome.runtime.lastError) {
        console.error('chrome.notifications.create 失败:', chrome.runtime.lastError);
      } else {
        console.log('通知已创建，ID:', notificationIdResult);
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error, schedule);
  }
}

// 计算下一次提醒时间
function calculateNextAlarmTime(schedule) {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  // 创建今天的提醒时间
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  // 根据频率计算下一次提醒时间
  switch (schedule.frequency) {
    case 'daily':
      // 如果今天的时间已经过了，设置为明天
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // 如果今天的时间已经过了，设置为下周的同一天
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 7);
      }
      break;
      
    case 'weekdays':
      // 工作日（周一至周五）
      const day = alarmTime.getDay(); // 0是周日，1-5是周一至周五，6是周六
      
      if (alarmTime <= now) {
        // 如果今天的时间已经过了
        if (day === 0) { // 周日
          alarmTime.setDate(alarmTime.getDate() + 1); // 设置为周一
        } else if (day === 6) { // 周六
          alarmTime.setDate(alarmTime.getDate() + 2); // 设置为下周一
        } else if (day === 5) { // 周五
          alarmTime.setDate(alarmTime.getDate() + 3); // 设置为下周一
        } else { // 周一至周四
          alarmTime.setDate(alarmTime.getDate() + 1); // 设置为明天
        }
      } else {
        // 如果今天的时间还没过，但今天是周末
        if (day === 0) { // 周日
          alarmTime.setDate(alarmTime.getDate() + 1); // 设置为周一
        } else if (day === 6) { // 周六
          alarmTime.setDate(alarmTime.getDate() + 2); // 设置为周一
        }
      }
      break;
      
    case 'weekends':
      // 周末（周六和周日）
      const weekday = alarmTime.getDay();
      
      if (alarmTime <= now) {
        // 如果今天的时间已经过了
        if (weekday >= 1 && weekday <= 5) { // 周一至周五
          // 计算到周六的天数
          const daysUntilSaturday = 6 - weekday;
          alarmTime.setDate(alarmTime.getDate() + daysUntilSaturday);
        } else if (weekday === 0) { // 周日
          alarmTime.setDate(alarmTime.getDate() + 6); // 设置为下周六
        } else { // 周六
          alarmTime.setDate(alarmTime.getDate() + 1); // 设置为周日
        }
      } else {
        // 如果今天的时间还没过，但今天是工作日
        if (weekday >= 1 && weekday <= 5) { // 周一至周五
          // 计算到周六的天数
          const daysUntilSaturday = 6 - weekday;
          alarmTime.setDate(alarmTime.getDate() + daysUntilSaturday);
        }
      }
      break;
  }
  
  return alarmTime;
}

// 加载设置
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  settings = result.settings || { notifications: true };
}

// 加载日程并设置提醒
async function loadSchedulesAndSetReminders() {
  const result = await chrome.storage.local.get('schedules');
  const schedules = result.schedules || [];
  
  for (const schedule of schedules) {
    if (schedule.active) {
      await handleSetReminder(schedule);
    }
  }
}

// 计算下一次提醒时间
function getNextAlarmTime(schedule) {
  if (!schedule || !schedule.time) {
    console.error('Invalid schedule:', schedule);
    return null;
  }

  try {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error('Invalid time values:', hours, minutes);
      return null;
    }

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // 如果时间已过，设置为明天
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // 根据频率调整日期
    switch (schedule.frequency) {
      case 'weekly':
        if (schedule.weekdays && schedule.weekdays.length > 0) {
          while (!schedule.weekdays.includes(scheduledTime.getDay())) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }
        }
        break;
      case 'weekdays':
        while (scheduledTime.getDay() === 0 || scheduledTime.getDay() === 6) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        break;
      case 'weekends':
        while (scheduledTime.getDay() !== 0 && scheduledTime.getDay() !== 6) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        break;
    }
    
    return scheduledTime.getTime();
  } catch (error) {
    console.error('Error in getNextAlarmTime:', error);
    return null;
  }
}

// 获取重复周期（分钟）
function getPeriodInMinutes(schedule) {
  switch (schedule.frequency) {
    case 'daily':
      return 24 * 60;
    case 'weekly':
      return 7 * 24 * 60;
    case 'weekdays':
    case 'weekends':
      return 24 * 60;
    default:
      return 24 * 60;
  }
}

// 在popup.js中添加的验证函数
function validateScheduleTime(time) {
  if (!time || time === 'undefined:undefined' || time.includes('undefined')) {
    return false;
  }
  return true;
}

// 添加验证函数
function isValidSchedule(schedule) {
  if (!schedule || !schedule.name || !schedule.time || !schedule.frequency) {
    return false;
  }
  
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timePattern.test(schedule.time);
}

// 监听popup请求徽章状态和清除徽章
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBadgeStatus') {
    chrome.action.getBadgeText({}, text => {
      sendResponse({ badge: text });
    });
    return true;
  } else if (request.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
    stopBadgeBlink();
    sendResponse({ success: true });
    return true;
  }
  return true;
});