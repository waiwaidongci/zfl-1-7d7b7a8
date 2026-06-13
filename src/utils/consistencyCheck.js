import { getTreatmentResultInfo, getAbnormalTypeInfo } from '../data/inspectionData';
import {
  parseWeight, getDistributionTotal, getPickupStatus, checkPickupNoticeExists, findRelatedPickupNotice,
  getSelfPickupTakenGrams, getSelfPickupRemainingGrams, getMissingContactInfo,
  getAllPickupNotices, getFulfillmentStatus, FULFILLMENT_STATUS, PICKUP_REISSUE_GRACE_DAYS,
  getDistributionRemaining, DISTRIBUTION_TYPES, formatWeight, recordPartialPickup,
  generateReissueNoticeContact
} from './distribution';
import {
  TASK_TYPE_INSPECTION, TASK_TYPE_REVIEW, findTaskByInspectionAndType,
  findBrokenLinks, generateTaskFromInspection, generateReviewTaskFromInspection
} from './statusSync';

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
  INVENTORY_REFERENCE: 'inventory_reference',
  CLOSED_LOOP: 'closed_loop',
  FULFILLMENT_CONSISTENCY: 'fulfillment_consistency'
};

export const CATEGORY_LABELS = {
  [ISSUE_CATEGORIES.BED_WARNING]: '菜畦警告',
  [ISSUE_CATEGORIES.INSPECTION_SYNC]: '巡检同步',
  [ISSUE_CATEGORIES.TASK_DUPLICATE]: '任务重复',
  [ISSUE_CATEGORIES.HARVEST_DISTRIBUTION]: '采收分配',
  [ISSUE_CATEGORIES.PICKUP_STATUS]: '认养自取',
  [ISSUE_CATEGORIES.PLANT_PLAN]: '种植计划',
  [ISSUE_CATEGORIES.INVENTORY_REFERENCE]: '库存关联',
  [ISSUE_CATEGORIES.CLOSED_LOOP]: '闭环完整性',
  [ISSUE_CATEGORIES.FULFILLMENT_CONSISTENCY]: '履约一致性'
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

export const checkOverdueReviewTasks = (inspections, tasks) => {
  const issues = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const inspection of inspections) {
    const treatment = getTreatmentResultInfo(inspection.treatmentResult);
    if (!treatment.needsFollowupPlan || !inspection.followupDate) continue;

    const reviewTask = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW);
    if (!reviewTask || reviewTask.done) continue;

    if (inspection.followupDate < today) {
      const days = Math.floor((new Date(today) - new Date(inspection.followupDate)) / 86400000);
      const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
      issues.push(createIssue(
        `overdue-review-${inspection.id}`,
        ISSUE_CATEGORIES.CLOSED_LOOP,
        ISSUE_SEVERITY.WARNING,
        `${inspection.bedName} ${abnormal.label}复查逾期${days}天`,
        `复查任务计划于 ${inspection.followupDate} 完成，已逾期${days}天未执行`,
        [
          { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` },
          { type: 'task', id: reviewTask.id, name: reviewTask.title }
        ],
        'mark_review_task_done',
        { taskId: reviewTask.id, inspectionId: inspection.id }
      ));
    }
  }

  return issues;
};

export const checkInspectionTaskCompletedWithoutStatusUpdate = (inspections, tasks) => {
  const issues = [];

  for (const task of tasks) {
    if (!task.relatedInspectionId || !task.done) continue;
    if (task.taskType !== TASK_TYPE_INSPECTION) continue;

    const inspection = inspections.find(i => i.id === task.relatedInspectionId);
    if (!inspection) continue;

    const treatment = getTreatmentResultInfo(inspection.treatmentResult);
    if (treatment.clearsWarning) continue;

    if (inspection.syncStatus !== 'synced') {
      const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
      issues.push(createIssue(
        `task-done-status-pending-${task.id}`,
        ISSUE_CATEGORIES.CLOSED_LOOP,
        ISSUE_SEVERITY.INFO,
        `${task.title} 已完成但巡检状态待同步`,
        `跟进任务已标记完成，但关联的巡检记录处置状态仍待同步回写`,
        [
          { type: 'task', id: task.id, name: task.title },
          { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` }
        ],
        'update_inspection_to_resolved',
        { inspectionId: inspection.id, taskId: task.id }
      ));
    }
  }

  return issues;
};

export const checkPartialPickupConsistency = (harvests) => {
  const issues = [];

  for (const harvest of harvests) {
    if (!harvest.distribution) continue;

    const selfPickupTotal = parseWeight(harvest.distribution.selfPickup) || 0;
    const selfPickupTaken = getSelfPickupTakenGrams(harvest.distribution);

    if (selfPickupTaken > selfPickupTotal && selfPickupTotal > 0) {
      issues.push(createIssue(
        `partial-pickup-over-${harvest.id}`,
        ISSUE_CATEGORIES.FULFILLMENT_CONSISTENCY,
        ISSUE_SEVERITY.CRITICAL,
        `${harvest.crop}（${harvest.bed}）自取数量异常`,
        `已取走重量(${formatWeight(selfPickupTaken)})超过分配总量(${formatWeight(selfPickupTotal)})`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` }
        ],
        'fix_partial_pickup_over',
        { harvestId: harvest.id, maxAllowed: selfPickupTotal }
      ));
    }

    if (harvest.distribution.selfPickupConfirmedAt && selfPickupTaken < selfPickupTotal && selfPickupTotal > 0) {
      issues.push(createIssue(
        `partial-pickup-unconfirmed-${harvest.id}`,
        ISSUE_CATEGORIES.FULFILLMENT_CONSISTENCY,
        ISSUE_SEVERITY.WARNING,
        `${harvest.crop}（${harvest.bed}）确认状态不一致`,
        `已标记确认取菜，但仍有${formatWeight(selfPickupTotal - selfPickupTaken)}未取走`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` }
        ],
        'unset_pickup_confirmation',
        { harvestId: harvest.id }
      ));
    }
  }

  return issues;
};

export const checkMissingContactInfo = (harvests, beds) => {
  const issues = [];

  for (const harvest of harvests) {
    if (!harvest.distribution?.selfPickup) continue;
    if (harvest.archived) continue;

    const fulfillment = getFulfillmentStatus(harvest);
    if (fulfillment.key === FULFILLMENT_STATUS.COMPLETED || fulfillment.key === FULFILLMENT_STATUS.ARCHIVED) continue;

    const missing = getMissingContactInfo(harvest, beds);
    if (missing.length > 0) {
      issues.push(createIssue(
        `missing-contact-${harvest.id}`,
        ISSUE_CATEGORIES.PICKUP_STATUS,
        ISSUE_SEVERITY.WARNING,
        `${harvest.crop}（${harvest.bed}）联系人信息不完整`,
        `缺少：${missing.join('、')}，无法发送取菜通知`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` },
          { type: 'bed', id: beds.find(b => b.name === harvest.bed)?.id || '', name: harvest.bed }
        ],
        'add_contact_info',
        { harvestId: harvest.id, bedName: harvest.bed, missingFields: missing }
      ));
    }
  }

  return issues;
};

export const checkDuplicateNotifications = (harvests, contacts) => {
  const issues = [];

  for (const harvest of harvests) {
    const notices = getAllPickupNotices(contacts, harvest.id);
    if (notices.length <= 1) continue;

    const lastNotice = notices[0];
    const daysSinceLast = Math.floor(
      (new Date() - new Date(lastNotice.date + ' ' + lastNotice.time)) / 86400000
    );

    if (daysSinceLast < PICKUP_REISSUE_GRACE_DAYS) {
      issues.push(createIssue(
        `dup-notice-${harvest.id}`,
        ISSUE_CATEGORIES.FULFILLMENT_CONSISTENCY,
        ISSUE_SEVERITY.INFO,
        `${harvest.crop}（${harvest.bed}）通知发送过于频繁`,
        `${notices.length}天内已发送${notices.length}次取菜通知，建议${PICKUP_REISSUE_GRACE_DAYS}天后再补发`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` },
          ...notices.map(n => ({ type: 'contact', id: n.id, name: `${n.date} ${n.time}` }))
        ],
        'wait_for_grace_period',
        { harvestId: harvest.id, graceDays: PICKUP_REISSUE_GRACE_DAYS, daysSinceLast }
      ));
    }
  }

  return issues;
};

export const checkUnconfirmedPickupWithNotice = (harvests, contacts) => {
  const issues = [];

  for (const harvest of harvests) {
    if (!harvest.distribution?.selfPickup) continue;
    if (harvest.archived) continue;

    const notices = getAllPickupNotices(contacts, harvest.id);
    if (notices.length === 0) continue;

    const lastNotice = notices[0];
    if (lastNotice.pickupStatus === 'confirmed') continue;

    const daysSinceNotice = Math.floor(
      (new Date() - new Date(lastNotice.date + ' ' + lastNotice.time)) / 86400000
    );

    if (daysSinceNotice > PICKUP_REISSUE_GRACE_DAYS + 2) {
      const remaining = getSelfPickupRemainingGrams(harvest.distribution);
      if (remaining > 0) {
        issues.push(createIssue(
          `unconfirmed-pickup-${harvest.id}`,
          ISSUE_CATEGORIES.PICKUP_STATUS,
          ISSUE_SEVERITY.WARNING,
          `${harvest.crop}（${harvest.bed}）超期待确认`,
          `已发送${notices.length}次通知，最后一次${daysSinceNotice}天前，仍有${formatWeight(remaining)}待确认取走`,
          [
            { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` },
            { type: 'contact', id: lastNotice.id, name: `${lastNotice.date} ${lastNotice.time}` }
          ],
          'reissue_pickup_notice',
          { harvestId: harvest.id, noticeCount: notices.length, daysSinceNotice }
        ));
      }
    }
  }

  return issues;
};

export const checkArchivedRecordModification = (harvests, originalHarvests = []) => {
  const issues = [];
  const originalMap = new Map(originalHarvests.map(h => [h.id, h]));

  for (const harvest of harvests) {
    if (!harvest.archived) continue;
    const original = originalMap.get(harvest.id);
    if (!original) continue;

    const hasChanged = JSON.stringify(harvest) !== JSON.stringify(original);
    if (hasChanged) {
      issues.push(createIssue(
        `archived-modified-${harvest.id}`,
        ISSUE_CATEGORIES.FULFILLMENT_CONSISTENCY,
        ISSUE_SEVERITY.WARNING,
        `${harvest.crop}（${harvest.bed}）归档记录被修改`,
        `已归档的采收记录不应被修改，请检查数据一致性`,
        [
          { type: 'harvest', id: harvest.id, name: `${harvest.crop} ${harvest.weight}` }
        ],
        'restore_archived_record',
        { harvestId: harvest.id }
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
    ...checkPickupNoticeInconsistency(harvests, contacts),
    ...findBrokenLinks(inspections, tasks, transactions),
    ...checkOverdueReviewTasks(inspections, tasks),
    ...checkInspectionTaskCompletedWithoutStatusUpdate(inspections, tasks),
    ...checkPartialPickupConsistency(harvests),
    ...checkMissingContactInfo(harvests, beds),
    ...checkDuplicateNotifications(harvests, contacts),
    ...checkUnconfirmedPickupWithNotice(harvests, contacts)
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

    case 'clear_task_relation': {
      setTasks(tasks.map(t =>
        t.id === fixData.taskId
          ? { ...t, relatedInspectionId: undefined, taskType: undefined }
          : t
      ));
      return true;
    }

    case 'recreate_missing_task': {
      const inspection = inspections.find(i => i.id === fixData.inspectionId);
      if (!inspection) return false;

      let newTask;
      if (fixData.taskType === TASK_TYPE_INSPECTION) {
        newTask = generateTaskFromInspection(inspection);
      } else if (fixData.taskType === TASK_TYPE_REVIEW) {
        newTask = generateReviewTaskFromInspection(inspection);
      }

      if (!newTask) return false;
      setTasks([...tasks, newTask]);
      return true;
    }

    case 'mark_review_task_done': {
      setTasks(tasks.map(t =>
        t.id === fixData.taskId ? { ...t, done: true, doneAt: new Date().toISOString() } : t
      ));
      if (fixData.inspectionId) {
        setInspections(inspections.map(i =>
          i.id === fixData.inspectionId ? { ...i, reviewCompletedAt: new Date().toISOString() } : i
        ));
      }
      return true;
    }

    case 'update_inspection_to_resolved': {
      setInspections(inspections.map(i =>
        i.id === fixData.inspectionId ? { ...i, syncStatus: 'synced', retryCount: 0 } : i
      ));
      return true;
    }

    case 'fix_partial_pickup_over': {
      const harvest = harvests.find(h => h.id === fixData.harvestId);
      if (!harvest || !harvest.distribution) return false;
      const adjustedDist = {
        ...harvest.distribution,
        selfPickupTaken: harvest.distribution.selfPickup
      };
      setHarvests(harvests.map(h =>
        h.id === fixData.harvestId ? { ...h, distribution: adjustedDist } : h
      ));
      return true;
    }

    case 'unset_pickup_confirmation': {
      setHarvests(harvests.map(h => {
        if (h.id !== fixData.harvestId || !h.distribution) return h;
        const dist = { ...h.distribution };
        delete dist.selfPickupConfirmedAt;
        return { ...h, distribution: dist };
      }));
      return true;
    }

    case 'add_contact_info': {
      return false;
    }

    case 'wait_for_grace_period': {
      return false;
    }

    case 'reissue_pickup_notice': {
      const harvest = harvests.find(h => h.id === fixData.harvestId);
      if (!harvest) return false;
      const contact = generateReissueNoticeContact(harvest, beds, contacts);
      if (!contact || contact.error) return false;
      setContacts([contact, ...contacts]);
      return true;
    }

    case 'restore_archived_record': {
      return false;
    }

    default:
      return false;
  }
};
