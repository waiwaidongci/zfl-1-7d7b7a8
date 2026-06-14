import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ISSUE_SEVERITY,
  ISSUE_CATEGORIES,
  checkInventoryDeletedReferences,
  checkOverDistribution,
  checkInspectionSyncStatus,
  checkDuplicateTasksFromInspection,
  checkTaskDoneWithActiveInspection,
  checkPickupNoticeInconsistency,
  checkInspectionTaskCompletedWithoutStatusUpdate,
  checkOverdueReviewTasks,
  checkIdleBedWithActivePlant,
  runAllConsistencyChecks
} from '../consistencyCheck';
import {
  createV3State,
  FIXTURE_CONSTANTS
} from '../../test/fixtures/dataFixtures';

const {
  TASK_ID_001, TASK_ID_002, TASK_ID_003,
  HARVEST_ID_001, HARVEST_ID_002,
  INSP_ID_001, INSP_ID_002,
  TX_ID_001, TX_ID_002, TX_ID_003, TX_ID_004,
  PLANT_ID_001,
  MATERIAL_ID_001, MATERIAL_ID_002, MATERIAL_ID_003,
  BED_ID_A01, BED_ID_A02, BED_ID_B01
} = FIXTURE_CONSTANTS;

describe('consistencyCheck.js - 库存流水关联与数据一致性检查', () => {
  let baseState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
    baseState = createV3State();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkInventoryDeletedReferences - 库存流水关联孤立数据检测', () => {
    it('V3 fixtures 数据完整：无孤立关联，返回空数组', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const issues = checkInventoryDeletedReferences(
        transactions, tasks, harvests, plants, inspections, beds, materials
      );
      expect(issues).toEqual([]);
    });

    it('流水关联已删除任务：正确识别并返回 INVENTORY_REFERENCE 级别警告', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const transactionsWithOrphan = [
        ...transactions,
        {
          id: TX_ID_003,
          materialId: MATERIAL_ID_001,
          materialName: '复合肥',
          type: 'outbound',
          quantity: 500,
          unit: 'g',
          date: '2025-06-14',
          relatedType: 'task',
          relatedId: 'task-deleted-999999',
          relatedName: '已删除任务'
        }
      ];
      const issues = checkInventoryDeletedReferences(
        transactionsWithOrphan, tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.INVENTORY_REFERENCE);
      expect(issues[0].severity).toBe(ISSUE_SEVERITY.WARNING);
      expect(issues[0].affectedItems).toHaveLength(2);
      expect(issues[0].affectedItems[1].type).toBe('task');
      expect(issues[0].fixType).toBe('clear_transaction_relation');
    });

    it('流水关联已删除采收：正确识别', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = {
        id: TX_ID_004,
        materialId: MATERIAL_ID_002,
        materialName: '番茄',
        type: 'outbound',
        quantity: 1500,
        unit: 'g',
        date: '2025-06-13',
        relatedType: 'harvest',
        relatedId: 'harvest-deleted-123',
        relatedName: '已删除采摘记录'
      };
      const issues = checkInventoryDeletedReferences(
        [...transactions, badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].fixData.deletedRefType).toBe('harvest');
    });

    it('流水关联已删除种植计划：正确识别', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = {
        id: TX_ID_003,
        materialId: MATERIAL_ID_003,
        materialName: '生菜种子',
        type: 'outbound',
        quantity: 10,
        unit: 'g',
        date: '2025-06-10',
        relatedType: 'plant',
        relatedId: 'plant-deleted-456',
        relatedName: '已删除种植计划'
      };
      const issues = checkInventoryDeletedReferences(
        [...transactions, badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].fixData.deletedRefType).toBe('plant');
    });

    it('流水关联已删除巡检：正确识别', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = {
        id: TX_ID_003,
        materialId: MATERIAL_ID_001,
        materialName: '杀虫剂',
        type: 'outbound',
        quantity: 200,
        unit: 'ml',
        date: '2025-06-12',
        relatedType: 'inspection',
        relatedId: 'insp-deleted-789',
        relatedName: '已删除巡检'
      };
      const issues = checkInventoryDeletedReferences(
        [...transactions, badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].fixData.deletedRefType).toBe('inspection');
    });

    it('流水指向已删除菜畦：正确识别', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = {
        id: TX_ID_003,
        materialId: MATERIAL_ID_001,
        materialName: '有机肥',
        type: 'outbound',
        quantity: 1000,
        unit: 'g',
        date: '2025-06-11',
        relatedType: 'bed',
        relatedId: 'bed-deleted-001',
        relatedName: '已删除菜畦'
      };
      const issues = checkInventoryDeletedReferences(
        [...transactions, badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].fixData.deletedRefType).toBe('bed');
    });

    it('流水使用已删除物资：正确识别，fixType 为 handle_missing_material', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = {
        id: TX_ID_003,
        materialId: 'mat-deleted-001',
        materialName: '神秘物资',
        type: 'inbound',
        quantity: 5000,
        unit: 'g',
        date: '2025-06-09'
      };
      const issues = checkInventoryDeletedReferences(
        [...transactions, badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].affectedItems[1].type).toBe('material');
      expect(issues[0].fixType).toBe('handle_missing_material');
    });

    it('同时存在多个孤立流水：全部正确识别', () => {
      const { transactions, tasks, harvests, plants, inspections, beds, materials } = baseState;
      const badTx = [
        {
          id: TX_ID_003,
          materialId: 'mat-deleted-001',
          materialName: '未知物资',
          type: 'inbound',
          quantity: 100,
          unit: 'g',
          date: '2025-06-09'
        },
        {
          id: TX_ID_004,
          materialId: MATERIAL_ID_001,
          materialName: '复合肥',
          type: 'outbound',
          quantity: 500,
          unit: 'g',
          date: '2025-06-14',
          relatedType: 'task',
          relatedId: 'task-deleted-001',
          relatedName: '已删除任务'
        }
      ];
      const issues = checkInventoryDeletedReferences(
        [...transactions, ...badTx], tasks, harvests, plants, inspections, beds, materials
      );

      expect(issues).toHaveLength(2);
    });
  });

  describe('checkOverDistribution - 采摘分发超量检测', () => {
    it('分配量等于采摘量：正常无警告', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        crop: '番茄',
        bed: 'A01',
        weight: '2.5kg',
        distribution: {
          selfPickup: '1.5kg',
          communityShare: '1kg',
          loss: '0g'
        }
      }];
      expect(checkOverDistribution(harvests)).toEqual([]);
    });

    it('分配量超出采摘量：CRITICAL 级别错误', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        crop: '番茄',
        bed: 'A01',
        weight: '2kg',
        distribution: {
          selfPickup: '1.5kg',
          communityShare: '1kg'
        }
      }];
      const issues = checkOverDistribution(harvests);
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.HARVEST_DISTRIBUTION);
      expect(issues[0].severity).toBe(ISSUE_SEVERITY.CRITICAL);
    });

    it('无分配信息的采收：跳过不检查', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        crop: '番茄',
        bed: 'A01',
        weight: '2kg',
        distribution: null
      }];
      expect(checkOverDistribution(harvests)).toEqual([]);
    });
  });

  describe('checkDuplicateTasksFromInspection - 巡检任务重复检测', () => {
    it('同一巡检生成多条同类跟进任务：识别重复', () => {
      const inspections = [{
        id: INSP_ID_001,
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        followupDate: null
      }];
      const tasks = [
        { id: TASK_ID_001, relatedInspectionId: INSP_ID_001, taskType: 'inspection_followup', title: 'A01 虫害处理1' },
        { id: TASK_ID_002, relatedInspectionId: INSP_ID_001, taskType: 'inspection_followup', title: 'A01 虫害处理2' }
      ];
      const issues = checkDuplicateTasksFromInspection(tasks, inspections);
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.TASK_DUPLICATE);
    });

    it('同一条巡检有多条复查任务：识别重复', () => {
      const inspections = [{
        id: INSP_ID_001,
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-15'
      }];
      const tasks = [
        { id: TASK_ID_001, relatedInspectionId: INSP_ID_001, taskType: 'review_plan', title: '复查任务1' },
        { id: TASK_ID_003, relatedInspectionId: INSP_ID_001, taskType: 'review_plan', title: '复查任务2' }
      ];
      const issues = checkDuplicateTasksFromInspection(tasks, inspections);
      expect(issues).toHaveLength(1);
      expect(issues[0].fixData.taskType).toBe('review_plan');
    });
  });

  describe('checkInspectionSyncStatus - 巡检同步状态检测', () => {
    it('已解决且同步标记 synced：无同步异常', () => {
      const bedA01 = { id: BED_ID_A01, name: 'A01番茄畦', warning: '' };
      const inspections = [{
        id: INSP_ID_002,
        bedName: 'A01番茄畦',
        abnormalType: 'water_shortage',
        treatmentResult: 'resolved',
        syncStatus: 'synced',
        retryCount: 0,
        followupDate: null
      }];
      const issues = checkInspectionSyncStatus(inspections, [bedA01], []);
      expect(issues).toEqual([]);
    });

    it('syncStatus 为 error：CRITICAL 级告警', () => {
      const inspections = [{
        ...baseState.inspections[0],
        syncStatus: 'error',
        retryCount: 2
      }];
      const issues = checkInspectionSyncStatus(inspections, baseState.beds, baseState.tasks);
      expect(issues[0].severity).toBe(ISSUE_SEVERITY.CRITICAL);
    });
  });

  describe('checkTaskDoneWithActiveInspection - 任务完成但巡检仍待关注', () => {
    it('任务已完成但巡检未清警告：返回 INFO 级别提醒', () => {
      const inspections = [{
        id: INSP_ID_001,
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup'
      }];
      const tasks = [{
        id: TASK_ID_001,
        relatedInspectionId: INSP_ID_001,
        taskType: 'inspection_followup',
        title: '处理任务',
        done: true
      }];
      const issues = checkTaskDoneWithActiveInspection(tasks, inspections);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe(ISSUE_SEVERITY.INFO);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.INSPECTION_SYNC);
    });
  });

  describe('checkOverdueReviewTasks - 复查任务逾期检测', () => {
    it('复查任务计划日期早于今日：识别逾期警告', () => {
      const inspections = [{
        id: INSP_ID_001,
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-10'
      }];
      const tasks = [{
        id: TASK_ID_003,
        relatedInspectionId: INSP_ID_001,
        taskType: 'review_plan',
        title: '复查任务',
        done: false
      }];
      const issues = checkOverdueReviewTasks(inspections, tasks);
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.CLOSED_LOOP);
      expect(issues[0].severity).toBe(ISSUE_SEVERITY.WARNING);
    });

    it('复查任务已完成：不提示逾期', () => {
      const inspections = [{
        id: INSP_ID_001,
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        followupDate: '2025-06-10'
      }];
      const tasks = [{
        id: TASK_ID_003,
        relatedInspectionId: INSP_ID_001,
        taskType: 'review_plan',
        title: '复查任务',
        done: true
      }];
      expect(checkOverdueReviewTasks(inspections, tasks)).toEqual([]);
    });
  });

  describe('checkPickupNoticeInconsistency - 自取状态一致性检测', () => {
    it('已登记自取但未发取菜通知：WARNING 提醒', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        crop: '番茄',
        bed: 'A01',
        weight: '1.5kg',
        distribution: {
          selfPickup: '1kg',
          selfPickupRegisteredAt: '2025-06-13T10:00:00.000Z'
        }
      }];
      const contacts = [];
      const issues = checkPickupNoticeInconsistency(harvests, contacts);
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.PICKUP_STATUS);
    });
  });

  describe('checkIdleBedWithActivePlant - 空闲菜畦活跃种植计划', () => {
    it('菜畦状态空闲但有种植计划：WARNING', () => {
      const beds = [
        { id: BED_ID_A01, name: 'A01', status: '空闲' }
      ];
      const plants = [
        { id: PLANT_ID_001, bedId: BED_ID_A01, bedName: 'A01', crop: '番茄' }
      ];
      const issues = checkIdleBedWithActivePlant(beds, plants);
      expect(issues).toHaveLength(1);
      expect(issues[0].category).toBe(ISSUE_CATEGORIES.PLANT_PLAN);
    });
  });

  describe('runAllConsistencyChecks - 全量一致性检查汇总', () => {
    it('V3 fixtures 完整数据：无 CRITICAL 级别问题', () => {
      const issues = runAllConsistencyChecks(baseState);
      const criticals = issues.filter(i => i.severity === ISSUE_SEVERITY.CRITICAL);
      expect(criticals).toEqual([]);
    });

    it('注入孤立流水和超量分配：在汇总结果中都能找到', () => {
      const state = { ...baseState };
      state.transactions = [...state.transactions, {
        id: TX_ID_003,
        materialId: 'mat-deleted-001',
        materialName: '未知物资',
        type: 'inbound',
        quantity: 100,
        unit: 'g',
        date: '2025-06-09'
      }];
      state.harvests = [...state.harvests, {
        id: HARVEST_ID_002,
        crop: '生菜',
        bed: 'A02',
        weight: '500g',
        distribution: {
          selfPickup: '400g',
          communityShare: '400g'
        }
      }];

      const issues = runAllConsistencyChecks(state);
      const inventoryRef = issues.find(i => i.category === ISSUE_CATEGORIES.INVENTORY_REFERENCE);
      const overDist = issues.find(i => i.category === ISSUE_CATEGORIES.HARVEST_DISTRIBUTION);

      expect(inventoryRef).toBeDefined();
      expect(overDist).toBeDefined();
      expect(overDist.severity).toBe(ISSUE_SEVERITY.CRITICAL);
    });

    it('返回结果所有 issue 均具备核心结构字段', () => {
      const issues = runAllConsistencyChecks(baseState);
      expect(issues.length).toBeGreaterThan(0);
      issues.forEach(issue => {
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('category');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('affectedItems');
        expect(issue).toHaveProperty('fixType');
        expect(Array.isArray(issue.affectedItems)).toBe(true);
      });
    });
  });
});
