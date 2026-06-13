export const SHORT_INTERVAL_MINUTES = 60;

const HIGH_LOAD_THRESHOLD = 4;

const parseTimeRange = (timeStr) => {
  if (!timeStr) return { start: 0, end: 0 };
  const parts = timeStr.split('-');
  if (parts.length !== 2) return { start: 0, end: 0 };
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  return { start: toMinutes(parts[0]), end: toMinutes(parts[1]) };
};

const timeRangesOverlap = (timeA, timeB) => {
  const a = parseTimeRange(timeA);
  const b = parseTimeRange(timeB);
  if (a.start === 0 && a.end === 0) return false;
  if (b.start === 0 && b.end === 0) return false;
  return a.start < b.end && b.start < a.end;
};

export const checkAllScheduleConflicts = (scheduleForm, schedules) => {
  if (!scheduleForm || !schedules) return [];
  const conflicts = [];
  const { volunteer, date, time, duty } = scheduleForm;
  if (!volunteer || !date) return conflicts;

  const sameDaySchedules = schedules.filter(s => s.date === date && s.volunteer === volunteer);

  for (const existing of sameDaySchedules) {
    if (timeRangesOverlap(time, existing.time)) {
      const isSameDuty = existing.duty === duty;
      const isSameTime = existing.time === time;
      if (isSameTime && isSameDuty) {
        conflicts.push({
          id: `conflict-duplicate-${existing.id}`,
          type: 'overlap',
          severity: 'error',
          message: `${volunteer}在${date}已有相同排班（${existing.duty} ${existing.time}），请勿重复添加`,
          existingScheduleId: existing.id
        });
      } else if (isSameTime) {
        conflicts.push({
          id: `conflict-sametime-${existing.id}`,
          type: 'overlap',
          severity: 'error',
          message: `${volunteer}在${date} ${time}已有${existing.duty}任务，同一时段不能安排两种职责`,
          existingScheduleId: existing.id
        });
      } else {
        conflicts.push({
          id: `conflict-overlap-${existing.id}`,
          type: 'overlap',
          severity: 'warning',
          message: `${volunteer}在${date}已有${existing.duty}（${existing.time}），与新排班（${time}）时间段重叠`,
          existingScheduleId: existing.id
        });
      }
    } else if (existing.time && time) {
      const a = parseTimeRange(time);
      const b = parseTimeRange(existing.time);
      const gap = Math.min(Math.abs(a.start - b.end), Math.abs(b.start - a.end));
      if (gap > 0 && gap < SHORT_INTERVAL_MINUTES) {
        conflicts.push({
          id: `conflict-gap-${existing.id}`,
          type: 'tight_gap',
          severity: 'warning',
          message: `${volunteer}在${date}的${existing.time}与${time}间隔仅${gap}分钟，休息时间不足`,
          existingScheduleId: existing.id
        });
      }
    }
  }

  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  const dayOfWeek = dateObj.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - daysToMonday);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const weekSchedules = schedules.filter(s =>
    s.volunteer === volunteer && weekDates.includes(s.date)
  );
  const weekCount = weekSchedules.length + 1;
  if (weekCount >= HIGH_LOAD_THRESHOLD) {
    conflicts.push({
      id: `conflict-highload-${volunteer}`,
      type: 'high_load',
      severity: 'warning',
      message: `${volunteer}本周已有${weekSchedules.length}次排班，加上本次将达${weekCount}次，负载较高`
    });
  }

  return conflicts;
};

const getWeekRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
};

export const getWeeklyVolunteerStats = (schedules) => {
  if (!schedules || schedules.length === 0) return [];

  const { weekStart, weekEnd } = getWeekRange();
  const thisWeek = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const byVolunteer = {};
  thisWeek.forEach((s) => {
    if (!s.volunteer) return;
    if (!byVolunteer[s.volunteer]) {
      byVolunteer[s.volunteer] = {
        volunteer: s.volunteer,
        phone: s.phone || '',
        total: 0,
        byDuty: {}
      };
    }
    byVolunteer[s.volunteer].total++;
    if (s.duty) {
      byVolunteer[s.volunteer].byDuty[s.duty] = (byVolunteer[s.volunteer].byDuty[s.duty] || 0) + 1;
    }
  });

  return Object.values(byVolunteer).sort((a, b) => b.total - a.total);
};

export const getWeeklyScheduleStats = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return { total: 0, byDuty: {} };
  }

  const { weekStart, weekEnd } = getWeekRange();
  const thisWeek = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const byDuty = {};
  thisWeek.forEach((s) => {
    if (s.duty) {
      byDuty[s.duty] = (byDuty[s.duty] || 0) + 1;
    }
  });

  return { total: thisWeek.length, byDuty };
};

export const getAllScheduleWarnings = (schedules) => {
  if (!schedules || schedules.length === 0) return [];
  const warnings = [];

  const { weekStart, weekEnd } = getWeekRange();
  const thisWeek = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const byVolunteer = {};
  thisWeek.forEach((s) => {
    if (!s.volunteer) return;
    if (!byVolunteer[s.volunteer]) byVolunteer[s.volunteer] = [];
    byVolunteer[s.volunteer].push(s);
  });

  for (const [volunteer, vSchedules] of Object.entries(byVolunteer)) {
    if (vSchedules.length >= HIGH_LOAD_THRESHOLD) {
      const dutyLabels = vSchedules.map(s => `${s.duty}(${s.date.slice(5)})`).join('、');
      warnings.push({
        id: `sched-highload-${volunteer}`,
        type: 'high_load',
        severity: 'warning',
        message: `${volunteer}本周排班${vSchedules.length}次，负载较高：${dutyLabels}`
      });
    }

    const byDate = {};
    vSchedules.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    for (const [date, daySchedules] of Object.entries(byDate)) {
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          const a = daySchedules[i];
          const b = daySchedules[j];
          if (timeRangesOverlap(a.time, b.time)) {
            warnings.push({
              id: `sched-overlap-${a.id}-${b.id}`,
              type: 'overlap',
              severity: 'error',
              message: `${volunteer}在${date}的时间段冲突：${a.duty}(${a.time})与${b.duty}(${b.time})重叠`
            });
          }
        }
      }
    }
  }

  return warnings;
};
