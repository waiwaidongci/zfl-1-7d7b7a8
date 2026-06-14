import { describe, it, expect, vi } from 'vitest';
import {
  getClosedLoopStatus,
  CLOSED_LOOP_STATUS,
  syncTaskCompletionToInspection,
  syncAllInspections,
  generateTaskFromInspection,
  generateReviewTaskFromInspection,
  findTaskByInspectionAndType,
  TASK_TYPE_INSPECTION,
  TASK_TYPE_REVIEW,
  getFollowupStatus,
  findBrokenLinks,
  syncInspectionToBed,
  validateStatusConsistency,
  getInspectionSyncStats,
  getOverdueReviewTasks,
  updateInspectionSyncStatus,
  getBedInspectionSummary,
  generateWarningFromInspection
} from '../statusSync';
import { ABNORMAL_TYPES, TREATMENT_RESULTS } from '../../data/inspectionData';

describe('statusSync.js - 巡检任务同步', () => {
  const mockInspection = (overrides = {}) => ({
    id: 'insp-1',
    bedId: 'bed-1',
    bedName: 'A01番茄畦',
    abnormalType: 'pest',
    treatmentResult: 'needs_followup',
    note: '发现少量蚜虫，需跟进处理',
    photos: [],
    inspector: '测试员',
    date: '2025-06-10',
    time: '10:00',
    followupDate: '2025-06-15',
    followupOwner: '张三',
    followupTaskId: null,
    syncStatus: 'pending',
    retryCount: 0,
    createdAt: '2025-06-10T10:00:00.000Z',
    ...overrides
  });

  const mockBed = (overrides = {}) => ({
    id: 'bed-1',
    name: 'A01番茄畦',
    crop: '番茄',
    adopter: '李阿姨',
    warning: '',
    ...overrides
  });

  describe('generateTaskFromInspection', () => {
    it('处理结果需跟进时生成跟进任务', () => {
      const inspection = mockInspection({ treatmentResult: 'needs_followup' });
      const task = generateTaskFromInspection(inspection);
      expect(task).not.toBeNull();
      expect(task.relatedInspectionId).toBe('insp-1');
      expect(task.taskType).toBe(TASK_TYPE_INSPECTION);
      expect(task.done).toBe(false);
      expect(task.title).toContain('A01番茄畦');
      expect(task.title).toContain('虫害');
    });

    it('已上报时生成上报任务且负责人为园艺管家', () => {
      const inspection = mockInspection({ treatmentResult: 'escalated' });
      const task = generateTaskFromInspection(inspection);
      expect(task).not.toBeNull();
      expect(task.owner).toBe('园艺管家');
      expect(task.title).toContain('上报');
    });

    it('处理结果已解决时不生成任务', () => {
      const inspection = mockInspection({ treatmentResult: 'resolved' });
      const task = generateTaskFromInspection(inspection);
      expect(task).toBeNull();
    });

    it('无需处理时不生成任务', () => {
      const inspection = mockInspection({ treatmentResult: 'no_action' });
      const task = generateTaskFromInspection(inspection);
      expect(task).toBeNull();
    });
  });

  describe('generateReviewTaskFromInspection', () => {
    it('有复查计划时生成复查任务', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-20',
        followupOwner: '王工'
      });
      const task = generateReviewTaskFromInspection(inspection);
      expect(task).not.toBeNull();
      expect(task.taskType).toBe(TASK_TYPE_REVIEW);
      expect(task.due).toBe('2025-06-20');
      expect(task.owner).toBe('王工');
      expect(task.title).toContain('复查');
    });

    it('无复查日期时不生成复查任务', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: null
      });
      const task = generateReviewTaskFromInspection(inspection);
      expect(task).toBeNull();
    });

    it('无需跟进计划的处理结果不生成复查任务', () => {
      const inspection = mockInspection({
        treatmentResult: 'resolved',
        followupDate: '2025-06-20'
      });
      const task = generateReviewTaskFromInspection(inspection);
      expect(task).toBeNull();
    });
  });

  describe('findTaskByInspectionAndType', () => {
    it('找到对应类型的任务', () => {
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION },
        { id: 't2', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_REVIEW },
        { id: 't3', relatedInspectionId: 'insp-2', taskType: TASK_TYPE_INSPECTION }
      ];
      const found = findTaskByInspectionAndType(tasks, 'insp-1', TASK_TYPE_REVIEW);
      expect(found).not.toBeNull();
      expect(found.id).toBe('t2');
    });

    it('找不到时返回 undefined', () => {
      const tasks = [{ id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION }];
      const found = findTaskByInspectionAndType(tasks, 'insp-999', TASK_TYPE_INSPECTION);
      expect(found).toBeUndefined();
    });
  });

  describe('syncTaskCompletionToInspection', () => {
    it('复查任务完成时更新巡检记录', () => {
      const task = {
        id: 't1',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_REVIEW,
        done: true
      };
      const inspections = [mockInspection({ id: 'insp-1' })];
      const beds = [mockBed()];

      const result = syncTaskCompletionToInspection(task, inspections, beds, [task]);
      expect(result.updated).toBe(true);
      expect(result.inspections[0].reviewCompletedAt).toBeDefined();
    });

    it('非复查任务不更新巡检记录的复查时间', () => {
      const task = {
        id: 't1',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_INSPECTION,
        done: true
      };
      const inspections = [mockInspection({ id: 'insp-1', reviewCompletedAt: null })];
      const beds = [mockBed()];

      const result = syncTaskCompletionToInspection(task, inspections, beds, [task]);
      expect(result.inspections[0].reviewCompletedAt).toBeNull();
    });

    it('所有相关任务完成时清除菜畦警告', () => {
      const inspection = mockInspection({
        id: 'insp-1',
        bedName: 'A01番茄畦',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-20'
      });
      const followupTask = {
        id: 't-follow',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_INSPECTION,
        done: true
      };
      const reviewTask = {
        id: 't-review',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_REVIEW,
        done: true
      };
      const beds = [mockBed({ name: 'A01番茄畦', warning: '虫害待处理' })];

      const result = syncTaskCompletionToInspection(
        reviewTask,
        [inspection],
        beds,
        [followupTask, reviewTask]
      );
      expect(result.updated).toBe(true);
      expect(result.beds[0].warning).toBe('');
    });

    it('任务无关联巡检时不更新', () => {
      const task = { id: 't1', taskType: TASK_TYPE_REVIEW, done: true };
      const inspections = [mockInspection()];
      const beds = [mockBed()];

      const result = syncTaskCompletionToInspection(task, inspections, beds, []);
      expect(result.updated).toBe(false);
    });
  });

  describe('syncAllInspections', () => {
    it('同步待同步的巡检记录', () => {
      const inspectionPending = mockInspection({
        id: 'insp-pending',
        syncStatus: 'pending',
        treatmentResult: 'needs_followup'
      });
      const inspectionSynced = mockInspection({
        id: 'insp-synced',
        syncStatus: 'synced',
        treatmentResult: 'resolved'
      });
      const beds = [mockBed({ name: 'A01番茄畦', warning: '' })];

      const result = syncAllInspections(
        [inspectionPending, inspectionSynced],
        beds,
        []
      );

      expect(result.syncResults.length).toBe(1);
      expect(result.syncResults[0].status).toBe('synced');
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it('同步时更新菜畦警告', () => {
      const inspection = mockInspection({
        id: 'insp-1',
        bedName: 'A01番茄畦',
        syncStatus: 'pending',
        treatmentResult: 'needs_followup',
        abnormalType: 'pest'
      });
      const beds = [mockBed({ name: 'A01番茄畦', warning: '' })];

      const result = syncAllInspections([inspection], beds, []);
      expect(result.beds[0].warning).not.toBe('');
      expect(result.beds[0].warning).toContain('虫害');
    });

    it('已解决的巡检不生成任务但清除警告', () => {
      const inspection = mockInspection({
        id: 'insp-1',
        bedName: 'A01番茄畦',
        syncStatus: 'pending',
        treatmentResult: 'resolved'
      });
      const beds = [mockBed({ name: 'A01番茄畦', warning: '虫害待处理' })];

      const result = syncAllInspections([inspection], beds, []);
      expect(result.beds[0].warning).toBe('');
      expect(result.tasks.length).toBe(0);
    });

    it('同步已同步的巡检不重复生成任务', () => {
      const inspection = mockInspection({
        id: 'insp-1',
        syncStatus: 'pending',
        treatmentResult: 'needs_followup'
      });
      const beds = [mockBed()];

      const result1 = syncAllInspections([inspection], beds, []);
      const result2 = syncAllInspections(
        result1.inspections,
        result1.beds,
        result1.tasks
      );

      const tasksForInspection = result2.tasks.filter(
        t => t.relatedInspectionId === 'insp-1'
      );
      expect(tasksForInspection.length).toBeLessThanOrEqual(2);
    });
  });

  describe('syncInspectionToBed', () => {
    it('未解决的巡检添加警告到菜畦', () => {
      const inspection = mockInspection({
        bedName: 'A01番茄畦',
        treatmentResult: 'needs_followup',
        abnormalType: 'pest',
        note: '发现少量蚜虫需跟进'
      });
      const beds = [mockBed({ name: 'A01番茄畦', warning: '' })];

      const updatedBeds = syncInspectionToBed(inspection, beds);
      expect(updatedBeds[0].warning).not.toBe('');
      expect(updatedBeds[0].warning).toContain('虫害');
    });

    it('已解决的巡检清除警告', () => {
      const inspection = mockInspection({
        bedName: 'A01番茄畦',
        treatmentResult: 'resolved'
      });
      const beds = [mockBed({ name: 'A01番茄畦', warning: '虫害待处理' })];

      const updatedBeds = syncInspectionToBed(inspection, beds);
      expect(updatedBeds[0].warning).toBe('');
    });

    it('菜畦不存在时不报错', () => {
      const inspection = mockInspection({ bedName: '不存在的畦' });
      const beds = [mockBed()];

      const updatedBeds = syncInspectionToBed(inspection, beds);
      expect(updatedBeds).toHaveLength(1);
    });
  });
});

describe('statusSync.js - 闭环状态', () => {
  const mockInspection = (overrides = {}) => ({
    id: 'insp-1',
    bedName: 'A01番茄畦',
    abnormalType: 'pest',
    treatmentResult: 'needs_followup',
    followupDate: '2025-06-20',
    syncStatus: 'synced',
    ...overrides
  });

  describe('getClosedLoopStatus', () => {
    it('所有环节完整时闭环完成', () => {
      const inspection = mockInspection();
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION, done: true },
        { id: 't2', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_REVIEW, done: true }
      ];
      const transactions = [
        { id: 'tx1', relatedType: 'inspection', relatedId: 'insp-1' }
      ];

      const status = getClosedLoopStatus(inspection, tasks, transactions);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.COMPLETE);
      expect(status.issues).toHaveLength(0);
    });

    it('缺少跟进任务时返回 broken', () => {
      const inspection = mockInspection();
      const status = getClosedLoopStatus(inspection, [], []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.BROKEN);
      expect(status.issues.some(i => i.includes('缺少'))).toBe(true);
    });

    it('任务未完成时返回 pending', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: null,
        syncStatus: 'synced'
      });
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION, done: false }
      ];
      const status = getClosedLoopStatus(inspection, tasks, []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.PENDING);
    });

    it('巡检未同步时返回 incomplete', () => {
      const inspection = mockInspection({
        syncStatus: 'pending',
        treatmentResult: 'resolved'
      });
      const status = getClosedLoopStatus(inspection, [], []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.INCOMPLETE);
      expect(status.issues.some(i => i.includes('待同步'))).toBe(true);
    });

    it('复查任务逾期时标记逾期', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-10'
      });
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION, done: true },
        { id: 't2', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_REVIEW, done: false }
      ];

      const status = getClosedLoopStatus(inspection, tasks, []);
      expect(status.details.reviewOverdue).toBe(true);
      expect(status.issues.some(i => i.includes('逾期'))).toBe(true);
    });
  });

  describe('getFollowupStatus', () => {
    it('无需复查时返回 not_required', () => {
      const inspection = mockInspection({ treatmentResult: 'resolved' });
      const status = getFollowupStatus(inspection, []);
      expect(status.key).toBe('not_required');
    });

    it('有复查计划但未安排返回 no_plan', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: null
      });
      const status = getFollowupStatus(inspection, []);
      expect(status.key).toBe('no_plan');
    });

    it('复查任务已完成返回 completed', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-20'
      });
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_REVIEW, done: true }
      ];
      const status = getFollowupStatus(inspection, tasks);
      expect(status.key).toBe('completed');
    });

    it('复查逾期返回 overdue', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-01'
      });
      const status = getFollowupStatus(inspection, []);
      expect(status.key).toBe('overdue');
      expect(status.overdue).toBe(true);
    });

    it('待复查且未逾期返回 pending', () => {
      const inspection = mockInspection({
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-30'
      });
      const status = getFollowupStatus(inspection, []);
      expect(status.key).toBe('pending');
      expect(status.overdue).toBe(false);
    });
  });

  describe('findBrokenLinks', () => {
    it('检测到任务关联不存在的巡检', () => {
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-not-exist', title: '跟进任务' }
      ];
      const issues = findBrokenLinks([], tasks, []);
      expect(issues.some(i => i.type === 'broken_link_task')).toBe(true);
    });

    it('检测到巡检缺少跟进任务', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', treatmentResult: 'needs_followup' })
      ];
      const issues = findBrokenLinks(inspections, [], []);
      expect(issues.some(i => i.type === 'broken_link_inspection')).toBe(true);
    });

    it('检测到巡检缺少复查任务', () => {
      const inspections = [
        mockInspection({
          id: 'insp-1',
          treatmentResult: 'needs_followup',
          followupDate: '2025-06-20'
        })
      ];
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION }
      ];
      const issues = findBrokenLinks(inspections, tasks, []);
      expect(issues.some(i => i.type === 'missing_review_task')).toBe(true);
    });

    it('检测到孤立的库存流水', () => {
      const transactions = [
        {
          id: 'tx1',
          relatedType: 'task',
          relatedId: 'task-not-exist',
          materialName: '肥料',
          type: 'outbound',
          quantity: 1,
          date: '2025-06-10'
        }
      ];
      const issues = findBrokenLinks([], [], transactions);
      expect(issues.some(i => i.type === 'orphan_transaction')).toBe(true);
    });

    it('正常数据无断链问题', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', treatmentResult: 'resolved' })
      ];
      const tasks = [];
      const transactions = [];
      const issues = findBrokenLinks(inspections, tasks, transactions);
      expect(issues).toHaveLength(0);
    });
  });

  describe('validateStatusConsistency', () => {
    it('检测到孤立警告（有警告但无未解决巡检）', () => {
      const beds = [{ id: 'b1', name: 'A01', warning: '虫害待处理' }];
      const inspections = [
        { id: 'i1', bedName: 'A01', syncStatus: 'synced', treatmentResult: 'resolved' }
      ];
      const issues = validateStatusConsistency(beds, [], inspections);
      expect(issues.some(i => i.type === 'orphaned_warning')).toBe(true);
    });

    it('检测到缺少任务', () => {
      const beds = [{ id: 'b1', name: 'A01', warning: '虫害待处理' }];
      const inspections = [
        { id: 'i1', bedName: 'A01', syncStatus: 'synced', treatmentResult: 'needs_followup' }
      ];
      const issues = validateStatusConsistency(beds, [], inspections);
      expect(issues.some(i => i.type === 'missing_task')).toBe(true);
    });

    it('正常状态一致性无问题', () => {
      const beds = [{ id: 'b1', name: 'A01', warning: '' }];
      const inspections = [
        { id: 'i1', bedName: 'A01', syncStatus: 'synced', treatmentResult: 'resolved' }
      ];
      const issues = validateStatusConsistency(beds, [], inspections);
      expect(issues).toHaveLength(0);
    });
  });
});

describe('statusSync.js - 统计与逾期', () => {
  describe('getInspectionSyncStats', () => {
    it('正确统计各同步状态数量', () => {
      const inspections = [
        { id: 'i1', syncStatus: 'synced', treatmentResult: 'resolved' },
        { id: 'i2', syncStatus: 'pending', treatmentResult: 'needs_followup' },
        { id: 'i3', syncStatus: 'error', treatmentResult: 'escalated' },
        { id: 'i4', syncStatus: 'synced', treatmentResult: 'needs_followup' }
      ];
      const stats = getInspectionSyncStats(inspections);
      expect(stats.total).toBe(4);
      expect(stats.synced).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.withWarning).toBe(3);
      expect(stats.withTask).toBe(3);
    });
  });

  describe('getOverdueReviewTasks', () => {
    it('正确识别逾期复查', () => {
      const inspections = [
        {
          id: 'i1',
          bedName: 'A01',
          abnormalType: 'pest',
          treatmentResult: 'needs_followup',
          followupDate: '2025-06-01',
          followupOwner: '张三'
        },
        {
          id: 'i2',
          bedName: 'A02',
          abnormalType: 'disease',
          treatmentResult: 'needs_followup',
          followupDate: '2025-06-30'
        }
      ];
      const overdue = getOverdueReviewTasks([], inspections);
      expect(overdue.length).toBe(1);
      expect(overdue[0].inspectionId).toBe('i1');
      expect(overdue[0].followupOwner).toBe('张三');
    });
  });
});

describe('statusSync.js - 扩展覆盖', () => {
  const mockInspection = (overrides = {}) => ({
    id: 'insp-1',
    bedId: 'bed-1',
    bedName: 'A01番茄畦',
    abnormalType: 'pest',
    treatmentResult: 'needs_followup',
    note: '发现少量蚜虫，需跟进处理',
    photos: [],
    inspector: '测试员',
    date: '2025-06-10',
    time: '10:00',
    followupDate: '2025-06-15',
    followupOwner: '张三',
    followupTaskId: null,
    syncStatus: 'pending',
    retryCount: 0,
    createdAt: '2025-06-10T10:00:00.000Z',
    ...overrides
  });

  const mockBed = (overrides = {}) => ({
    id: 'bed-1',
    name: 'A01番茄畦',
    crop: '番茄',
    adopter: '李阿姨',
    warning: '',
    ...overrides
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updateInspectionSyncStatus', () => {
    it('sets syncStatus to synced and adds syncedAt', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', syncStatus: 'pending', retryCount: 0 })
      ];
      const result = updateInspectionSyncStatus(inspections, 'insp-1', 'synced', 1);
      expect(result[0].syncStatus).toBe('synced');
      expect(result[0].syncedAt).toBe('2025-06-15T10:00:00.000Z');
      expect(result[0].retryCount).toBe(1);
    });

    it('non-matching inspections unchanged', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', syncStatus: 'pending' }),
        mockInspection({ id: 'insp-2', syncStatus: 'pending' })
      ];
      const result = updateInspectionSyncStatus(inspections, 'insp-1', 'synced', 0);
      expect(result[1].syncStatus).toBe('pending');
    });

    it('sets syncedAt only when status is synced', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', syncStatus: 'synced', syncedAt: '2025-06-14T10:00:00.000Z' })
      ];
      const result = updateInspectionSyncStatus(inspections, 'insp-1', 'error', 2);
      expect(result[0].syncStatus).toBe('error');
      expect(result[0].syncedAt).toBe('2025-06-14T10:00:00.000Z');
      expect(result[0].retryCount).toBe(2);
    });
  });

  describe('getBedInspectionSummary', () => {
    it('correct total, lastInspection, unresolvedCount', () => {
      const inspections = [
        mockInspection({ id: 'i1', bedName: 'A01番茄畦', date: '2025-06-10', time: '10:00', treatmentResult: 'needs_followup', abnormalType: 'pest' }),
        mockInspection({ id: 'i2', bedName: 'A01番茄畦', date: '2025-06-12', time: '09:00', treatmentResult: 'resolved', abnormalType: 'disease' }),
        mockInspection({ id: 'i3', bedName: 'A01番茄畦', date: '2025-06-11', time: '14:00', treatmentResult: 'escalated', abnormalType: 'pest' })
      ];
      const summary = getBedInspectionSummary('A01番茄畦', inspections, []);
      expect(summary.total).toBe(3);
      expect(summary.lastInspection.id).toBe('i2');
      expect(summary.unresolvedCount).toBe(2);
    });

    it('pendingReviewCount and overdueReviewCount', () => {
      const inspections = [
        mockInspection({ id: 'i1', bedName: 'A01番茄畦', treatmentResult: 'needs_followup', followupDate: '2025-06-20', abnormalType: 'pest' }),
        mockInspection({ id: 'i2', bedName: 'A01番茄畦', treatmentResult: 'needs_followup', followupDate: '2025-06-01', abnormalType: 'disease' }),
        mockInspection({ id: 'i3', bedName: 'A01番茄畦', treatmentResult: 'resolved', abnormalType: 'pest' })
      ];
      const summary = getBedInspectionSummary('A01番茄畦', inspections, []);
      expect(summary.pendingReviewCount).toBe(1);
      expect(summary.overdueReviewCount).toBe(1);
    });

    it('abnormalCount groups correctly', () => {
      const inspections = [
        mockInspection({ id: 'i1', bedName: 'A01番茄畦', abnormalType: 'pest' }),
        mockInspection({ id: 'i2', bedName: 'A01番茄畦', abnormalType: 'pest' }),
        mockInspection({ id: 'i3', bedName: 'A01番茄畦', abnormalType: 'disease' })
      ];
      const summary = getBedInspectionSummary('A01番茄畦', inspections, []);
      expect(summary.abnormalCount.pest).toBe(2);
      expect(summary.abnormalCount.disease).toBe(1);
    });

    it('recent limited to 5', () => {
      const inspections = Array.from({ length: 8 }, (_, i) =>
        mockInspection({ id: `i${i}`, bedName: 'A01番茄畦', date: `2025-06-${String(10 + i).padStart(2, '0')}`, time: '10:00' })
      );
      const summary = getBedInspectionSummary('A01番茄畦', inspections, []);
      expect(summary.recent).toHaveLength(5);
    });

    it('no inspections for bed returns total 0', () => {
      const inspections = [mockInspection({ bedName: 'B02黄瓜畦' })];
      const summary = getBedInspectionSummary('A01番茄畦', inspections, []);
      expect(summary.total).toBe(0);
      expect(summary.lastInspection).toBeUndefined();
      expect(summary.unresolvedCount).toBe(0);
    });
  });

  describe('generateWarningFromInspection', () => {
    it('returns warning text for unresolved inspection', () => {
      const inspection = mockInspection({
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        note: '发现少量蚜虫，需跟进处理'
      });
      const warning = generateWarningFromInspection(inspection);
      expect(warning).not.toBeNull();
      expect(warning).toContain('虫害');
      expect(warning).toContain('发现少量蚜虫，需跟进处理'.slice(0, 30));
    });

    it('returns null for resolved inspection', () => {
      const inspection = mockInspection({ treatmentResult: 'resolved' });
      const warning = generateWarningFromInspection(inspection);
      expect(warning).toBeNull();
    });
  });

  describe('syncAllInspections error handling', () => {
    it('inspection that throws during sync produces error syncResult', () => {
      const inspection = mockInspection({
        id: 'insp-error',
        syncStatus: 'pending',
        treatmentResult: 'needs_followup',
        note: null
      });
      const beds = [mockBed({ name: 'A01番茄畦' })];
      const result = syncAllInspections([inspection], beds, []);
      expect(result.syncResults).toHaveLength(1);
      expect(result.syncResults[0].status).toBe('error');
      expect(result.syncResults[0].inspectionId).toBe('insp-error');
    });
  });

  describe('getClosedLoopStatus combinations', () => {
    it('not synced and missing task returns BROKEN', () => {
      const inspection = mockInspection({
        syncStatus: 'pending',
        treatmentResult: 'needs_followup',
        followupDate: null
      });
      const status = getClosedLoopStatus(inspection, [], []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.BROKEN);
      expect(status.issues.some(i => i.includes('缺少'))).toBe(true);
    });

    it('not synced but resolved returns INCOMPLETE', () => {
      const inspection = mockInspection({
        syncStatus: 'pending',
        treatmentResult: 'resolved'
      });
      const status = getClosedLoopStatus(inspection, [], []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.INCOMPLETE);
      expect(status.issues.some(i => i.includes('待同步'))).toBe(true);
    });

    it('followup task done but review pending returns PENDING', () => {
      const inspection = mockInspection({
        syncStatus: 'synced',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-30'
      });
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_INSPECTION, done: true },
        { id: 't2', relatedInspectionId: 'insp-1', taskType: TASK_TYPE_REVIEW, done: false }
      ];
      const status = getClosedLoopStatus(inspection, tasks, []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.PENDING);
    });

    it('resolved treatment with no tasks needed returns COMPLETE', () => {
      const inspection = mockInspection({
        syncStatus: 'synced',
        treatmentResult: 'resolved'
      });
      const status = getClosedLoopStatus(inspection, [], []);
      expect(status.status).toBe(CLOSED_LOOP_STATUS.COMPLETE);
      expect(status.issues).toHaveLength(0);
    });
  });

  describe('syncTaskCompletionToInspection edge', () => {
    it('inspection not found returns unchanged', () => {
      const task = {
        id: 't1',
        relatedInspectionId: 'insp-999',
        taskType: TASK_TYPE_REVIEW,
        done: true
      };
      const inspections = [mockInspection({ id: 'insp-1' })];
      const beds = [mockBed()];
      const result = syncTaskCompletionToInspection(task, inspections, beds, [task]);
      expect(result.updated).toBe(false);
      expect(result.inspections[0].id).toBe('insp-1');
    });

    it('task without relatedInspectionId returns unchanged', () => {
      const task = { id: 't1', taskType: TASK_TYPE_REVIEW, done: true };
      const inspections = [mockInspection()];
      const beds = [mockBed()];
      const result = syncTaskCompletionToInspection(task, inspections, beds, []);
      expect(result.updated).toBe(false);
    });

    it('only followup task done but review still needed keeps bed warning', () => {
      const inspection = mockInspection({
        id: 'insp-1',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-20',
        bedName: 'A01番茄畦'
      });
      const followupTask = {
        id: 't-follow',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_INSPECTION,
        done: true
      };
      const reviewTask = {
        id: 't-review',
        relatedInspectionId: 'insp-1',
        taskType: TASK_TYPE_REVIEW,
        done: false
      };
      const beds = [mockBed({ name: 'A01番茄畦', warning: '虫害待处理' })];
      const result = syncTaskCompletionToInspection(
        followupTask,
        [inspection],
        beds,
        [followupTask, reviewTask]
      );
      expect(result.beds[0].warning).toBe('虫害待处理');
    });
  });

  describe('findBrokenLinks edge', () => {
    it('transaction with unknown relatedType is skipped', () => {
      const transactions = [
        { id: 'tx1', relatedType: 'unknown_type', relatedId: 'some-id' }
      ];
      const issues = findBrokenLinks([], [], transactions);
      expect(issues).toHaveLength(0);
    });

    it('multiple issues detected simultaneously', () => {
      const inspections = [
        mockInspection({ id: 'insp-1', treatmentResult: 'needs_followup', followupDate: '2025-06-20' })
      ];
      const tasks = [
        { id: 't1', relatedInspectionId: 'insp-not-exist', title: '孤立任务' }
      ];
      const transactions = [
        { id: 'tx1', relatedType: 'task', relatedId: 'task-not-exist', materialName: '肥料', type: 'outbound', quantity: 1, date: '2025-06-10' }
      ];
      const issues = findBrokenLinks(inspections, tasks, transactions);
      expect(issues).toHaveLength(4);
      expect(issues.some(i => i.type === 'broken_link_task')).toBe(true);
      expect(issues.some(i => i.type === 'broken_link_inspection')).toBe(true);
      expect(issues.some(i => i.type === 'missing_review_task')).toBe(true);
      expect(issues.some(i => i.type === 'orphan_transaction')).toBe(true);
    });
  });
});
