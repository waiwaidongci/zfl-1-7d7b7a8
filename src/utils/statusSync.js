import { getAbnormalTypeInfo, getTreatmentResultInfo, ABNORMAL_TYPES } from '../data/inspectionData';

export const TASK_TYPE_INSPECTION = 'inspection_followup';
export const TASK_TYPE_REVIEW = 'review_plan';

export const CLOSED_LOOP_STATUS = {
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  BROKEN: 'broken',
  PENDING: 'pending'
};

export const getClosedLoopStatus = (inspection, tasks, transactions) => {
  const status = {
    status: CLOSED_LOOP_STATUS.PENDING,
    issues: [],
    details: {
      hasFollowupTask: false,
      followupTaskDone: false,
      hasReviewTask: false,
      reviewTaskDone: false,
      hasTransactions: false,
      reviewOverdue: false,
      isSynced: inspection.syncStatus === 'synced'
    }
  };

  const treatment = getTreatmentResultInfo(inspection.treatmentResult);
  const abnormal = getAbnormalTypeInfo(inspection.abnormalType);

  if (treatment.createsTask) {
    const followupTask = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_INSPECTION);
    if (followupTask) {
      status.details.hasFollowupTask = true;
      status.details.followupTaskDone = followupTask.done;
    } else {
      status.issues.push(`缺少${abnormal.label}跟进任务`);
    }
  }

  if (treatment.needsFollowupPlan && inspection.followupDate) {
    const reviewTask = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW);
    if (reviewTask) {
      status.details.hasReviewTask = true;
      status.details.reviewTaskDone = reviewTask.done;
      const today = new Date().toISOString().slice(0, 10);
      if (!reviewTask.done && inspection.followupDate < today) {
        status.details.reviewOverdue = true;
        const days = Math.floor((new Date(today) - new Date(inspection.followupDate)) / 86400000);
        status.issues.push(`复查任务已逾期${days}天`);
      }
    } else {
      status.issues.push(`缺少复查任务（计划于${inspection.followupDate}）`);
    }
  }

  const relatedTx = transactions.filter(
    t => t.relatedType === 'inspection' && t.relatedId === inspection.id
  );
  status.details.hasTransactions = relatedTx.length > 0;

  if (!status.details.isSynced) {
    status.issues.push('巡检状态待同步');
  }

  if (status.issues.length === 0) {
    if (treatment.clearsWarning) {
      status.status = CLOSED_LOOP_STATUS.COMPLETE;
    } else if (status.details.hasFollowupTask && status.details.hasReviewTask) {
      if (status.details.followupTaskDone && status.details.reviewTaskDone) {
        status.status = CLOSED_LOOP_STATUS.COMPLETE;
      } else {
        status.status = CLOSED_LOOP_STATUS.PENDING;
      }
    } else if (status.details.hasFollowupTask) {
      status.status = status.details.followupTaskDone ? CLOSED_LOOP_STATUS.COMPLETE : CLOSED_LOOP_STATUS.PENDING;
    } else {
      status.status = CLOSED_LOOP_STATUS.COMPLETE;
    }
  } else {
    const hasBrokenIssue = status.issues.some(i => i.includes('缺少'));
    status.status = hasBrokenIssue ? CLOSED_LOOP_STATUS.BROKEN : CLOSED_LOOP_STATUS.INCOMPLETE;
  }

  return status;
};

export const syncTaskCompletionToInspection = (task, inspections, beds, allTasks) => {
  if (!task.relatedInspectionId) {
    return { inspections, beds, updated: false };
  }

  const inspection = inspections.find(i => i.id === task.relatedInspectionId);
  if (!inspection) {
    return { inspections, beds, updated: false };
  }

  let updatedInspections = [...inspections];
  let updatedBeds = [...beds];
  let updated = false;

  if (task.taskType === TASK_TYPE_REVIEW) {
    const idx = updatedInspections.findIndex(i => i.id === inspection.id);
    if (idx !== -1 && !updatedInspections[idx].reviewCompletedAt) {
      updatedInspections[idx] = {
        ...updatedInspections[idx],
        reviewCompletedAt: new Date().toISOString()
      };
      updated = true;
    }
  }

  const treatment = getTreatmentResultInfo(inspection.treatmentResult);
  if (!treatment.clearsWarning) {
    const relatedTasks = allTasks.filter(t =>
      t.relatedInspectionId === inspection.id && t.taskType === TASK_TYPE_INSPECTION
    );
    const allRelatedDone = relatedTasks.length > 0 && relatedTasks.every(t => t.done);
    const reviewTask = findTaskByInspectionAndType(allTasks, inspection.id, TASK_TYPE_REVIEW);
    const reviewDone = !treatment.needsFollowupPlan || (reviewTask && reviewTask.done);

    if (allRelatedDone && reviewDone) {
      const bedIdx = updatedBeds.findIndex(b => b.name === inspection.bedName);
      if (bedIdx !== -1 && updatedBeds[bedIdx].warning) {
        updatedBeds[bedIdx] = { ...updatedBeds[bedIdx], warning: '' };
        updated = true;
      }
    }
  }

  return { inspections: updatedInspections, beds: updatedBeds, updated };
};

export const findBrokenLinks = (inspections, tasks, transactions) => {
  const issues = [];
  const inspectionIds = new Set(inspections.map(i => i.id));

  for (const task of tasks) {
    if (!task.relatedInspectionId) continue;
    if (!inspectionIds.has(task.relatedInspectionId)) {
      issues.push({
        id: `broken-task-${task.id}`,
        type: 'broken_link_task',
        severity: 'warning',
        category: 'closed_loop',
        title: '任务关联巡检不存在',
        description: `任务"${task.title}"关联的巡检记录已被删除，但任务仍保留关联信息`,
        affectedItems: [
          { type: 'task', id: task.id, name: task.title }
        ],
        fixType: 'clear_task_relation',
        fixData: { taskId: task.id }
      });
    }
  }

  for (const inspection of inspections) {
    const treatment = getTreatmentResultInfo(inspection.treatmentResult);

    if (treatment.createsTask) {
      const task = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_INSPECTION);
      if (!task) {
        const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
        issues.push({
          id: `broken-inspection-task-${inspection.id}`,
          type: 'broken_link_inspection',
          severity: 'warning',
          category: 'closed_loop',
          title: `${inspection.bedName} 巡检缺少跟进任务`,
          description: `巡检"${abnormal.label}"处理结果为"${treatment.label}"，应生成跟进任务但任务不存在`,
          affectedItems: [
            { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` }
          ],
          fixType: 'recreate_missing_task',
          fixData: { inspectionId: inspection.id, taskType: TASK_TYPE_INSPECTION }
        });
      }
    }

    if (treatment.needsFollowupPlan && inspection.followupDate) {
      const reviewTask = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW);
      if (!reviewTask) {
        const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
        issues.push({
          id: `broken-inspection-review-${inspection.id}`,
          type: 'missing_review_task',
          severity: 'warning',
          category: 'closed_loop',
          title: `${inspection.bedName} 巡检缺少复查任务`,
          description: `巡检"${abnormal.label}"计划于 ${inspection.followupDate} 复查，应生成复查任务但任务不存在`,
          affectedItems: [
            { type: 'inspection', id: inspection.id, name: `${inspection.bedName}-${abnormal.label}` }
          ],
          fixType: 'recreate_missing_task',
          fixData: { inspectionId: inspection.id, taskType: TASK_TYPE_REVIEW }
        });
      }
    }
  }

  const transactionRelatedTypes = ['task', 'harvest', 'plant', 'inspection', 'bed'];
  const validIds = {
    task: new Set(tasks.map(t => t.id)),
    harvest: new Set(),
    plant: new Set(),
    inspection: inspectionIds,
    bed: new Set()
  };

  for (const tx of transactions) {
    if (!tx.relatedType || !tx.relatedId) continue;
    if (!transactionRelatedTypes.includes(tx.relatedType)) continue;

    const ids = validIds[tx.relatedType];
    if (ids && !ids.has(tx.relatedId)) {
      const typeLabels = { task: '任务', harvest: '采收记录', plant: '种植计划', inspection: '巡检记录', bed: '菜畦' };
      issues.push({
        id: `orphan-transaction-${tx.id}`,
        type: 'orphan_transaction',
        severity: 'warning',
        category: 'inventory_reference',
        title: `库存流水关联已删除${typeLabels[tx.relatedType]}`,
        description: `${tx.date} ${tx.materialName} ${tx.type === 'inbound' ? '+' : '-'}${tx.quantity}${tx.unit} 关联的${typeLabels[tx.relatedType]} "${tx.relatedName || '已删除'}" 不存在`,
        affectedItems: [
          { type: 'transaction', id: tx.id, name: `${tx.materialName} ${tx.type === 'inbound' ? '入库' : '消耗'}` }
        ],
        fixType: 'clear_transaction_relation',
        fixData: { transactionId: tx.id }
      });
    }
  }

  return issues;
};

export const generateWarningFromInspection = (inspection) => {
  const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
  const treatment = getTreatmentResultInfo(inspection.treatmentResult);

  if (treatment.clearsWarning) {
    return null;
  }

  return `${abnormal.label}待处理：${inspection.note.slice(0, 30)}...`;
};

export const generateTaskFromInspection = (inspection) => {
  const treatment = getTreatmentResultInfo(inspection.treatmentResult);
  if (!treatment.createsTask) return null;

  const abnormal = getAbnormalTypeInfo(inspection.abnormalType);

  return {
    id: crypto.randomUUID(),
    title: `${inspection.bedName} - ${abnormal.label}${treatment.key === 'escalated' ? '（上报）' : '跟进'}`,
    owner: treatment.key === 'escalated' ? '园艺管家' : '值班志愿者',
    due: getTaskDueDate(abnormal.severity),
    done: false,
    relatedInspectionId: inspection.id,
    taskType: TASK_TYPE_INSPECTION,
    createdAt: new Date().toISOString()
  };
};

export const generateReviewTaskFromInspection = (inspection) => {
  const treatment = getTreatmentResultInfo(inspection.treatmentResult);
  if (!treatment.needsFollowupPlan || !inspection.followupDate) return null;

  const abnormal = getAbnormalTypeInfo(inspection.abnormalType);

  return {
    id: crypto.randomUUID(),
    title: `${inspection.bedName} - ${abnormal.label}复查`,
    owner: inspection.followupOwner || '值班志愿者',
    due: inspection.followupDate,
    done: false,
    relatedInspectionId: inspection.id,
    taskType: TASK_TYPE_REVIEW,
    createdAt: new Date().toISOString()
  };
};

const getTaskDueDate = (severity) => {
  const today = new Date();
  let offsetDays = 3;
  if (severity === 'danger') offsetDays = 1;
  if (severity === 'warning') offsetDays = 2;
  if (severity === 'info') offsetDays = 5;

  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const findTaskByInspectionAndType = (tasks, inspectionId, taskType) => {
  return tasks.find(t => t.relatedInspectionId === inspectionId && t.taskType === taskType);
};

export const getFollowupStatus = (inspection, tasks) => {
  if (!inspection) return { key: 'none', label: '', overdue: false };
  const treatment = getTreatmentResultInfo(inspection.treatmentResult);

  if (!treatment.needsFollowupPlan) {
    return { key: 'not_required', label: '无需复查', overdue: false };
  }

  if (!inspection.followupDate) {
    return { key: 'no_plan', label: '待安排复查', overdue: false };
  }

  const reviewTask = findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = inspection.followupDate < today;

  if (reviewTask && reviewTask.done) {
    return { key: 'completed', label: '复查已完成', overdue: false, taskId: reviewTask.id };
  }

  if (isOverdue) {
    return { key: 'overdue', label: `复查逾期（${inspection.followupDate}）`, overdue: true, taskId: reviewTask?.id };
  }

  return { key: 'pending', label: `待复查（${inspection.followupDate}）`, overdue: false, taskId: reviewTask?.id };
};

export const getOverdueReviewTasks = (tasks, inspections) => {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = [];

  for (const inspection of inspections) {
    const status = getFollowupStatus(inspection, tasks);
    if (status.overdue) {
      const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
      overdue.push({
        id: `review-overdue-${inspection.id}`,
        type: 'review_overdue',
        bed: inspection.bedName,
        inspectionId: inspection.id,
        label: `${inspection.bedName} 复查逾期`,
        message: `${abnormal.label}复查计划于 ${inspection.followupDate}，负责人：${inspection.followupOwner || '未指定'}`,
        abnormal: abnormal.label,
        followupDate: inspection.followupDate,
        followupOwner: inspection.followupOwner
      });
    }
  }

  return overdue;
};

export const syncInspectionToBed = (inspection, beds) => {
  const treatment = getTreatmentResultInfo(inspection.treatmentResult);
  const warningText = generateWarningFromInspection(inspection);

  const bed = beds.find(b => b.name === inspection.bedName);
  if (!bed) return beds;

  return beds.map(b => {
    if (b.name !== inspection.bedName) return b;
    return {
      ...b,
      warning: warningText || ''
    };
  });
};

export const syncAllInspections = (inspections, beds, tasks) => {
  let updatedBeds = [...beds];
  let updatedTasks = [...tasks];
  let updatedInspections = [...inspections];
  const syncResults = [];

  const pendingInspections = inspections.filter(i => i.syncStatus !== 'synced');

  for (const inspection of pendingInspections) {
    try {
      const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
      const treatment = getTreatmentResultInfo(inspection.treatmentResult);

      updatedBeds = syncInspectionToBed(inspection, updatedBeds);

      const inspectionTask = generateTaskFromInspection(inspection);
      if (inspectionTask) {
        const taskExists = findTaskByInspectionAndType(updatedTasks, inspection.id, TASK_TYPE_INSPECTION);
        if (!taskExists) {
          updatedTasks = [inspectionTask, ...updatedTasks];
        }
      }

      const reviewTask = generateReviewTaskFromInspection(inspection);
      let reviewTaskId = inspection.followupTaskId;
      if (reviewTask) {
        const existingReviewTask = findTaskByInspectionAndType(updatedTasks, inspection.id, TASK_TYPE_REVIEW);
        if (!existingReviewTask) {
          updatedTasks = [reviewTask, ...updatedTasks];
          reviewTaskId = reviewTask.id;
        } else {
          reviewTaskId = existingReviewTask.id;
        }
      }

      if (reviewTaskId !== inspection.followupTaskId) {
        updatedInspections = updatedInspections.map(i =>
          i.id === inspection.id ? { ...i, followupTaskId: reviewTaskId } : i
        );
      }

      syncResults.push({
        inspectionId: inspection.id,
        status: 'synced',
        bedUpdated: true,
        taskCreated: !!inspectionTask,
        reviewTaskCreated: !!reviewTask && !findTaskByInspectionAndType(tasks, inspection.id, TASK_TYPE_REVIEW),
        severity: abnormal.severity,
        clearsWarning: treatment.clearsWarning
      });
    } catch (error) {
      syncResults.push({
        inspectionId: inspection.id,
        status: 'error',
        error: error.message
      });
    }
  }

  return {
    beds: updatedBeds,
    tasks: updatedTasks,
    inspections: updatedInspections,
    syncResults
  };
};

export const updateInspectionSyncStatus = (inspections, inspectionId, status, retryCount = 0) => {
  return inspections.map(i => {
    if (i.id !== inspectionId) return i;
    return {
      ...i,
      syncStatus: status,
      retryCount,
      syncedAt: status === 'synced' ? new Date().toISOString() : i.syncedAt
    };
  });
};

export const validateStatusConsistency = (beds, tasks, inspections) => {
  const issues = [];

  for (const bed of beds) {
    if (!bed.warning) continue;

    const relatedInspections = inspections.filter(i =>
      i.bedName === bed.name && i.syncStatus === 'synced'
    );

    const activeWarnings = relatedInspections.filter(i => {
      const treatment = getTreatmentResultInfo(i.treatmentResult);
      return !treatment.clearsWarning;
    });

    if (activeWarnings.length === 0 && bed.warning) {
      issues.push({
        type: 'orphaned_warning',
        bedName: bed.name,
        message: `${bed.name}有异常提醒但无关联的未解决巡检记录`
      });
    }

    const relatedTasks = tasks.filter(t =>
      t.title.includes(bed.name) && !t.done
    );

    const inspectionTasks = relatedInspections.filter(i => {
      const treatment = getTreatmentResultInfo(i.treatmentResult);
      return treatment.createsTask;
    });

    if (inspectionTasks.length > relatedTasks.length) {
      issues.push({
        type: 'missing_task',
        bedName: bed.name,
        message: `${bed.name}的巡检记录需要生成任务但任务列表中不存在`
      });
    }
  }

  return issues;
};

export const getInspectionSyncStats = (inspections) => {
  const total = inspections.length;
  const synced = inspections.filter(i => i.syncStatus === 'synced').length;
  const pending = inspections.filter(i => i.syncStatus === 'pending').length;
  const error = inspections.filter(i => i.syncStatus === 'error').length;
  const withWarning = inspections.filter(i => {
    const treatment = getTreatmentResultInfo(i.treatmentResult);
    return !treatment.clearsWarning;
  }).length;
  const withTask = inspections.filter(i => {
    const treatment = getTreatmentResultInfo(i.treatmentResult);
    return treatment.createsTask;
  }).length;

  return { total, synced, pending, error, withWarning, withTask };
};

export const getBedInspectionSummary = (bedName, inspections, tasks = []) => {
  const bedInspections = inspections.filter(i => i.bedName === bedName);
  const sorted = [...bedInspections].sort((a, b) =>
    new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
  );

  const lastInspection = sorted[0];
  const unresolved = sorted.filter(i => {
    const treatment = getTreatmentResultInfo(i.treatmentResult);
    return !treatment.clearsWarning;
  });

  let pendingReviewCount = 0;
  let overdueReviewCount = 0;
  for (const insp of bedInspections) {
    const status = getFollowupStatus(insp, tasks);
    if (status.key === 'pending' || status.key === 'no_plan') pendingReviewCount++;
    if (status.overdue) overdueReviewCount++;
  }

  const abnormalCount = {};
  for (const insp of bedInspections) {
    const info = getAbnormalTypeInfo(insp.abnormalType);
    abnormalCount[info.key] = (abnormalCount[info.key] || 0) + 1;
  }

  return {
    total: bedInspections.length,
    lastInspection,
    unresolvedCount: unresolved.length,
    pendingReviewCount,
    overdueReviewCount,
    abnormalCount,
    recent: sorted.slice(0, 5)
  };
};
