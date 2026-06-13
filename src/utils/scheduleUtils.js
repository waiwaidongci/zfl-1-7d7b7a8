export const SHORT_INTERVAL_MINUTES = 60;

export const checkAllScheduleConflicts = (scheduleForm, schedules) => {
  if (!scheduleForm || !schedules || schedules.length === 0) return [];
  const conflicts = [];
  return conflicts;
};

export const getWeeklyVolunteerStats = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return { total: 0, byVolunteer: {}, uniqueVolunteers: 0 };
  }
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const thisWeek = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d <= weekEnd;
  });

  const byVolunteer = {};
  thisWeek.forEach((s) => {
    if (s.volunteer) {
      byVolunteer[s.volunteer] = (byVolunteer[s.volunteer] || 0) + 1;
    }
  });

  return {
    total: thisWeek.length,
    byVolunteer,
    uniqueVolunteers: Object.keys(byVolunteer).length
  };
};

export const getWeeklyScheduleStats = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return { total: 0, byDuty: {} };
  }
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

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
  return warnings;
};
