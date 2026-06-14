export const DISTRIBUTION_TYPES = [
  { key: 'selfPickup', label: '认养人自取', color: '#2c5f8a' },
  { key: 'communityShare', label: '社区分享', color: '#c0547a' },
  { key: 'volunteerSample', label: '志愿者留样', color: '#3d7a2c' },
  { key: 'loss', label: '损耗', color: '#8a2c2c' }
];

export const DISTRIBUTION_OVERDUE_DAYS = 3;
export const PICKUP_CONFIRM_OVERDUE_DAYS = 2;
export const PICKUP_REISSUE_GRACE_DAYS = 1;
export const FULFILLMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

export const QUEUE_STATUS = [
  { key: 'unassigned', label: '未分配', color: '#8a2c2c', icon: 'alert', priority: 1 },
  { key: 'partial', label: '部分分配', color: '#8a6a2c', icon: 'clock', priority: 2 },
  { key: 'pendingPickup', label: '待自取', color: '#2c5f8a', icon: 'bell', priority: 3 },
  { key: 'overduePickup', label: '超期未取', color: '#8b3f23', icon: 'alert', priority: 4 },
  { key: 'completed', label: '已完成', color: '#3d7a2c', icon: 'check', priority: 5 }
];

export const getQueueStatusKey = (harvest) => {
  if (!harvest) return 'completed';
  const distStatus = getDistributionStatus(harvest);
  const pickupStatus = getPickupStatus(harvest);

  if (pickupStatus.key === 'pending') {
    return pickupStatus.isOverdue ? 'overduePickup' : 'pendingPickup';
  }
  if (distStatus.key === 'unassigned') return 'unassigned';
  if (distStatus.key === 'partial') return 'partial';
  return 'completed';
};

export const getQueueStatus = (harvest) => {
  const key = getQueueStatusKey(harvest);
  const status = QUEUE_STATUS.find(s => s.key === key) || QUEUE_STATUS[4];
  const distStatus = getDistributionStatus(harvest);
  const pickupStatus = getPickupStatus(harvest);
  return {
    ...status,
    distributionOverdue: distStatus.isOverdue,
    pickupOverdue: pickupStatus.isOverdue,
    pickupDaysSince: pickupStatus.daysSince || 0,
    distributionKey: distStatus.key,
    pickupKey: pickupStatus.key
  };
};

export const getQueueStats = (harvests) => {
  const stats = {
    unassigned: 0,
    partial: 0,
    pendingPickup: 0,
    overduePickup: 0,
    completed: 0,
    unassignedWeight: 0,
    partialWeight: 0,
    pendingPickupWeight: 0,
    overduePickupWeight: 0,
    total: harvests.length
  };

  for (const h of harvests) {
    const key = getQueueStatusKey(h);
    const remaining = getDistributionRemaining(h);
    const pickupGrams = getSelfPickupGrams(h.distribution);
    const pickupStatus = getPickupStatus(h);

    if (key === 'unassigned') {
      stats.unassigned++;
      stats.unassignedWeight += remaining;
    } else if (key === 'partial') {
      stats.partial++;
      stats.partialWeight += remaining;
    } else if (key === 'pendingPickup') {
      stats.pendingPickup++;
      if (pickupStatus.key === 'pending') {
        stats.pendingPickupWeight += pickupGrams;
      }
    } else if (key === 'overduePickup') {
      stats.overduePickup++;
      stats.overduePickupWeight += pickupGrams;
    } else {
      stats.completed++;
    }
  }

  return stats;
};

export const getQueueHarvests = (harvests, queueKey) => {
  if (!queueKey) return harvests;
  return harvests.filter(h => getQueueStatusKey(h) === queueKey);
};

export const filterHarvestsByRange = (harvests, startDate, endDate) => {
  if (!startDate && !endDate) return harvests;
  return harvests.filter(h => {
    const d = new Date(h.date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
};

export const filterHarvestsByBed = (harvests, bedName) => {
  if (!bedName) return harvests;
  return harvests.filter(h => h.bed === bedName);
};

export const filterHarvestsByCrop = (harvests, cropName) => {
  if (!cropName) return harvests;
  return harvests.filter(h => h.crop.includes(cropName));
};

export const getUniqueBeds = (harvests) => {
  return [...new Set(harvests.map(h => h.bed))].sort();
};

export const getUniqueCrops = (harvests) => {
  return [...new Set(harvests.map(h => h.crop))].sort();
};

export const getThisWeekRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(today);
  start.setDate(today.getDate() - daysToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
};

export const getThisWeekHarvests = (harvests) => {
  const { start, end } = getThisWeekRange();
  return filterHarvestsByRange(harvests, start, end);
};

export const getQueueStatsForWeek = (harvests) => {
  return getQueueStats(getThisWeekHarvests(harvests));
};

export const parseWeight = (weightStr) => {
  if (!weightStr || typeof weightStr !== 'string') return 0;
  const cleaned = weightStr.trim().toLowerCase();
  const kgMatch = cleaned.match(/^([\d.]+)\s*kg$/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = cleaned.match(/^([\d.]+)\s*g$/);
  if (gMatch) return parseFloat(gMatch[1]);
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) return num;
  return 0;
};

export const formatWeight = (grams) => {
  if (!grams || grams <= 0) return '0g';
  if (grams >= 1000) {
    const kg = (grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1);
    return `${kg}kg`;
  }
  return `${Math.round(grams)}g`;
};

export const isValidWeightFormat = (weightStr) => {
  if (!weightStr || typeof weightStr !== 'string') return false;
  const cleaned = weightStr.trim().toLowerCase();
  return /^[\d.]+\s*(kg|g)$/i.test(cleaned);
};

export const getDistributionTotal = (distribution) => {
  if (!distribution) return 0;
  return DISTRIBUTION_TYPES.reduce((sum, t) => sum + (parseWeight(distribution[t.key]) || 0), 0);
};

export const getDistributionRemaining = (harvest) => {
  const total = parseWeight(harvest.weight);
  const distributed = getDistributionTotal(harvest.distribution);
  return Math.max(0, total - distributed);
};

export const getDistributionStatus = (harvest) => {
  const total = parseWeight(harvest.weight);
  const distributed = getDistributionTotal(harvest.distribution);
  const harvestDate = new Date(harvest.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  harvestDate.setHours(0, 0, 0, 0);
  const daysSinceHarvest = Math.floor((today - harvestDate) / 86400000);
  const isOverdue = daysSinceHarvest > DISTRIBUTION_OVERDUE_DAYS;

  if (total === 0) return { key: 'unassigned', label: '未分配', isOverdue: false };
  if (distributed === 0) return { key: 'unassigned', label: '未分配', isOverdue };
  if (distributed < total) return { key: 'partial', label: '部分分配', isOverdue };
  return { key: 'completed', label: '已完成', isOverdue: false };
};

export const validateDistribution = (distribution, harvestWeight) => {
  const errors = [];
  const total = parseWeight(harvestWeight);
  const distributed = getDistributionTotal(distribution);

  for (const t of DISTRIBUTION_TYPES) {
    const val = distribution?.[t.key];
    if (val && !isValidWeightFormat(val)) {
      errors.push(`${t.label}格式不正确，请使用如"1.4kg"或"300g"格式`);
    }
  }

  if (distributed > total && total > 0) {
    errors.push(`分配总量(${formatWeight(distributed)})超过采摘总量(${formatWeight(total)})`);
  }

  return errors;
};

export const getDistributionWarnings = (harvests) => {
  const warnings = [];
  for (const h of harvests) {
    const status = getDistributionStatus(h);
    if (status.key === 'unassigned') {
      warnings.push({
        id: `dist-unassigned-${h.id}`,
        type: status.isOverdue ? 'critical' : 'warning',
        label: h.crop,
        bed: h.bed,
        date: h.date,
        message: status.isOverdue
          ? `${h.crop}（${h.bed}）已超过${DISTRIBUTION_OVERDUE_DAYS}天未分配`
          : `${h.crop}（${h.bed}）尚未登记分配去向`
      });
    } else if (status.key === 'partial' && status.isOverdue) {
      warnings.push({
        id: `dist-partial-${h.id}`,
        type: 'warning',
        label: h.crop,
        bed: h.bed,
        date: h.date,
        message: `${h.crop}（${h.bed}）部分分配已超期，剩余${formatWeight(getDistributionRemaining(h))}待处理`
      });
    }
  }
  return warnings;
};

export const getSelfPickupGrams = (distribution) => {
  if (!distribution || !distribution.selfPickup) return 0;
  return parseWeight(distribution.selfPickup);
};

export const getPickupStatus = (harvest) => {
  const dist = harvest?.distribution;
  const selfPickupGrams = getSelfPickupGrams(dist);
  if (selfPickupGrams === 0) {
    return { key: 'none', label: '未登记自取', isOverdue: false };
  }
  if (dist?.selfPickupConfirmedAt) {
    return { key: 'confirmed', label: '已取菜', isOverdue: false, confirmedAt: dist.selfPickupConfirmedAt };
  }
  const baseDate = dist.distributionUpdatedAt || harvest.distributionUpdatedAt || harvest.date;
  const pickupDate = new Date(baseDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  pickupDate.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - pickupDate) / 86400000);
  const isOverdue = daysSince > PICKUP_CONFIRM_OVERDUE_DAYS;
  return {
    key: 'pending',
    label: isOverdue ? '超期未取' : '待取菜',
    isOverdue,
    daysSince
  };
};

export const getPickupWarnings = (harvests) => {
  const warnings = [];
  for (const h of harvests) {
    const pickup = getPickupStatus(h);
    if (pickup.key === 'pending' && pickup.isOverdue) {
      warnings.push({
        id: `pickup-overdue-${h.id}`,
        type: 'critical',
        label: h.crop,
        bed: h.bed,
        date: h.date,
        selfPickupWeight: h.distribution?.selfPickup,
        daysSince: pickup.daysSince,
        message: `${h.crop}（${h.bed}）认养人自取${h.distribution?.selfPickup || ''}已超期${pickup.daysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天未取走`
      });
    } else if (pickup.key === 'pending' && !pickup.isOverdue) {
      warnings.push({
        id: `pickup-pending-${h.id}`,
        type: 'pickupPending',
        label: h.crop,
        bed: h.bed,
        date: h.date,
        selfPickupWeight: h.distribution?.selfPickup,
        daysSince: pickup.daysSince,
        message: `${h.crop}（${h.bed}）待认养人自取${h.distribution?.selfPickup || ''}`
      });
    }
  }
  return warnings;
};

export const getAllWarnings = (harvests) => {
  return [...getDistributionWarnings(harvests), ...getPickupWarnings(harvests)];
};

export const getPickupStats = (harvests) => {
  let pending = 0;
  let confirmed = 0;
  let overdue = 0;
  let pendingWeight = 0;
  let overdueWeight = 0;
  let confirmedWeight = 0;

  for (const h of harvests) {
    const pickup = getPickupStatus(h);
    const grams = getSelfPickupGrams(h.distribution);
    if (pickup.key === 'pending') {
      pending++;
      pendingWeight += grams;
      if (pickup.isOverdue) {
        overdue++;
        overdueWeight += grams;
      }
    } else if (pickup.key === 'confirmed') {
      confirmed++;
      confirmedWeight += grams;
    }
  }

  return { pending, confirmed, overdue, pendingWeight, overdueWeight, confirmedWeight };
};

export const getDistributionStats = (harvests) => {
  let unassigned = 0;
  let partial = 0;
  let completed = 0;
  let overdue = 0;
  let totalWeight = 0;
  let distributedWeight = 0;

  for (const h of harvests) {
    const status = getDistributionStatus(h);
    if (status.key === 'unassigned') unassigned++;
    else if (status.key === 'partial') partial++;
    else completed++;
    if (status.isOverdue) overdue++;
    totalWeight += parseWeight(h.weight);
    distributedWeight += getDistributionTotal(h.distribution);
  }

  return {
    unassigned,
    partial,
    completed,
    overdue,
    total: harvests.length,
    totalWeight,
    distributedWeight,
    remainingWeight: Math.max(0, totalWeight - distributedWeight)
  };
};

export const PICKUP_NOTICE_DAYS_OFFSET = 1;

export const findBedByName = (beds, bedName) => {
  if (!beds || !bedName) return null;
  return beds.find(b => b.name === bedName) || null;
};

export const getExpectedPickupDate = (baseDateStr, offsetDays = PICKUP_NOTICE_DAYS_OFFSET) => {
  const base = new Date(baseDateStr || new Date().toISOString().slice(0, 10));
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
};

export const generatePickupNoticeContent = (harvest, expectedDate) => {
  if (!harvest) return '';
  const weight = harvest.distribution?.selfPickup || '';
  const date = expectedDate || getExpectedPickupDate(harvest.distribution?.distributionUpdatedAt || harvest.date);
  return `【取菜通知】${harvest.crop}已采收${weight ? `（${weight}）` : ''}，请于${date}前来菜园自取。如有困难请提前联系值班志愿者。`;
};

export const generatePickupNoticeContact = (harvest, beds) => {
  if (!harvest || !harvest.distribution?.selfPickup) return null;
  const bed = findBedByName(beds, harvest.bed);
  if (!bed || !bed.adopter) return null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  const expectedDate = getExpectedPickupDate(harvest.distribution?.distributionUpdatedAt || harvest.date);

  return {
    id: crypto.randomUUID(),
    bedId: bed.id,
    bedName: bed.name,
    adopter: bed.adopter,
    phone: bed.phone || '',
    type: '取菜通知',
    date: dateStr,
    time: timeStr,
    content: generatePickupNoticeContent(harvest, expectedDate),
    note: `作物：${harvest.crop}；重量：${harvest.distribution.selfPickup}；预计取菜日期：${expectedDate}`,
    relatedHarvestId: harvest.id,
    pickupNoticeSentAt: now.toISOString(),
    expectedPickupDate: expectedDate,
    pickupStatus: 'pending'
  };
};

export const findRelatedPickupNotice = (contacts, harvestId) => {
  if (!contacts || !harvestId) return null;
  return contacts.find(c => c.relatedHarvestId === harvestId && c.type === '取菜通知') || null;
};

export const confirmPickupContact = (contacts, harvestId) => {
  if (!contacts || !harvestId) return contacts;
  return contacts.map(c => {
    if (c.relatedHarvestId !== harvestId || c.type !== '取菜通知') return c;
    const now = new Date().toISOString();
    return {
      ...c,
      pickupStatus: 'confirmed',
      pickupConfirmedAt: now,
      note: c.note
        ? `${c.note} · 已于${now.slice(5, 16)}确认取菜`
        : `已于${now.slice(5, 16)}确认取菜`
    };
  });
};

export const checkPickupNoticeExists = (contacts, harvestId) => {
  return !!findRelatedPickupNotice(contacts, harvestId);
};

export const iso = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const getSelfPickupTakenGrams = (distribution) => {
  if (!distribution) return 0;
  return parseWeight(distribution.selfPickupTaken) || 0;
};

export const getSelfPickupRemainingGrams = (distribution) => {
  if (!distribution) return 0;
  const total = parseWeight(distribution.selfPickup) || 0;
  const taken = getSelfPickupTakenGrams(distribution);
  return Math.max(0, total - taken);
};

export const getFulfillmentStatus = (harvest) => {
  if (!harvest) return { key: FULFILLMENT_STATUS.PENDING, label: '待处理' };
  if (harvest.archived) return { key: FULFILLMENT_STATUS.ARCHIVED, label: '已归档', isArchived: true };

  const dist = harvest.distribution;
  if (!dist) return { key: FULFILLMENT_STATUS.PENDING, label: '待分配' };

  const selfPickupTotal = parseWeight(dist.selfPickup) || 0;
  const selfPickupTaken = getSelfPickupTakenGrams(dist);
  const allOtherDistributed = DISTRIBUTION_TYPES
    .filter(t => t.key !== 'selfPickup')
    .every(t => parseWeight(dist[t.key]) > 0 || !dist[t.key]);

  if (selfPickupTotal > 0) {
    if (selfPickupTaken === 0) {
      return { key: FULFILLMENT_STATUS.PENDING, label: '待自取' };
    } else if (selfPickupTaken < selfPickupTotal) {
      return { key: FULFILLMENT_STATUS.PARTIAL, label: '部分自取', taken: selfPickupTaken, remaining: selfPickupTotal - selfPickupTaken };
    }
  }

  const totalDistributed = getDistributionTotal(dist);
  const totalWeight = parseWeight(harvest.weight);
  if (totalDistributed >= totalWeight || (selfPickupTotal > 0 && selfPickupTaken >= selfPickupTotal && allOtherDistributed)) {
    return { key: FULFILLMENT_STATUS.COMPLETED, label: '履约完成' };
  }

  return { key: FULFILLMENT_STATUS.PENDING, label: '处理中' };
};

export const addDistributionHistory = (distribution, action, details = {}) => {
  if (!distribution) return distribution;
  const history = distribution.history || [];
  const newEntry = {
    id: crypto.randomUUID(),
    action,
    timestamp: new Date().toISOString(),
    ...details
  };
  return {
    ...distribution,
    history: [...history, newEntry]
  };
};

export const recordPartialPickup = (distribution, takenWeightStr) => {
  if (!distribution) return null;
  const takenGrams = parseWeight(takenWeightStr);
  if (takenGrams <= 0) return null;

  const currentTaken = getSelfPickupTakenGrams(distribution);
  const totalSelfPickup = parseWeight(distribution.selfPickup) || 0;
  const remaining = totalSelfPickup - currentTaken;

  if (takenGrams > remaining) {
    return { error: `本次取走重量(${formatWeight(takenGrams)})超过剩余可取(${formatWeight(remaining)})` };
  }

  const newTaken = currentTaken + takenGrams;
  const newTakenStr = newTaken >= 1000
    ? `${(newTaken / 1000).toFixed(newTaken % 1000 === 0 ? 0 : 1)}kg`
    : `${Math.round(newTaken)}g`;

  let updated = {
    ...distribution,
    selfPickupTaken: newTakenStr
  };

  if (newTaken >= totalSelfPickup && totalSelfPickup > 0) {
    updated.selfPickupConfirmedAt = new Date().toISOString().slice(0, 10);
  }

  updated = addDistributionHistory(updated, 'partial_pickup', {
    taken: takenWeightStr,
    takenGrams,
    remainingAfter: formatWeight(totalSelfPickup - newTaken)
  });

  return updated;
};

export const recordNoticeSent = (distribution, noticeType = 'initial') => {
  if (!distribution) return distribution;
  return addDistributionHistory(distribution, 'notice_sent', {
    noticeType,
    timestamp: new Date().toISOString()
  });
};

export const confirmFullPickup = (distribution) => {
  if (!distribution || !distribution.selfPickup) return distribution;

  const totalSelfPickup = parseWeight(distribution.selfPickup) || 0;
  if (totalSelfPickup <= 0) return distribution;

  const totalStr = distribution.selfPickup;

  let updated = {
    ...distribution,
    selfPickupTaken: totalStr,
    selfPickupConfirmedAt: new Date().toISOString()
  };

  updated = addDistributionHistory(updated, 'pickup_confirmed', {
    totalWeight: totalStr,
    totalGrams: totalSelfPickup,
    timestamp: new Date().toISOString()
  });

  return updated;
};

export const canReissuePickupNotice = (contacts, harvestId, graceDays = PICKUP_REISSUE_GRACE_DAYS) => {
  const notices = contacts.filter(c =>
    c.relatedHarvestId === harvestId && c.type === '取菜通知'
  );
  if (notices.length === 0) return { canReissue: true };

  const lastNotice = notices.sort((a, b) =>
    new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
  )[0];

  const daysSinceLast = Math.floor(
    (new Date() - new Date(lastNotice.date + ' ' + lastNotice.time)) / 86400000
  );

  if (daysSinceLast < graceDays) {
    return {
      canReissue: false,
      reason: `距上次通知仅${daysSinceLast}天，${graceDays}天后可补发`,
      daysSinceLast,
      graceDays
    };
  }

  return { canReissue: true, daysSinceLast, noticeCount: notices.length };
};

export const generateReissueNoticeContact = (harvest, beds, contacts) => {
  if (!harvest || !harvest.distribution?.selfPickup) return null;
  const bed = findBedByName(beds, harvest.bed);
  if (!bed || !bed.adopter) return null;

  const recheck = canReissuePickupNotice(contacts, harvest.id);
  if (!recheck.canReissue) return { error: recheck.reason };

  const remaining = getSelfPickupRemainingGrams(harvest.distribution);
  if (remaining <= 0) return { error: '该采收已全部取走，无需补发通知' };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  const expectedDate = getExpectedPickupDate(iso(0));
  const remainingStr = formatWeight(remaining);

  const noticeCount = contacts.filter(c =>
    c.relatedHarvestId === harvest.id && c.type === '取菜通知'
  ).length;

  return {
    id: crypto.randomUUID(),
    bedId: bed.id,
    bedName: bed.name,
    adopter: bed.adopter,
    phone: bed.phone || '',
    type: '取菜通知',
    date: dateStr,
    time: timeStr,
    content: `【补发通知${noticeCount + 1}】${harvest.crop}剩余${remainingStr}待取，请于${expectedDate}前来菜园自取。如不便请联系志愿者安排其他时间。`,
    note: `作物：${harvest.crop}；剩余重量：${remainingStr}；预计取菜日期：${expectedDate}；补发第${noticeCount + 1}次`,
    relatedHarvestId: harvest.id,
    pickupNoticeSentAt: now.toISOString(),
    expectedPickupDate: expectedDate,
    pickupStatus: 'pending',
    isReissue: true,
    reissueCount: noticeCount + 1
  };
};

export const getPickupNoticeCount = (contacts, harvestId) => {
  return contacts.filter(c =>
    c.relatedHarvestId === harvestId && c.type === '取菜通知'
  ).length;
};

export const getAllPickupNotices = (contacts, harvestId) => {
  return contacts
    .filter(c => c.relatedHarvestId === harvestId && c.type === '取菜通知')
    .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
};

export const getFulfillmentSummary = (harvests) => {
  const summary = {
    total: harvests.length,
    pending: 0,
    partial: 0,
    completed: 0,
    archived: 0,
    pendingWeight: 0,
    partialWeight: 0,
    completedWeight: 0,
    byType: {
      selfPickup: 0,
      communityShare: 0,
      volunteerSample: 0,
      loss: 0
    }
  };

  for (const h of harvests) {
    const status = getFulfillmentStatus(h);
    const weight = parseWeight(h.weight);

    if (status.key === FULFILLMENT_STATUS.ARCHIVED) {
      summary.archived++;
    } else if (status.key === FULFILLMENT_STATUS.COMPLETED) {
      summary.completed++;
      summary.completedWeight += weight;
    } else if (status.key === FULFILLMENT_STATUS.PARTIAL) {
      summary.partial++;
      summary.partialWeight += weight;
    } else {
      summary.pending++;
      summary.pendingWeight += weight;
    }

    if (h.distribution) {
      for (const t of DISTRIBUTION_TYPES) {
        summary.byType[t.key] += parseWeight(h.distribution[t.key]) || 0;
      }
    }
  }

  return summary;
};

export const validateDistributionWithPartial = (distribution, harvestWeight) => {
  const errors = validateDistribution(distribution, harvestWeight);

  if (distribution?.selfPickupTaken) {
    const taken = parseWeight(distribution.selfPickupTaken);
    const total = parseWeight(distribution.selfPickup) || 0;
    if (taken > total) {
      errors.push(`已取走重量(${formatWeight(taken)})超过自取分配总量(${formatWeight(total)})`);
    }
  }

  return errors;
};

export const getMissingContactInfo = (harvest, beds) => {
  const bed = findBedByName(beds, harvest.bed);
  const missing = [];
  if (!bed) {
    missing.push('菜畦信息不存在');
    return missing;
  }
  if (!bed.adopter) missing.push('认养人');
  if (!bed.phone) missing.push('联系电话');
  return missing;
};

export const hasCompleteContactInfo = (harvest, beds) => {
  return getMissingContactInfo(harvest, beds).length === 0;
};

export const buildInitialDistribution = (harvest, beds, options = {}) => {
  const bed = findBedByName(beds, harvest.bed);
  const hasAdopter = bed && bed.adopter;
  const totalGrams = parseWeight(harvest.weight);

  const distribution = {
    selfPickup: '',
    communityShare: '',
    volunteerSample: '',
    loss: '',
    distributionUpdatedAt: iso(0)
  };

  if (hasAdopter && options.autoAssignSelfPickup && totalGrams > 0) {
    const defaultSelfPickup = Math.min(totalGrams, 500);
    distribution.selfPickup = defaultSelfPickup >= 1000
      ? `${(defaultSelfPickup / 1000).toFixed(1)}kg`
      : `${defaultSelfPickup}g`;
  }

  return distribution;
};

export const getQueueStatusWithFulfillment = (harvest) => {
  const baseStatus = getQueueStatus(harvest);
  const fulfillment = getFulfillmentStatus(harvest);

  return {
    ...baseStatus,
    fulfillmentKey: fulfillment.key,
    fulfillmentLabel: fulfillment.label,
    isArchived: !!harvest.archived,
    partialTaken: fulfillment.taken || 0,
    partialRemaining: fulfillment.remaining || 0
  };
};

export const normalizeHarvestDistribution = (harvest) => {
  if (!harvest) return harvest;

  if (harvest.distribution === undefined || harvest.distribution === null) {
    return { ...harvest, distribution: null };
  }

  const dist = harvest.distribution;
  const normalized = {};

  for (const t of DISTRIBUTION_TYPES) {
    if (dist[t.key] !== undefined && dist[t.key] !== null && dist[t.key] !== '') {
      if (isValidWeightFormat(dist[t.key])) {
        normalized[t.key] = dist[t.key];
      }
    }
  }

  if (dist.selfPickupTaken !== undefined && dist.selfPickupTaken !== null) {
    if (isValidWeightFormat(dist.selfPickupTaken)) {
      normalized.selfPickupTaken = dist.selfPickupTaken;
    }
  }

  if (dist.selfPickupConfirmedAt) {
    normalized.selfPickupConfirmedAt = dist.selfPickupConfirmedAt;
  }

  if (dist.distributionUpdatedAt) {
    normalized.distributionUpdatedAt = dist.distributionUpdatedAt;
  }

  if (dist.history && Array.isArray(dist.history)) {
    normalized.history = dist.history;
  }

  const hasAny = Object.keys(normalized).some(k =>
    k !== 'distributionUpdatedAt' && k !== 'history' && normalized[k]
  );

  return {
    ...harvest,
    distribution: hasAny ? normalized : null
  };
};

export const splitHarvestByDateRange = (harvests, startDate, endDate) => {
  const inRange = filterHarvestsByRange(harvests, startDate, endDate);
  const outside = harvests.filter(h => !inRange.includes(h));
  return { inRange, outside };
};

export const groupHarvestsByAdopter = (harvests, beds) => {
  const groups = {};
  for (const h of harvests) {
    const bed = findBedByName(beds, h.bed);
    const adopter = bed?.adopter || '未认养';
    if (!groups[adopter]) groups[adopter] = [];
    groups[adopter].push(h);
  }
  return groups;
};

export const groupHarvestsByBed = (harvests) => {
  const groups = {};
  for (const h of harvests) {
    if (!groups[h.bed]) groups[h.bed] = [];
    groups[h.bed].push(h);
  }
  return groups;
};

export const groupHarvestsByCrop = (harvests) => {
  const groups = {};
  for (const h of harvests) {
    if (!groups[h.crop]) groups[h.crop] = [];
    groups[h.crop].push(h);
  }
  return groups;
};
