import { getTreatmentResultInfo, getAbnormalTypeInfo } from '../data/inspectionData';
import { parseWeight, getDistributionTotal, getPickupStatus, checkPickupNoticeExists, findRelatedPickupNotice } from './distribution';
import { TASK_TYPE_INSPECTION, TASK_TYPE_REVIEW, findTaskByInspectionAndType } from './statusSync';

export const ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
};

export const ISSUE_CATEGORIES = {
  BED_WARNING: 'bed_warning',
  INSPECTION_SYNC: 'inspection_sync',
  TASK_DUPLICATE: 'task_duplicate',
  HARVEST_DISTRIBUTION: 'harvest_distribution',
  PICKUP_STATUS: 'pickup_status',
  PLANT_PLAN: 'plant_plan',
  INVENTORY_REFERENCE: 'inventory_reference'
};

export const CATEGORY_LABELS = {
  [ISSUE_CATEGORIES.BED_WARNING]: '菜畦警告',
  [ISSUE_CATEGORIES.INSPECTION_SYNC]: '巡检同步',
  [ISSUE_CATEGORIES.TASK_DUPLICATE]: '任务重复',
  [ISSUE_CATEGORIES.HARVEST_DISTRIBUTION]: '采收分配',
  [ISSUE_CATEGORIES.PICKUP_STATUS]: '认养自取',
  [ISSUE_CATEGORIES.PLANT_PLAN]: '种植计划',
  [ISSUE_CATEGORIES.INVENTORY_REFERENCE]: '库存关联'
};

const createIssue = (id, category, severity, title, description, affectedItems, fixType, fixData) => ({
  id,
  category,
  severity,
  title,
  description,
  affectedItems,
  fixType,
  fixData,
  fixed: false
});

export const checkResolvedInspectionWithWarning = (beds, inspections) => {
  const issues = [];

  for (const bed of beds) {
    if (!bed.warning) continue;

    const bedInspections = inspections.filter(i => i.bedName === bed.name);
    const unresolvedInspections = bedInspections.filter(i => {
      const treatment = getTreatmentResultInfo(i.treatmentResult);
      return !treatment.clearsWarning;
    });

    if (unresolvedInspections.length === 0 && bedInspections.length > 0) {
      const resolvedInspections = bedInspections.filter(i => {
        const treatment = getTreatmentResultInfo(i.treatmentResult);
        return treatment.clearsWarning;
      });

      if (resolvedInspections.length > 0) {
        const lastResolved = resolvedInspections.sort((a, b) =>
          new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
        )[resolvedInspections.length - 1];

        issues.push(createIssue(
          `bed-warning-${bed.id}`,
          ISSUE_CATEGORIES.BED_WARNING,
          ISSUE_SEVERITY.WARNING,
          `${bed.name} 存在残留警告`,
          `菜畦异常提醒"${bed.warning}"无对应未解决巡检记录，最近一次已解决巡检：${lastResolved.date} ${getAbnormalTypeInfo(lastResolved.abnormalType).label}`,
          [{ type: 'bed', id: bed.id, name: bed.name }],
          'clear_bed_warning',
          { bedId: bed.id }
        ));
      }
    }
  }

  return issues;
};

export const checkDuplicateTasksFromInspection = (tasks, inspections) => {
  const issues = [];

  for (const inspection of inspections) {
    const treatment = getTreatmentResultInfo(inspection.treatmentResult);

    if (treatment.createsTask) {
      const relatedTasks = tasks.filter(t =>
        t.relatedInspectionId === inspection.id && t.taskType === TASK_TYPE_INSPECTION
      );

      if (relatedTasks.length > 1) {
        const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
        issues.push(createIssue(
          `dup-task-inspection-${inspection.id}`,
          ISSUE_CATEGORIES.TASK_DUPLICATE,
          ISSUE_SEVERITY.WARNING,
          `${inspection.bedName} 巡检重复生成任务`,
          `巡检"${abnormal.label}"生成了 ${relatedTasks.length} 条相同类型的任务，正常应为1条`,
          [
            { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` },
            ...relatedTasks.map(t => ({ type: 'task', id: t.id, name: t.title }))
          ],
          'remove_duplicate_tasks',
          { inspectionId: inspection.id, taskType: TASK_TYPE_INSPECTION, keepCount: 1 }
        ));
      }
    }

    if (treatment.needsFollowupPlan && inspection.followupDate) {
      const relatedReviewTasks = tasks.filter(t =>
        t.relatedInspectionId === inspection.id && t.taskType === TASK_TYPE_REVIEW
      );

      if (relatedReviewTasks.length > 1) {
        const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
        issues.push(createIssue(
          `dup-review-${inspection.id}`,
          ISSUE_CATEGORIES.TASK_DUPLICATE,
          ISSUE_SEVERITY.WARNING,
          `${inspection.bedName} 复查任务重复`,
          `巡检复查计划生成了 ${relatedReviewTasks.length} 条复查任务，正常应为1条`,
          [
            { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` },
            ...relatedReviewTasks.map(t => ({ type: 'task', id: t.id, name: t.title }))
          ],
          'remove_duplicate_tasks',
          { inspectionId: inspection.id, taskType: TASK_TYPE_REVIEW, keepCount: 1 }
        ));
      }
    }
  }

  return issues;
};

export const checkOverDistribution = (harvests) => {
  const issues = [];

  for (const harvest of harvests) {
    if (!harvest.distribution) continue;

    const totalWeight = parseWeight(harvest.weight);
    const distributed = getDistributionTotal(harvest.distribution);

    if (distributed > totalWeight && totalWeight > 0) {
      const overAmount = distributed - totalWeight;
      issues.push(createIssue(
        `over-dist-${harvest.id}`,
        ISSUE_CATEGORIES.HARVEST_DISTRIBUTION,
        ISSUE_SEVERITY.CRITICAL,
        `${harvest.crop}（${harvest.bed}）分配超量`,
        `采摘总量 ${harvest.weight}，已分配 ${Math.round(distributed)}g，超出 ${Math.round(overAmount)}g`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` }
        ],
        'adjust_distribution',
        { harvestId: harvest.id, maxAllowed: totalWeight }
      ));
    }
  }

  return issues;
};

export const checkIdleBedWithActivePlant = (beds, plants) => {
  const issues = [];
  const idleBedIds = beds.filter(b => b.status === '空闲').map(b => b.id);
  const plantBedIds = plants.map(p => p.bedId);

  for (const bedId of idleBedIds) {
    if (plantBedIds.includes(bedId)) {
      const bed = beds.find(b => b.id === bedId);
      const activePlants = plants.filter(p => p.bedId === bedId);

      issues.push(createIssue(
        `idle-bed-plant-${bedId}`,
        ISSUE_CATEGORIES.PLANT_PLAN,
        ISSUE_SEVERITY.WARNING,
        `${bed.name} 状态为空闲但有种植计划`,
        `菜畦状态标记为"空闲"，但存在 ${activePlants.length} 条活跃种植计划：${activePlants.map(p => p.crop).join('、')}`,
        [
          { type: 'bed', id: bed.id, name: bed.name },
          ...activePlants.map(p => ({ type: 'plant', id: p.id, name: `${p.bedName}-${p.crop}` }))
        ],
        'update_bed_status',
        { bedId: bed.id, newStatus: '认养中' }
      ));
    }
  }

  return issues;
};

export const checkInventoryDeletedReferences = (transactions, tasks, harvests, plants, inspections, beds, materials) => {
  const issues = [];
  const taskIds = new Set(tasks.map(t => t.id));
  const harvestIds = new Set(harvests.map(h => h.id));
  const plantIds = new Set(plants.map(p => p.id));
  const inspectionIds = new Set(inspections.map(i => i.id));
  const bedIds = new Set(beds.map(b => b.id));
  const materialIds = new Set(materials.map(m => m.id));

  for (const transaction of transactions) {
    let deletedRef = null;

    if (!materialIds.has(transaction.materialId)) {
      deletedRef = {
        type: 'material',
        id: transaction.materialId,
        name: transaction.materialName || '未知物资'
      };
    }

    if (transaction.relatedId && transaction.relatedType) {
      const idMap = {
        task: taskIds,
        harvest: harvestIds,
        plant: plantIds,
        inspection: inspectionIds,
        bed: bedIds
      };

      const typeLabels = {
        task: '任务',
        harvest: '采摘记录',
        plant: '种植计划',
        inspection: '巡检记录',
        bed: '菜畦'
      };

      if (idMap[transaction.relatedType] && !idMap[transaction.relatedType].has(transaction.relatedId)) {
        deletedRef = {
          type: transaction.relatedType,
          id: transaction.relatedId,
          name: `${typeLabels[transaction.relatedType]}: ${transaction.relatedName || '已删除'}`
        };
      }
    }

    if (deletedRef) {
      const relatedTypeLabel = {
        task: '维护任务',
        harvest: '采摘记录',
        plant: '种植计划',
        inspection: '巡检记录',
        bed: '菜畦',
        material: '物资'
      };

      issues.push(createIssue(
        `inv-ref-${transaction.id}`,
        ISSUE_CATEGORIES.INVENTORY_REFERENCE,
        ISSUE_SEVERITY.WARNING,
        `库存流水关联已删除${relatedTypeLabel[deletedRef.type]}`,
        `${transaction.date} ${transaction.materialName} ${transaction.type === 'inbound' ? '+' : '-'}${transaction.quantity}${transaction.unit} 关联的${relatedTypeLabel[deletedRef.type]} "${deletedRef.name}" 不存在`,
        [
          { type: 'transaction', id: transaction.id, name: `${transaction.materialName} ${transaction.type === 'inbound' ? '入库' : '消耗'}` },
          deletedRef
        ],
        transaction.relatedId ? 'clear_transaction_relation' : 'handle_missing_material',
        { transactionId: transaction.id, deletedRefType: deletedRef.type }
      ));
    }
  }

  return issues;
};

export const checkInspectionSyncStatus = (inspections, beds, tasks) => {
  const issues = [];

  for (const inspection of inspections) {
    if (inspection.syncStatus === 'synced') continue;

    const treatment = getTreatmentResultInfo(inspection.treatmentResult);
    const abnormal = getAbnormalTypeInfo(inspection.abnormalType);

    const bed = beds.find(b => b.name === inspection.bedName);
    const expectedWarning = treatment.clearsWarning ? null : `${abnormal.label}待处理：${inspection.note.slice(0, 20)}...`;

    let syncIssues = [];

    if (bed && treatment.clearsWarning && bed.warning) {
      syncIssues.push('菜畦警告未清除');
    } else if (bed && !treatment.clearsWarning && !bed.warning) {
      syncIssues.push('菜畦警告未同步');
    }

    if (treatment.createsTask) {
      const taskExists = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_INSPECTION);
      if (!taskExists) {
        syncIssues.push('跟进任务未生成');
      }
    }

    if (treatment.needsFollowupPlan && inspection.followupDate) {
      const reviewTaskExists = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW);
      if (!reviewTaskExists) {
        syncIssues.push('复查任务未生成');
      }
    }

    if (syncIssues.length > 0 || inspection.syncStatus === 'error' || inspection.retryCount > 0) {
      issues.push(createIssue(
        `inspection-sync-${inspection.id}`,
        ISSUE_CATEGORIES.INSPECTION_SYNC,
        inspection.syncStatus === 'error' ? ISSUE_SEVERITY.CRITICAL : ISSUE_SEVERITY.WARNING,
        `${inspection.bedName} 巡检同步异常`,
        `巡检"${abnormal.label}"处理结果：${treatment.label}，${syncIssues.length > 0 ? '问题：' + syncIssues.join('、') : '同步状态：' + inspection.syncStatus}${inspection.retryCount > 0 ? `，重试${inspection.retryCount}次` : ''}`,
        [
          { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` }
        ],
        'retry_sync_inspection',
        { inspectionId: inspection.id }
      ));
    }
  }

  return issues;
};

export const checkTaskDoneWithActiveInspection = (tasks, inspections) => {
  const issues = [];

  for (const task of tasks) {
    if (!task.done || !task.relatedInspectionId) continue;

    const inspection = inspections.find(i => i.id === task.relatedInspectionId);
    if (!inspection) continue;

    const treatment = getTreatmentResultInfo(inspection.treatmentResult);
    if (treatment.clearsWarning) continue;

    const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
    issues.push(createIssue(
      `task-done-active-${task.id}`,
      ISSUE_CATEGORIES.INSPECTION_SYNC,
      ISSUE_SEVERITY.INFO,
      `任务完成但巡检仍需关注`,
      `任务"${task.title}"已标记完成，但关联巡检"${abnormal.label}"处理结果为"${treatment.label}"，仍需持续关注`,
      [
        { type: 'task', id: task.id, name: task.title },
        { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` }
      ],
      'review_inspection_status',
      { inspectionId: inspection.id, taskId: task.id }
    ));
  }

  return issues;
};

export const checkPickupNoticeInconsistency = (harvests, contacts) => {
  const issues = [];

  for (const harvest of harvests) {
    const pickupStatus = getPickupStatus(harvest);
    const noticeExists = checkPickupNoticeExists(contacts, harvest.id);
    const notice = findRelatedPickupNotice(contacts, harvest.id);

    if (pickupStatus.key === 'pending') {
      if (!noticeExists) {
        issues.push(createIssue(
          `pickup-no-notice-${harvest.id}`,
          ISSUE_CATEGORIES.PICKUP_STATUS,
          ISSUE_SEVERITY.WARNING,
          `${harvest.crop}（${harvest.bed}）待自取但未通知`,
          `认养人自取 ${harvest.distribution?.selfPickup || ''} 已登记 ${pickupStatus.daysSince} 天，但未发送取菜通知`,
          [
            { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` }
          ],
          'send_pickup_notice',
          { harvestId: harvest.id }
        ));
      } else if (notice && notice.pickupStatus === 'confirmed' && !harvest.distribution?.selfPickupConfirmedAt) {
        issues.push(createIssue(
          `pickup-notice-conflict-${harvest.id}`,
          ISSUE_CATEGORIES.PICKUP_STATUS,
          ISSUE_SEVERITY.WARNING,
          `${harvest.crop}（${harvest.bed}）自取状态不一致`,
          `联系记录显示已确认取菜，但采收记录未更新确认时间`,
          [
            { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` },
            { type: 'contact', id: notice.id, name: '取菜通知' }
          ],
          'sync_pickup_confirmation',
          { harvestId: harvest.id, contactId: notice.id }
        ));
      }
    }

    if (pickupStatus.key === 'confirmed' && notice && notice.pickupStatus !== 'confirmed') {
      issues.push(createIssue(
        `pickup-notice-outofsync-${harvest.id}`,
        ISSUE_CATEGORIES.PICKUP_STATUS,
        ISSUE_SEVERITY.INFO,
        `${harvest.crop}（${harvest.bed}）通知记录待更新`,
        `采收记录显示已取菜，但联系记录中的取菜通知状态未同步更新`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` },
          { type: 'contact', id: notice.id, name: '取菜通知' }
        ],
        'sync_pickup_confirmation',
        { harvestId: harvest.id, contactId: notice.id }
      ));
    }
  }

  return issues;
};

export const runAllConsistencyChecks = (data) => {
  const { beds, tasks, inspections, harvests, plants, transactions, contacts, materials } = data;

  const allIssues = [
    ...checkResolvedInspectionWithWarning(beds, inspections),
    ...checkDuplicateTasksFromInspection(tasks, inspections),
    ...checkOverDistribution(harvests),
    ...checkIdleBedWithActivePlant(beds, plants),
    ...checkInventoryDeletedReferences(transactions, tasks, harvests, plants, inspections, beds, materials),
    ...checkInspectionSyncStatus(inspections, beds, tasks),
    ...checkTaskDoneWithActiveInspection(tasks, inspections),
    ...checkPickupNoticeInconsistency(harvests, contacts)
  ];

  return allIssues.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

export const getConsistencyStats = (issues) => {
  const stats = {
    total: issues.length,
    critical: issues.filter(i => i.severity === ISSUE_SEVERITY.CRITICAL).length,
    warning: issues.filter(i => i.severity === ISSUE_SEVERITY.WARNING).length,
    info: issues.filter(i => i.severity === ISSUE_SEVERITY.INFO).length,
    byCategory: {}
  };

  for (const category of Object.values(ISSUE_CATEGORIES)) {
    stats.byCategory[category] = issues.filter(i => i.category === category).length;
  }

  return stats;
};

export const fixIssue = (issue, data, setters) => {
  const { fixType, fixData } = issue;
  const {
    beds, setBeds, tasks, setTasks, inspections, setInspections,
    harvests, setHarvests, plants, setPlants, transactions, setTransactions,
    contacts, setContacts
  } = { ...data, ...setters };

  switch (fixType) {
    case 'clear_bed_warning': {
      setBeds(beds.map(b => b.id === fixData.bedId ? { ...b, warning: '' } : b));
      return true;
    }

    case 'remove_duplicate_tasks': {
      const relatedTasks = tasks.filter(t =>
        t.relatedInspectionId === fixData.inspectionId && t.taskType === fixData.taskType
      );
      const tasksToKeep = relatedTasks.slice(0, fixData.keepCount).map(t => t.id);
      setTasks(tasks.filter(t =>
        !(t.relatedInspectionId === fixData.inspectionId &&
          t.taskType === fixData.taskType &&
          !tasksToKeep.includes(t.id))
      ));
      return true;
    }

    case 'adjust_distribution': {
      const harvest = harvests.find(h => h.id === fixData.harvestId);
      if (!harvest || !harvest.distribution) return false;

      const ratio = fixData.maxAllowed / getDistributionTotal(harvest.distribution);
      const adjustedDist = { ...harvest.distribution };

      for (const key of Object.keys(adjustedDist)) {
        if (key === 'distributionUpdatedAt' || key === 'selfPickupConfirmedAt') continue;
        if (adjustedDist[key]) {
          const grams = parseWeight(adjustedDist[key]);
          const newGrams = Math.round(grams * ratio);
          adjustedDist[key] = newGrams >= 1000
            ? `${(newGrams / 1000).toFixed(1)}kg`
            : `${newGrams}g`;
        }
      }

      setHarvests(harvests.map(h =>
        h.id === fixData.harvestId ? { ...h, distribution: adjustedDist } : h
      ));
      return true;
    }

    case 'update_bed_status': {
      setBeds(beds.map(b =>
        b.id === fixData.bedId ? { ...b, status: fixData.newStatus } : b
      ));
      return true;
    }

    case 'clear_transaction_relation': {
      setTransactions(transactions.map(t =>
        t.id === fixData.transactionId
          ? { ...t, relatedType: '', relatedId: '', relatedName: '' }
          : t
      ));
      return true;
    }

    case 'handle_missing_material': {
      return false;
    }

    default:
      return false;
  }
};
