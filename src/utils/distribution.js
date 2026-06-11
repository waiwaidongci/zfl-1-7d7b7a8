export const DISTRIBUTION_TYPES = [
  { key: 'selfPickup', label: '认养人自取', color: '#2c5f8a' },
  { key: 'communityShare', label: '社区分享', color: '#c0547a' },
  { key: 'volunteerSample', label: '志愿者留样', color: '#3d7a2c' },
  { key: 'loss', label: '损耗', color: '#8a2c2c' }
];

export const DISTRIBUTION_OVERDUE_DAYS = 3;

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
