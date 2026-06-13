import { getZoneOfBed, getZoneById } from '../config/floorPlan';

const today = new Date();
const iso = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const CROP_ROTATION_KNOWLEDGE = {
  '薄荷': {
    zones: ['A', 'B'],
    growthDays: 45,
    family: '唇形科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['唇形科'],
    season: '春夏秋',
    sun: 'full'
  },
  '迷迭香': {
    zones: ['A'],
    growthDays: 60,
    family: '唇形科',
    rotationRest: 20,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['唇形科'],
    season: '春夏秋',
    sun: 'full'
  },
  '樱桃番茄': {
    zones: ['A', 'B'],
    growthDays: 75,
    family: '茄科',
    rotationRest: 30,
    suitableAfter: ['豆科', '十字花科'],
    avoidAfter: ['茄科'],
    season: '春夏',
    sun: 'full'
  },
  '番茄': {
    zones: ['A', 'B'],
    growthDays: 80,
    family: '茄科',
    rotationRest: 30,
    suitableAfter: ['豆科', '十字花科'],
    avoidAfter: ['茄科'],
    season: '春夏',
    sun: 'full'
  },
  '生菜': {
    zones: ['B', 'C'],
    growthDays: 35,
    family: '菊科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['菊科'],
    season: '春秋',
    sun: 'partial'
  },
  '菠菜': {
    zones: ['B', 'C'],
    growthDays: 30,
    family: '藜科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['藜科'],
    season: '春秋',
    sun: 'partial'
  },
  '小白菜': {
    zones: ['B', 'C'],
    growthDays: 28,
    family: '十字花科',
    rotationRest: 20,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['十字花科'],
    season: '春秋',
    sun: 'partial'
  },
  '上海青': {
    zones: ['B', 'C'],
    growthDays: 30,
    family: '十字花科',
    rotationRest: 20,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['十字花科'],
    season: '春秋',
    sun: 'partial'
  },
  '空心菜': {
    zones: ['A', 'B'],
    growthDays: 35,
    family: '旋花科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['旋花科'],
    season: '夏季',
    sun: 'full'
  },
  '油麦菜': {
    zones: ['B', 'C'],
    growthDays: 30,
    family: '菊科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['菊科'],
    season: '春秋',
    sun: 'partial'
  },
  '豌豆苗': {
    zones: ['B', 'C'],
    growthDays: 25,
    family: '豆科',
    rotationRest: 10,
    suitableAfter: ['茄科', '十字花科'],
    avoidAfter: ['豆科'],
    season: '春秋',
    sun: 'partial'
  },
  '韭菜': {
    zones: ['A', 'B'],
    growthDays: 60,
    family: '百合科',
    rotationRest: 30,
    suitableAfter: ['茄科', '豆科', '十字花科'],
    avoidAfter: ['百合科'],
    season: '春夏秋',
    sun: 'full'
  },
  '小葱': {
    zones: ['A', 'B'],
    growthDays: 45,
    family: '百合科',
    rotationRest: 25,
    suitableAfter: ['茄科', '豆科', '十字花科'],
    avoidAfter: ['百合科'],
    season: '春夏秋',
    sun: 'full'
  },
  '苋菜': {
    zones: ['A', 'B'],
    growthDays: 30,
    family: '苋科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['苋科'],
    season: '夏季',
    sun: 'full'
  },
  '木耳菜': {
    zones: ['A', 'B'],
    growthDays: 35,
    family: '落葵科',
    rotationRest: 15,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['落葵科'],
    season: '夏季',
    sun: 'full'
  },
  '香菜': {
    zones: ['B', 'C'],
    growthDays: 40,
    family: '伞形科',
    rotationRest: 20,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['伞形科'],
    season: '春秋',
    sun: 'partial'
  },
  '芹菜': {
    zones: ['B', 'C'],
    growthDays: 70,
    family: '伞形科',
    rotationRest: 25,
    suitableAfter: ['茄科', '豆科'],
    avoidAfter: ['伞形科'],
    season: '春秋',
    sun: 'partial'
  },
  '黄瓜': {
    zones: ['A'],
    growthDays: 55,
    family: '葫芦科',
    rotationRest: 25,
    suitableAfter: ['豆科', '十字花科'],
    avoidAfter: ['葫芦科'],
    season: '夏季',
    sun: 'full'
  },
  '豆角': {
    zones: ['A'],
    growthDays: 60,
    family: '豆科',
    rotationRest: 20,
    suitableAfter: ['茄科', '十字花科'],
    avoidAfter: ['豆科'],
    season: '春夏',
    sun: 'full'
  },
  '草莓': {
    zones: ['A', 'B'],
    growthDays: 90,
    family: '蔷薇科',
    rotationRest: 60,
    suitableAfter: ['豆科', '十字花科'],
    avoidAfter: ['蔷薇科'],
    season: '春秋',
    sun: 'full'
  }
};

export const ZONE_CROP_PRIORITY = {
  'A': ['番茄', '樱桃番茄', '黄瓜', '豆角', '草莓', '薄荷', '韭菜', '空心菜', '苋菜', '木耳菜'],
  'B': ['樱桃番茄', '生菜', '菠菜', '小白菜', '上海青', '油麦菜', '香菜', '芹菜', '豌豆苗', '薄荷'],
  'C': ['生菜', '菠菜', '小白菜', '上海青', '油麦菜', '豌豆苗', '香菜', '芹菜']
};

export const SEASON_CROPS = {
  '春季': ['番茄', '樱桃番茄', '黄瓜', '豆角', '草莓', '生菜', '菠菜', '小白菜', '上海青', '豌豆苗', '韭菜', '小葱', '香菜', '芹菜'],
  '夏季': ['空心菜', '苋菜', '木耳菜', '黄瓜', '豆角', '番茄', '樱桃番茄', '韭菜', '小葱', '薄荷', '迷迭香'],
  '秋季': ['生菜', '菠菜', '小白菜', '上海青', '油麦菜', '豌豆苗', '香菜', '芹菜', '樱桃番茄', '草莓', '韭菜', '小葱'],
  '冬季': ['菠菜', '上海青', '豌豆苗', '韭菜', '小葱']
};

export const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return '春季';
  if (month >= 5 && month <= 7) return '夏季';
  if (month >= 8 && month <= 10) return '秋季';
  return '冬季';
};

export const getCropFamily = (cropName) => {
  if (!cropName) return null;
  const crop = CROP_ROTATION_KNOWLEDGE[cropName];
  return crop ? crop.family : null;
};

export const getLastCropByBed = (bed, harvests, plants) => {
  if (!bed) return null;

  const bedHarvests = harvests.filter(h => h.bed === bed.name);
  if (bedHarvests.length > 0) {
    bedHarvests.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { crop: bedHarvests[0].crop, date: bedHarvests[0].date, type: 'harvest' };
  }

  const bedPlants = plants.filter(p => p.bedId === bed.id);
  if (bedPlants.length > 0) {
    bedPlants.sort((a, b) => new Date(b.harvestDate) - new Date(a.harvestDate));
    return { crop: bedPlants[0].crop, date: bedPlants[0].harvestDate, type: 'plant' };
  }

  return null;
};

export const getBedHistoryCrops = (bed, harvests, plants) => {
  if (!bed) return [];

  const history = [];

  harvests
    .filter(h => h.bed === bed.name)
    .forEach(h => {
      history.push({ crop: h.crop, date: h.date, type: 'harvest' });
    });

  plants
    .filter(p => p.bedId === bed.id)
    .forEach(p => {
      history.push({ crop: p.crop, date: p.harvestDate, type: 'plant' });
    });

  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  return history;
};

export const getBedStatusForRotation = (bed, plants, bedPlacement) => {
  const zone = getZoneOfBed(bed, bedPlacement);
  const zoneId = zone ? zone.id : null;

  const bedPlants = plants.filter(p => p.bedId === bed.id);
  const activePlant = bedPlants.length > 0 ? bedPlants[0] : null;

  let status = 'idle';
  let availableDate = iso(0);
  let daysUntilAvailable = 0;

  if (bed.status === '暂停维护') {
    status = 'paused';
    availableDate = iso(30);
    daysUntilAvailable = 30;
  } else if (activePlant) {
    const harvestDate = new Date(activePlant.harvestDate);
    const now = new Date();
    const daysUntilHarvest = Math.ceil((harvestDate - now) / 86400000);

    if (daysUntilHarvest <= 0) {
      status = 'harvest_ready';
      availableDate = iso(1);
      daysUntilAvailable = 1;
    } else if (daysUntilHarvest <= 30) {
      status = 'soon_harvest';
      availableDate = iso(daysUntilHarvest + 3);
      daysUntilAvailable = daysUntilHarvest + 3;
    } else {
      status = 'growing';
      availableDate = iso(daysUntilHarvest + 3);
      daysUntilAvailable = daysUntilHarvest + 3;
    }
  } else if (bed.status === '空闲' || bed.crop === '待播种') {
    status = 'idle';
    availableDate = iso(0);
    daysUntilAvailable = 0;
  } else {
    status = 'idle';
    availableDate = iso(0);
    daysUntilAvailable = 0;
  }

  return {
    bed,
    zoneId,
    status,
    availableDate,
    daysUntilAvailable,
    currentPlant: activePlant,
    currentCrop: activePlant ? activePlant.crop : (bed.crop === '待播种' ? null : bed.crop)
  };
};

export const generateCropSuggestions = (bedInfo, historyCrops, count = 3) => {
  const { zoneId, status, currentCrop } = bedInfo;
  if (!zoneId) return [];

  const currentSeason = getCurrentSeason();
  const seasonCrops = SEASON_CROPS[currentSeason] || [];
  const zonePriority = ZONE_CROP_PRIORITY[zoneId] || [];

  const lastCrop = historyCrops.length > 0 ? historyCrops[0].crop : null;
  const lastFamily = lastCrop ? getCropFamily(lastCrop) : null;

  const suggestions = [];
  const addedCrops = new Set();

  zonePriority.forEach(cropName => {
    if (!CROP_ROTATION_KNOWLEDGE[cropName]) return;
    if (!seasonCrops.includes(cropName)) return;
    if (addedCrops.has(cropName)) return;

    const crop = CROP_ROTATION_KNOWLEDGE[cropName];
    const score = calculateCropScore(cropName, crop, zonePriority, lastFamily, currentCrop, status);

    suggestions.push({
      crop: cropName,
      score,
      zone: zoneId,
      growthDays: crop.growthDays,
      family: crop.family,
      reason: buildSuggestionReason(cropName, crop, lastFamily, currentSeason, status)
    });
    addedCrops.add(cropName);
  });

  if (suggestions.length < count) {
    const zoneSun = ZONE_SUN_LEVEL[zoneId] || 'partial';
    seasonCrops.forEach(cropName => {
      if (addedCrops.has(cropName)) return;
      const crop = CROP_ROTATION_KNOWLEDGE[cropName];
      if (!crop) return;

      const sunMatch = (zoneSun === 'full' && crop.sun === 'full') ||
                       (zoneSun === 'partial' && (crop.sun === 'partial' || crop.sun === 'full'));
      if (!sunMatch) return;

      const score = calculateCropScore(cropName, crop, zonePriority, lastFamily, currentCrop, status) - 10;

      suggestions.push({
        crop: cropName,
        score,
        zone: zoneId,
        growthDays: crop.growthDays,
        family: crop.family,
        reason: buildSuggestionReason(cropName, crop, lastFamily, currentSeason, status)
      });
      addedCrops.add(cropName);
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, count);
};

const ZONE_SUN_LEVEL = {
  'A': 'full',
  'B': 'partial',
  'C': 'partial'
};

const calculateCropScore = (cropName, crop, zonePriority, lastFamily, currentCrop, status) => {
  let score = 0;
  const cropFamily = crop.family;
  const zoneIndex = zonePriority.indexOf(cropName);

  if (zoneIndex >= 0) {
    score += zoneIndex * 2;
  } else {
    score -= 15;
  }

  if (lastFamily && crop.avoidAfter.includes(lastFamily)) {
    score -= 50;
  }

  if (lastFamily && crop.suitableAfter.includes(lastFamily)) {
    score += 20;
  }

  if (currentCrop && getCropFamily(currentCrop) === cropFamily) {
    score -= 30;
  }

  if (status === 'idle') {
    if (crop.growthDays <= 40) score += 15;
  }

  return score;
};

const buildSuggestionReason = (cropName, crop, lastFamily, season, status) => {
  const reasons = [];

  reasons.push(`适合${season}种植`);

  if (lastFamily) {
    if (crop.suitableAfter.includes(lastFamily)) {
      reasons.push(`与上一茬（${lastFamily}）轮作搭配佳`);
    } else if (crop.avoidAfter.includes(lastFamily)) {
      reasons.push('注意：与上一茬同科，建议休耕或换茬');
    }
  }

  if (status === 'idle') {
    reasons.push('菜畦空闲，可立即播种');
  } else if (status === 'soon_harvest') {
    reasons.push('即将采收，可提前育苗');
  }

  return reasons.join(' · ');
};

export const generateRotationPlan = (beds, plants, harvests, bedPlacement, days = 30) => {
  const rotationBeds = [];

  beds.forEach(bed => {
    const bedInfo = getBedStatusForRotation(bed, plants, bedPlacement);
    const history = getBedHistoryCrops(bed, harvests, plants);

    if (bedInfo.daysUntilAvailable <= days) {
      const suggestions = generateCropSuggestions(bedInfo, history);

      rotationBeds.push({
        ...bedInfo,
        history,
        suggestions,
        priority: calculatePriority(bedInfo, suggestions)
      });
    }
  });

  rotationBeds.sort((a, b) => {
    if (a.status === 'idle' && b.status !== 'idle') return -1;
    if (b.status === 'idle' && a.status !== 'idle') return 1;
    return a.daysUntilAvailable - b.daysUntilAvailable;
  });

  return {
    period: days,
    generatedAt: new Date().toISOString(),
    totalBeds: rotationBeds.length,
    idleBeds: rotationBeds.filter(b => b.status === 'idle').length,
    soonHarvestBeds: rotationBeds.filter(b => b.status === 'soon_harvest' || b.status === 'harvest_ready').length,
    pausedBeds: rotationBeds.filter(b => b.status === 'paused').length,
    beds: rotationBeds
  };
};

const calculatePriority = (bedInfo, suggestions) => {
  let priority = 0;

  switch (bedInfo.status) {
    case 'idle':
      priority += 100;
      break;
    case 'harvest_ready':
      priority += 80;
      break;
    case 'soon_harvest':
      priority += 60;
      break;
    case 'paused':
      priority += 20;
      break;
    default:
      priority += 40;
  }

  if (suggestions.length > 0) {
    priority += suggestions[0].score / 2;
  }

  return priority;
};

export const ROTATION_STATUS_LABELS = {
  'idle': { label: '空闲可种', color: '#3d7a2c', bg: '#e8f5e3' },
  'growing': { label: '生长中', color: '#2c5f8a', bg: '#e3f0fb' },
  'soon_harvest': { label: '即将采收', color: '#8a5a2c', bg: '#fbe3c4' },
  'harvest_ready': { label: '待采收', color: '#8a2c2c', bg: '#fbe3e3' },
  'paused': { label: '暂停维护', color: '#8a6a2c', bg: '#f5ecd8' }
};

export const createPlantFromSuggestion = (bed, suggestion, availableDate) => {
  const growthDays = suggestion.growthDays || 30;
  const sowDate = availableDate || iso(0);
  const harvestDateObj = new Date(sowDate);
  harvestDateObj.setDate(harvestDateObj.getDate() + growthDays);
  const harvestDate = harvestDateObj.toISOString().slice(0, 10);

  return {
    id: '',
    bedId: bed.id,
    bedName: bed.name,
    crop: suggestion.crop,
    sowDate,
    harvestDate,
    growthStage: '播种期',
    note: `轮作规划推荐 · ${suggestion.reason}`
  };
};

export const createTaskFromSuggestion = (bed, suggestion, availableDate) => {
  const taskDate = availableDate || iso(0);
  const dateObj = new Date(taskDate);

  let title = '';
  switch (suggestion.action || 'sow') {
    case 'sow':
      title = `${bed.name} 播种${suggestion.crop}`;
      break;
    case 'transplant':
      title = `${bed.name} 移栽${suggestion.crop}`;
      break;
    case 'prepare':
      title = `${bed.name} 整地备播`;
      break;
    default:
      title = `${bed.name} 种植${suggestion.crop}准备`;
  }

  return {
    id: '',
    title,
    owner: '园艺管家',
    due: dateObj.toISOString().slice(0, 10),
    done: false,
    note: `轮作规划推荐 · ${suggestion.reason}`,
    relatedBedId: bed.id,
    relatedBedName: bed.name,
    relatedCrop: suggestion.crop,
    source: 'rotation_plan'
  };
};

export const getRotationStats = (beds, plants, bedPlacement) => {
  const stats = {
    total: beds.length,
    idle: 0,
    growing: 0,
    soonHarvest: 0,
    harvestReady: 0,
    paused: 0,
    byZone: {}
  };

  const zones = ['A', 'B', 'C'];
  zones.forEach(z => {
    stats.byZone[z] = {
      total: 0,
      idle: 0,
      growing: 0,
      soonHarvest: 0,
      harvestReady: 0,
      paused: 0
    };
  });

  beds.forEach(bed => {
    const bedInfo = getBedStatusForRotation(bed, plants, bedPlacement);
    const zoneId = bedInfo.zoneId;

    stats[bedInfo.status === 'harvest_ready' ? 'harvestReady' : bedInfo.status]++;

    if (zoneId && stats.byZone[zoneId]) {
      stats.byZone[zoneId].total++;
      stats.byZone[zoneId][bedInfo.status === 'harvest_ready' ? 'harvestReady' : bedInfo.status]++;
    }
  });

  return stats;
};
