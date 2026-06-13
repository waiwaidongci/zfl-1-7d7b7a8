export const parseTimeRange = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const [, startHour, startMin, endHour, endMin] = match;
  const startTime = parseInt(startHour, 10) * 60 + parseInt(startMin, 10);
  const endTime = parseInt(endHour, 10) * 60 + parseInt(endMin, 10);
  
  if (startTime >= endTime) return null;
  
  return { startTime, endTime, startStr: `${startHour}:${startMin}`, endStr: `${endHour}:${endMin}` };
};

export const formatMinutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const isTimeOverlap = (range1, range2) => {
  const parsed1 = typeof range1 === 'string' ? parseTimeRange(range1) : range1;
  const parsed2 = typeof range2 === 'string' ? parseTimeRange(range2) : range2;
  
  if (!parsed1 || !parsed2) return false;
  
  return parsed1.startTime < parsed2.endTime && parsed1.endTime > parsed2.startTime;
};

export const checkVolunteerOverlap = (newSchedule, existingSchedules, excludeId = null) => {
  const conflicts = [];
  const { volunteer, date, time } = newSchedule;
  
  if (!volunteer || !date || !time) return conflicts;
  
  const newRange = parseTimeRange(time);
  if (!newRange) return conflicts;
  
  existingSchedules.forEach(schedule => {
    if (excludeId && schedule.id === excludeId) return;
    if (schedule.volunteer !== volunteer) return;
    if (schedule.date !== date) return;
    
    const existingRange = parseTimeRange(schedule.time);
    if (!existingRange) return;
    
    if (isTimeOverlap(newRange, existingRange)) {
      conflicts.push({
        type: 'overlap',
        severity: 'error',
        message: `该志愿者在 ${schedule.date} ${schedule.time} 已有排班（${schedule.duty}），时段重叠`,
        conflictingSchedule: schedule
      });
    }
  });
  
  return conflicts;
};

export const SHORT_INTERVAL_MINUTES = 120;

export const checkDutyDuplicate = (newSchedule, existingSchedules, excludeId = null) => {
  const conflicts = [];
  const { date, duty, time, note } = newSchedule;
  
  if (!date || !duty || !time) return conflicts;
  
  const newRange = parseTimeRange(time);
  if (!newRange) return conflicts;
  
  const extractBedFromNote = (noteStr) => {
    if (!noteStr) return null;
    const bedMatch = noteStr.match(/([A-Z]\d+)/i);
    return bedMatch ? bedMatch[1].toUpperCase() : null;
  };
  
  const newBed = extractBedFromNote(note);
  
  existingSchedules.forEach(schedule => {
    if (excludeId && schedule.id === excludeId) return;
    if (schedule.date !== date) return;
    
    const existingRange = parseTimeRange(schedule.time);
    if (!existingRange) return;
    
    const existingBed = extractBedFromNote(schedule.note);
    
    const timeDiffStart = Math.abs(newRange.startTime - existingRange.startTime);
    const timeDiffEnd = Math.abs(newRange.endTime - existingRange.endTime);
    const isClose = timeDiffStart <= SHORT_INTERVAL_MINUTES || timeDiffEnd <= SHORT_INTERVAL_MINUTES;
    
    if (newBed && existingBed && newBed === existingBed && isClose && schedule.id !== excludeId) {
      conflicts.push({
        type: 'bed_duplicate',
        severity: 'warning',
        message: `菜畦 ${newBed} 在 ${schedule.time} 已有安排（${schedule.duty}），两次安排间隔较近`,
        conflictingSchedule: schedule
      });
    }
    
    if (schedule.duty === duty && isClose && schedule.id !== excludeId) {
      const alreadyWarned = conflicts.some(c => 
        c.type === 'duty_duplicate' && c.conflictingSchedule.id === schedule.id
      );
      if (!alreadyWarned) {
        conflicts.push({
          type: 'duty_duplicate',
          severity: 'warning',
          message: `${duty} 职责在 ${schedule.time} 已有安排（${schedule.volunteer}），两次安排间隔较近`,
          conflictingSchedule: schedule
        });
      }
    }
  });
  
  return conflicts;
};

export const checkAllScheduleConflicts = (newSchedule, existingSchedules, excludeId = null) => {
  const overlapConflicts = checkVolunteerOverlap(newSchedule, existingSchedules, excludeId);
  const dutyConflicts = checkDutyDuplicate(newSchedule, existingSchedules, excludeId);
  
  return [...overlapConflicts, ...dutyConflicts];
};

export const getWeekRange = (referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
};

export const isDateInWeek = (dateStr, referenceDate = new Date()) => {
  const { weekStart, weekEnd } = getWeekRange(referenceDate);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date >= weekStart && date <= weekEnd;
};

export const getWeeklyVolunteerStats = (schedules, referenceDate = new Date()) => {
  const stats = {};
  
  schedules.forEach(schedule => {
    if (!isDateInWeek(schedule.date, referenceDate)) return;
    
    const volunteer = schedule.volunteer;
    if (!volunteer) return;
    
    if (!stats[volunteer]) {
      stats[volunteer] = {
        volunteer,
        phone: schedule.phone || '',
        total: 0,
        byDuty: {},
        dates: []
      };
    }
    
    stats[volunteer].total += 1;
    stats[volunteer].byDuty[schedule.duty] = (stats[volunteer].byDuty[schedule.duty] || 0) + 1;
    
    if (!stats[volunteer].dates.includes(schedule.date)) {
      stats[volunteer].dates.push(schedule.date);
    }
  });
  
  return Object.values(stats).sort((a, b) => b.total - a.total);
};

export const getWeeklyScheduleStats = (schedules, referenceDate = new Date()) => {
  const { weekStart, weekEnd } = getWeekRange(referenceDate);
  
  const weekSchedules = schedules.filter(s => isDateInWeek(s.date, referenceDate));
  
  const byDuty = {};
  const byDate = {};
  const volunteerSet = new Set();
  
  weekSchedules.forEach(s => {
    byDuty[s.duty] = (byDuty[s.duty] || 0) + 1;
    byDate[s.date] = (byDate[s.date] || 0) + 1;
    if (s.volunteer) volunteerSet.add(s.volunteer);
  });
  
  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    total: weekSchedules.length,
    volunteerCount: volunteerSet.size,
    byDuty,
    byDate
  };
};

export const getScheduleConflicts = (schedules) => {
  const conflicts = [];
  
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const s1 = schedules[i];
      const s2 = schedules[j];
      
      if (s1.date !== s2.date) continue;
      
      const range1 = parseTimeRange(s1.time);
      const range2 = parseTimeRange(s2.time);
      
      if (!range1 || !range2) continue;
      
      if (s1.volunteer === s2.volunteer && isTimeOverlap(range1, range2)) {
        conflicts.push({
          id: `overlap-${s1.id}-${s2.id}`,
          type: 'overlap',
          severity: 'error',
          message: `${s1.volunteer} 在 ${s1.date} ${s1.time} 和 ${s2.time} 时段重叠`,
          schedules: [s1, s2]
        });
      }
    }
  }
  
  return conflicts;
};

export const getScheduleLoadWarnings = (schedules, referenceDate = new Date()) => {
  const warnings = [];
  const weeklyStats = getWeeklyVolunteerStats(schedules, referenceDate);
  
  const HIGH_LOAD_THRESHOLD = 4;
  const LOW_LOAD_THRESHOLD = 1;
  
  weeklyStats.forEach(stat => {
    if (stat.total >= HIGH_LOAD_THRESHOLD) {
      warnings.push({
        id: `high-load-${stat.volunteer}`,
        type: 'high_load',
        severity: 'warning',
        message: `${stat.volunteer} 本周排班 ${stat.total} 次，负载较高`,
        volunteer: stat.volunteer,
        count: stat.total
      });
    }
  });
  
  const activeVolunteers = weeklyStats.filter(s => s.total > 0).length;
  if (activeVolunteers < 2 && weeklyStats.length > 0) {
    warnings.push({
      id: 'low-volunteer-count',
      type: 'low_volunteer',
      severity: 'info',
      message: `本周仅 ${activeVolunteers} 位志愿者值班，建议增加排班人手`,
      count: activeVolunteers
    });
  }
  
  const stats = getWeeklyScheduleStats(schedules, referenceDate);
  const emptyDays = [];
  const { weekStart } = getWeekRange(referenceDate);
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart);
    checkDate.setDate(weekStart.getDate() + i);
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (!stats.byDate[dateStr] && checkDate >= new Date()) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      emptyDays.push(`${dateStr}（${weekdays[i]}）`);
    }
  }
  
  if (emptyDays.length > 0) {
    warnings.push({
      id: 'empty-days',
      type: 'empty_days',
      severity: 'info',
      message: `本周还有 ${emptyDays.length} 天未安排：${emptyDays.join('、')}`,
      days: emptyDays
    });
  }
  
  return warnings;
};

export const getAllScheduleWarnings = (schedules, referenceDate = new Date()) => {
  const conflicts = getScheduleConflicts(schedules);
  const loadWarnings = getScheduleLoadWarnings(schedules, referenceDate);
  return [...conflicts, ...loadWarnings];
};
