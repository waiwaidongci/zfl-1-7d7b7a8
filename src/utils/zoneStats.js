import { ZONE_CONFIG, getZoneOfBed, getWaterUrgency, WATER_URGENCY } from '../config/floorPlan';
import { getBedInspectionSummary } from './statusSync';

const HARVEST_SOON_DAYS = 30;

export const isBedWaterUrgent = (bed) => {
  if (!bed || !bed.nextWater) return false;
  const urgency = getWaterUrgency(bed.nextWater);
  return urgency.key === WATER_URGENCY.OVERDUE.key || urgency.key === WATER_URGENCY.URGENT.key;
};

export const hasBedAbnormalInspection = (bedName, inspections) => {
  if (!bedName || !inspections) return false;
  const summary = getBedInspectionSummary(bedName, inspections);
  return summary.unresolvedCount > 0;
};

export const isBedHarvestSoon = (bedId, plants) => {
  if (!bedId || !plants) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + HARVEST_SOON_DAYS);

  return plants.some(p => {
    if (p.bedId !== bedId) return false;
    const harvestDate = new Date(p.harvestDate);
    harvestDate.setHours(0, 0, 0, 0);
    return harvestDate >= today && harvestDate <= threshold;
  });
};

export const buildZoneStats = ({ beds, bedPlacement, inspections, plants }) => {
  const result = {};

  for (const zone of ZONE_CONFIG) {
    result[zone.id] = {
      zone,
      totalCells: zone.rows * zone.cols,
      placedCount: 0,
      adopted: 0,
      idle: 0,
      pausedMaintenance: 0,
      waterUrgent: 0,
      inspectionAbnormal: 0,
      harvestSoon: 0,
      bedIds: []
    };
  }

  for (const bed of beds) {
    const zone = getZoneOfBed(bed, bedPlacement);
    if (!zone) continue;

    const stats = result[zone.id];
    if (!stats) continue;

    stats.bedIds.push(bed.id);

    const cellId = bedPlacement[bed.id];
    if (cellId) {
      stats.placedCount++;
    }

    switch (bed.status) {
      case '认养中':
        stats.adopted++;
        break;
      case '空闲':
        stats.idle++;
        break;
      case '暂停维护':
        stats.pausedMaintenance++;
        break;
    }

    if (isBedWaterUrgent(bed)) {
      stats.waterUrgent++;
    }

    if (hasBedAbnormalInspection(bed.name, inspections)) {
      stats.inspectionAbnormal++;
    }

    if (isBedHarvestSoon(bed.id, plants)) {
      stats.harvestSoon++;
    }
  }

  return result;
};

export const filterBedsByZone = (beds, zoneId, bedPlacement) => {
  if (!zoneId) return beds;
  return beds.filter(bed => {
    const zone = getZoneOfBed(bed, bedPlacement);
    return zone && zone.id === zoneId;
  });
};

export const filterBedPlacementByZone = (bedPlacement, zoneId, beds) => {
  if (!zoneId) return bedPlacement;
  const filtered = {};
  for (const [bedId, cellId] of Object.entries(bedPlacement)) {
    const bed = beds.find(b => b.id === bedId);
    const zone = bed ? getZoneOfBed(bed, bedPlacement) : null;
    if (zone && zone.id === zoneId) {
      filtered[bedId] = cellId;
    }
  }
  return filtered;
};

export const ZONE_STAT_KEYS = [
  { key: 'placedCount', label: '已放置', type: 'placed' },
  { key: 'adopted', label: '认养中', type: 'adopted' },
  { key: 'idle', label: '空闲', type: 'idle' },
  { key: 'pausedMaintenance', label: '暂停维护', type: 'paused' },
  { key: 'waterUrgent', label: '浇水紧急', type: 'water' },
  { key: 'inspectionAbnormal', label: '巡检异常', type: 'abnormal' },
  { key: 'harvestSoon', label: '近期可采收', type: 'harvest' }
];
