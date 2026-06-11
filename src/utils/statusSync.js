import { getAbnormalTypeInfo, getTreatmentResultInfo, ABNORMAL_TYPES } from '../data/inspectionData';

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
  const syncResults = [];

  const pendingInspections = inspections.filter(i => i.syncStatus !== 'synced');

  for (const inspection of pendingInspections) {
    try {
      const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
      const treatment = getTreatmentResultInfo(inspection.treatmentResult);

      updatedBeds = syncInspectionToBed(inspection, updatedBeds);

      const newTask = generateTaskFromInspection(inspection);
      if (newTask) {
        const taskExists = updatedTasks.some(t => t.relatedInspectionId === inspection.id);
        if (!taskExists) {
          updatedTasks = [newTask, ...updatedTasks];
        }
      }

      syncResults.push({
        inspectionId: inspection.id,
        status: 'synced',
        bedUpdated: true,
        taskCreated: !!newTask && !updatedTasks.some(t => t.relatedInspectionId === inspection.id && updatedTasks.indexOf(t) === 0),
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

export const getBedInspectionSummary = (bedName, inspections) => {
  const bedInspections = inspections.filter(i => i.bedName === bedName);
  const sorted = [...bedInspections].sort((a, b) =>
    new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
  );

  const lastInspection = sorted[0];
  const unresolved = sorted.filter(i => {
    const treatment = getTreatmentResultInfo(i.treatmentResult);
    return !treatment.clearsWarning;
  });

  const abnormalCount = {};
  for (const insp of bedInspections) {
    const info = getAbnormalTypeInfo(insp.abnormalType);
    abnormalCount[info.key] = (abnormalCount[info.key] || 0) + 1;
  }

  return {
    total: bedInspections.length,
    lastInspection,
    unresolvedCount: unresolved.length,
    abnormalCount,
    recent: sorted.slice(0, 5)
  };
};
