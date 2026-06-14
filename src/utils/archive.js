import {
  parseWeight, isValidWeightFormat, DISTRIBUTION_TYPES, formatWeight,
  getFulfillmentStatus, getFulfillmentSummary, getSelfPickupTakenGrams,
  getSelfPickupRemainingGrams, getAllPickupNotices, FULFILLMENT_STATUS,
  addDistributionHistory
} from './distribution';

const ARCHIVE_VERSION = '1.0.0';
const ARCHIVE_SCHEMA = 'zfl-garden-archive';

export const STORAGE_KEYS = {
  beds: 'zfl-1-beds',
  harvests: 'zfl-1-harvests',
  tasks: 'zfl-1-tasks',
  schedules: 'zfl-1-schedules',
  contacts: 'zfl-1-contacts',
  plants: 'zfl-1-plants',
  materials: 'zfl-1-materials',
  transactions: 'zfl-1-transactions',
  inspections: 'zfl-1-inspections',
  bedPlacement: 'zfl-1-bedPlacement'
};

export const ENTITY_LABELS = {
  beds: '菜畦',
  harvests: '采收记录',
  tasks: '任务',
  schedules: '志愿者排班',
  contacts: '联系记录',
  plants: '种植计划',
  materials: '物资',
  transactions: '物资流水',
  inspections: '巡检记录',
  bedPlacement: '菜畦位置'
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

export const buildFulfillmentArchiveSummary = (harvests, contacts) => {
  const fulfillmentSummary = getFulfillmentSummary(harvests);
  const harvestArchiveDetails = harvests.map((h) => {
    const fulfillment = getFulfillmentStatus(h);
    const takenGrams = getSelfPickupTakenGrams(h.distribution);
    const remainingGrams = getSelfPickupRemainingGrams(h.distribution);
    const notices = getAllPickupNotices(contacts, h.id);
    const selfPickupGrams = h.distribution?.selfPickup ? parseWeight(h.distribution.selfPickup) : 0;
    return {
      id: h.id,
      crop: h.crop,
      bed: h.bed,
      date: h.date,
      weight: h.weight,
      totalGrams: parseWeight(h.weight),
      fulfillmentStatus: fulfillment.key,
      fulfillmentLabel: fulfillment.label,
      distribution: h.distribution || null,
      selfPickupTotalGrams: selfPickupGrams,
      selfPickupTakenGrams: takenGrams,
      selfPickupRemainingGrams: remainingGrams,
      noticeCount: notices.length,
      notices: notices.map((n) => ({ date: n.date, time: n.time, type: n.type })),
      history: h.distribution?.history || [],
      archived: h.archived || false,
      archivedAt: h.archivedAt || null
    };
  });
  return {
    summary: fulfillmentSummary,
    harvestDetails: harvestArchiveDetails,
    archivedAt: new Date().toISOString()
  };
};

export const markHarvestAsArchived = (harvest, archivedAt = null) => {
  const timestamp = archivedAt || new Date().toISOString();
  let updatedDistribution = harvest.distribution || {};
  if (updatedDistribution) {
    updatedDistribution = addDistributionHistory(updatedDistribution, 'archived', {
      archivedAt: timestamp,
      timestamp
    });
  }
  return {
    ...harvest,
    archived: true,
    archivedAt: timestamp,
    fulfillmentStatus: FULFILLMENT_STATUS.ARCHIVED,
    distribution: updatedDistribution
  };
};

export const isHarvestArchived = (harvest) => {
  return harvest?.archived === true;
};

export const canModifyArchivedHarvest = (harvest) => {
  return !isHarvestArchived(harvest);
};

export const getArchivedHarvests = (harvests) => {
  return harvests.filter((h) => isHarvestArchived(h));
};

export const getActiveHarvests = (harvests) => {
  return harvests.filter((h) => !isHarvestArchived(h));
};

export function buildArchive(currentState) {
  const timestamp = new Date().toISOString();
  const stats = {};
  Object.keys(STORAGE_KEYS).forEach((key) => {
    const data = currentState[key];
    if (Array.isArray(data)) {
      stats[key] = data.length;
    } else if (isPlainObject(data)) {
      stats[key] = Object.keys(data).length;
    } else {
      stats[key] = 0;
    }
  });

  const fulfillmentSummary = buildFulfillmentArchiveSummary(
    currentState.harvests || [],
    currentState.contacts || []
  );

  return {
    schema: ARCHIVE_SCHEMA,
    version: ARCHIVE_VERSION,
    exportedAt: timestamp,
    stats,
    fulfillmentSummary,
    data: {
      beds: currentState.beds ? [...currentState.beds] : [],
      harvests: currentState.harvests ? [...currentState.harvests] : [],
      tasks: currentState.tasks ? [...currentState.tasks] : [],
      schedules: currentState.schedules ? [...currentState.schedules] : [],
      contacts: currentState.contacts ? [...currentState.contacts] : [],
      plants: currentState.plants ? [...currentState.plants] : [],
      materials: currentState.materials ? [...currentState.materials] : [],
      transactions: currentState.transactions ? [...currentState.transactions] : [],
      inspections: currentState.inspections ? [...currentState.inspections] : [],
      bedPlacement: currentState.bedPlacement ? { ...currentState.bedPlacement } : {}
    }
  };
}

export function downloadArchive(archive, filename = null) {
  const dateStr = archive.exportedAt.slice(0, 10);
  const safeName = filename || `菜园运营档案-${dateStr}.json`;
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseArchiveFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!isPlainObject(parsed)) {
          reject(new Error('档案格式错误：根节点必须是对象'));
          return;
        }
        if (parsed.schema !== ARCHIVE_SCHEMA) {
          reject(new Error('档案格式不兼容：缺少正确的schema标识'));
          return;
        }
        if (!parsed.data || !isPlainObject(parsed.data)) {
          reject(new Error('档案格式错误：缺少data节点'));
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`JSON解析失败：${err.message}`));
      }
    };
    reader.readAsText(file);
  });
}

export function validateArchiveData(archiveData) {
  const errors = [];
  const warnings = [];
  const { data } = archiveData;

  const existingIds = {};
  Object.keys(STORAGE_KEYS).forEach((key) => {
    existingIds[key] = new Set();
    if (key === 'bedPlacement') return;
    const arr = data[key];
    if (!Array.isArray(arr)) return;
    arr.forEach((item, idx) => {
      if (!item || !isPlainObject(item)) {
        errors.push({ type: key, index: idx, message: '条目不是有效对象' });
        return;
      }
      if (!item.id) {
        errors.push({ type: key, index: idx, message: '缺少id字段' });
        return;
      }
      if (existingIds[key].has(item.id)) {
        errors.push({ type: key, index: idx, id: item.id, message: `id重复: ${item.id}` });
      }
      existingIds[key].add(item.id);
    });
  });

  const validItem = (item) => item && typeof item === 'object' && !Array.isArray(item) && item.id;
  const bedIds = new Set((data.beds || []).filter(validItem).map(b => b.id));
  const bedNames = new Set((data.beds || []).filter(b => b && b.name).map(b => b.name));
  const materialIds = new Set((data.materials || []).filter(validItem).map(m => m.id));
  const taskIds = new Set((data.tasks || []).filter(validItem).map(t => t.id));
  const harvestIds = new Set((data.harvests || []).filter(validItem).map(h => h.id));
  const plantIds = new Set((data.plants || []).filter(validItem).map(p => p.id));
  const inspectionIds = new Set((data.inspections || []).filter(validItem).map(i => i.id));

  (data.harvests || []).forEach((h, idx) => {
    if (!isValidWeightFormat(h.weight)) {
      errors.push({
        type: 'harvests',
        id: h.id,
        index: idx,
        field: 'weight',
        message: `采收重量格式不合法 "${h.weight}"，应使用"1.4kg"或"300g"格式`
      });
    }
    if (h.bed && !bedNames.has(h.bed)) {
      warnings.push({
        type: 'harvests',
        id: h.id,
        index: idx,
        field: 'bed',
        message: `采收记录指向不存在的菜畦名称 "${h.bed}"`
      });
    }
    if (h.distribution) {
      DISTRIBUTION_TYPES.forEach((t) => {
        const val = h.distribution[t.key];
        if (val && !isValidWeightFormat(val)) {
          errors.push({
            type: 'harvests',
            id: h.id,
            index: idx,
            field: `distribution.${t.key}`,
            message: `分配重量（${t.label}）格式不合法 "${val}"`
          });
        }
      });
      const totalWeight = parseWeight(h.weight);
      const distributedTotal = DISTRIBUTION_TYPES.reduce(
        (s, t) => s + parseWeight(h.distribution[t.key]), 0
      );
      if (distributedTotal > totalWeight && totalWeight > 0) {
        warnings.push({
          type: 'harvests',
          id: h.id,
          index: idx,
          field: 'distribution',
          message: `分配总重量超过采收总量`
        });
      }
    }
  });

  (data.inspections || []).forEach((i, idx) => {
    const hasBedRef = (i.bedId && bedIds.has(i.bedId)) || (i.bedName && bedNames.has(i.bedName));
    if (!hasBedRef) {
      warnings.push({
        type: 'inspections',
        id: i.id,
        index: idx,
        field: 'bedId/bedName',
        message: `巡检记录指向不存在的菜畦 ${i.bedName ? `("${i.bedName}")` : ''}`
      });
    }
    if (i.followupTaskId && !taskIds.has(i.followupTaskId)) {
      warnings.push({
        type: 'inspections',
        id: i.id,
        index: idx,
        field: 'followupTaskId',
        message: `巡检跟进任务ID不存在: ${i.followupTaskId}`
      });
    }
  });

  (data.plants || []).forEach((p, idx) => {
    if (p.bedId && !bedIds.has(p.bedId)) {
      warnings.push({
        type: 'plants',
        id: p.id,
        index: idx,
        field: 'bedId',
        message: `种植计划指向不存在的菜畦ID: ${p.bedId}`
      });
    }
  });

  (data.contacts || []).forEach((c, idx) => {
    if (c.bedId && !bedIds.has(c.bedId)) {
      warnings.push({
        type: 'contacts',
        id: c.id,
        index: idx,
        field: 'bedId',
        message: `联系记录指向不存在的菜畦ID: ${c.bedId}`
      });
    }
    if (c.relatedHarvestId && !harvestIds.has(c.relatedHarvestId)) {
      warnings.push({
        type: 'contacts',
        id: c.id,
        index: idx,
        field: 'relatedHarvestId',
        message: `取菜通知指向不存在的采收ID: ${c.relatedHarvestId}`
      });
    }
  });

  (data.transactions || []).forEach((t, idx) => {
    if (t.materialId && !materialIds.has(t.materialId)) {
      warnings.push({
        type: 'transactions',
        id: t.id,
        index: idx,
        field: 'materialId',
        message: `物资流水指向不存在的物资ID: ${t.materialId}`
      });
    }
    if (t.relatedType && t.relatedId) {
      const relatedSets = {
        task: taskIds,
        harvest: harvestIds,
        plant: plantIds,
        inspection: inspectionIds,
        bed: bedIds
      };
      const set = relatedSets[t.relatedType];
      if (set && !set.has(t.relatedId)) {
        warnings.push({
          type: 'transactions',
          id: t.id,
          index: idx,
          field: 'relatedId',
          message: `物资流水${t.relatedType === 'task' ? '任务' :
            t.relatedType === 'harvest' ? '采收' :
            t.relatedType === 'plant' ? '种植' :
            t.relatedType === 'inspection' ? '巡检' :
            t.relatedType === 'bed' ? '菜畦' : t.relatedType}引用不存在: ${t.relatedId}`
        });
      }
    }
    if (t.bedName && !bedNames.has(t.bedName)) {
      warnings.push({
        type: 'transactions',
        id: t.id,
        index: idx,
        field: 'bedName',
        message: `物资流水关联菜畦名称不存在: "${t.bedName}"`
      });
    }
    if (typeof t.quantity !== 'number' || isNaN(t.quantity) || t.quantity < 0) {
      errors.push({
        type: 'transactions',
        id: t.id,
        index: idx,
        field: 'quantity',
        message: `物资流水数量不合法: ${t.quantity}`
      });
    }
  });

  return { errors, warnings };
}

export function computeDiff(localState, archiveData) {
  const result = {};
  const arrayKeys = ['beds', 'harvests', 'tasks', 'schedules', 'contacts', 'plants', 'materials', 'transactions', 'inspections'];

  arrayKeys.forEach((key) => {
    const localItems = localState[key] || [];
    const importItems = archiveData[key] || [];
    const localMap = new Map(localItems.map(item => [item.id, item]));
    const importMap = new Map(importItems.map(item => [item.id, item]));

    const added = [];
    const updated = [];
    const conflicts = [];
    const unchanged = [];
    const localOnly = [];

    importItems.forEach((item) => {
      const local = localMap.get(item.id);
      if (!local) {
        added.push({ id: item.id, incoming: item });
      } else if (deepEqual(local, item)) {
        unchanged.push({ id: item.id, item: local });
      } else {
        const conflictFields = findConflictFields(local, item);
        if (conflictFields.some((field) => field.isHigh)) {
          conflicts.push({ id: item.id, incoming: item, current: local, fields: conflictFields });
        } else {
          updated.push({ id: item.id, incoming: item, current: local });
        }
      }
    });

    localItems.forEach((item) => {
      if (!importMap.has(item.id)) {
        localOnly.push({ id: item.id, item });
      }
    });

    result[key] = { added, updated, conflicts, unchanged, localOnly };
  });

  if (archiveData.bedPlacement && isPlainObject(archiveData.bedPlacement)) {
    const localPlacement = localState.bedPlacement || {};
    const importPlacement = archiveData.bedPlacement;
    const placementAdded = {};
    const placementUpdated = {};
    const placementConflicts = {};
    const placementUnchanged = {};
    const placementLocalOnly = {};

    Object.entries(importPlacement).forEach(([k, v]) => {
      if (!(k in localPlacement)) {
        placementAdded[k] = v;
      } else if (deepEqual(localPlacement[k], v)) {
        placementUnchanged[k] = v;
      } else {
        placementUpdated[k] = { incoming: v, current: localPlacement[k] };
      }
    });
    Object.entries(localPlacement).forEach(([k, v]) => {
      if (!(k in importPlacement)) {
        placementLocalOnly[k] = v;
      }
    });
    result.bedPlacement = { placementAdded, placementUpdated, placementConflicts, placementUnchanged, placementLocalOnly };
  }

  return result;
}

function findConflictFields(a, b) {
  const HIGH_SENSITIVITY_FIELDS = [
    'status', 'done', 'treatmentResult', 'syncStatus', 'pickupStatus',
    'growthStage', 'adopter', 'owner', 'archived', 'archivedAt',
    'fulfillmentStatus', 'distribution'
  ];
  const conflicts = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  allKeys.forEach((k) => {
    if (!deepEqual(a[k], b[k])) {
      conflicts.push({ field: k, isHigh: HIGH_SENSITIVITY_FIELDS.includes(k), current: a[k], incoming: b[k] });
    }
  });
  return conflicts;
}

export function applyImport(localState, archiveData, diff, resolution) {
  const result = {};
  const arrayKeys = ['beds', 'harvests', 'tasks', 'schedules', 'contacts', 'plants', 'materials', 'transactions', 'inspections'];
  const summary = {
    added: {},
    updated: {},
    conflictsResolvedAsIncoming: {},
    conflictsResolvedAsCurrent: {},
    unchanged: {},
    localOnlyKept: {},
    skippedErrors: [],
    skippedWarnings: []
  };

  arrayKeys.forEach((key) => {
    const { added, updated, conflicts, unchanged, localOnly } = diff[key] || { added: [], updated: [], conflicts: [], unchanged: [], localOnly: [] };
    const localMap = new Map((localState[key] || []).map(item => [item.id, item]));
    const importMap = new Map((archiveData[key] || []).map(item => [item.id, item]));
    const idSet = new Set();
    const merged = [];
    summary.added[key] = 0;
    summary.updated[key] = 0;
    summary.conflictsResolvedAsIncoming[key] = 0;
    summary.conflictsResolvedAsCurrent[key] = 0;
    summary.unchanged[key] = unchanged.length;
    summary.localOnlyKept[key] = localOnly.length;

    added.forEach(({ id, incoming }) => {
      if (!idSet.has(id)) {
        merged.push({ ...incoming });
        idSet.add(id);
        summary.added[key]++;
      }
    });

    updated.forEach(({ id, incoming }) => {
      if (!idSet.has(id)) {
        merged.push({ ...incoming });
        idSet.add(id);
        summary.updated[key]++;
      }
    });

    conflicts.forEach(({ id, incoming, current }) => {
      const res = resolution?.conflicts?.[key]?.[id];
      if (!idSet.has(id)) {
        if (res === 'incoming') {
          merged.push({ ...incoming });
          summary.conflictsResolvedAsIncoming[key]++;
        } else if (res === 'current') {
          merged.push({ ...current });
          summary.conflictsResolvedAsCurrent[key]++;
        } else {
          merged.push({ ...current });
          summary.conflictsResolvedAsCurrent[key]++;
        }
        idSet.add(id);
      }
    });

    unchanged.forEach(({ id, item }) => {
      const source = item || localMap.get(id) || importMap.get(id);
      if (source && !idSet.has(id)) {
        merged.push({ ...source });
        idSet.add(id);
      }
    });

    localOnly.forEach(({ item }) => {
      if (!idSet.has(item.id)) {
        merged.push({ ...item });
        idSet.add(item.id);
      }
    });

    result[key] = merged;
  });

  if (diff.bedPlacement) {
    const { placementAdded, placementUpdated, placementUnchanged, placementLocalOnly } = diff.bedPlacement;
    const mergedPlacement = { ...placementLocalOnly };
    Object.entries(placementAdded).forEach(([k, v]) => { mergedPlacement[k] = v; });
    Object.entries(placementUpdated).forEach(([k, v]) => {
      const res = resolution?.placementConflicts?.[k];
      mergedPlacement[k] = res === 'current' ? v.current : v.incoming;
    });
    Object.entries(placementUnchanged).forEach(([k, v]) => { mergedPlacement[k] = v; });
    result.bedPlacement = mergedPlacement;
  } else {
    result.bedPlacement = localState.bedPlacement || {};
  }

  return { mergedState: result, summary };
}

export function persistToLocalStorage(mergedState) {
  const saved = [];
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    const value = mergedState[key];
    if (value !== undefined) {
      localStorage.setItem(storageKey, JSON.stringify(value));
      saved.push(storageKey);
    }
  });
  return saved;
}

export function summarizeImport(summary) {
  const totalAdded = Object.values(summary.added).reduce((s, n) => s + n, 0);
  const totalUpdated = Object.values(summary.updated).reduce((s, n) => s + n, 0);
  const totalIncoming = Object.values(summary.conflictsResolvedAsIncoming).reduce((s, n) => s + n, 0);
  const totalCurrent = Object.values(summary.conflictsResolvedAsCurrent).reduce((s, n) => s + n, 0);
  const totalUnchanged = Object.values(summary.unchanged).reduce((s, n) => s + n, 0);
  const totalKept = Object.values(summary.localOnlyKept).reduce((s, n) => s + n, 0);

  return {
    totalAdded,
    totalUpdated,
    totalIncoming,
    totalCurrent,
    totalUnchanged,
    totalKept,
    byEntity: Object.keys(ENTITY_LABELS).map((key) => ({
      key,
      label: ENTITY_LABELS[key],
      added: summary.added[key] || 0,
      updated: summary.updated[key] || 0,
      conflictsIncoming: summary.conflictsResolvedAsIncoming[key] || 0,
      conflictsCurrent: summary.conflictsResolvedAsCurrent[key] || 0,
      unchanged: summary.unchanged[key] || 0,
      localOnlyKept: summary.localOnlyKept[key] || 0
    }))
  };
}
