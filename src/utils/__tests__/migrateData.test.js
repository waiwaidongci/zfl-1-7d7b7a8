import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDataVersion,
  setDataVersion,
  migrateInspections,
  migrateTasks,
  migrateBeds,
  migrateTransactions,
  migrateHarvests,
  migrateContacts,
  runAllMigrations,
  normalizeWeightFormat
} from '../migrateData';
import {
  createV0State,
  createV1State,
  createV2State,
  createV3State,
  buildLocalStorageMock,
  FIXTURE_CONSTANTS
} from '../../test/fixtures/dataFixtures';

const {
  INSP_ID_001, INSP_ID_002,
  TASK_ID_001, TASK_ID_003,
  HARVEST_ID_001, HARVEST_ID_002,
  TX_ID_001, TX_ID_002, TX_ID_003, TX_ID_004,
  CONTACT_ID_001, CONTACT_ID_002,
  BED_ID_A01
} = FIXTURE_CONSTANTS;

describe('migrateData.js - localStorage 版本迁移（稳定 fixtures）', () => {
  let localStorageMock;
  let originalLocalStorage;

  beforeEach(() => {
    localStorageMock = {
      _data: {},
      setItem: vi.fn((key, value) => {
        localStorageMock._data[key] = value;
      }),
      getItem: vi.fn((key) => localStorageMock._data[key] || null),
      removeItem: vi.fn((key) => {
        delete localStorageMock._data[key];
      }),
      clear: vi.fn(() => {
        localStorageMock._data = {};
      })
    };
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true
    });
    vi.useRealTimers();
  });

  describe('getDataVersion / setDataVersion', () => {
    it('默认版本为 0', () => {
      expect(getDataVersion()).toBe(0);
    });

    it('正确读写版本号', () => {
      setDataVersion(2);
      expect(getDataVersion()).toBe(2);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('zfl-1-data-version', '2');
    });

    it('读写异常时安全降级', () => {
      localStorageMock.getItem = vi.fn(() => {
        throw new Error('读取失败');
      });
      expect(getDataVersion()).toBe(0);

      localStorageMock.setItem = vi.fn(() => {
        throw new Error('写入失败');
      });
      expect(() => setDataVersion(3)).not.toThrow();
    });
  });

  describe('migrateInspections - 巡检记录迁移', () => {
    it('V0 记录补充缺失字段：syncStatus/retryCount/followupTaskId', () => {
      const v0Inspections = createV0State().inspections;
      const migrated = migrateInspections(v0Inspections);

      expect(migrated).toHaveLength(2);
      migrated.forEach(i => {
        expect(i.syncStatus).toBe('synced');
        expect(i.retryCount).toBe(0);
        expect(i.followupTaskId).toBeNull();
        expect(i.reviewCompletedAt).toBeNull();
        expect(i.reviewCompletedBy).toBeNull();
        expect(i.createdAt).toBeDefined();
      });

      const insp1 = migrated.find(i => i.id === INSP_ID_001);
      expect(insp1.createdAt).toMatch(/^2025-06-13T/);
    });

    it('已有字段不会被覆盖', () => {
      const existing = [{
        id: INSP_ID_001,
        syncStatus: 'error',
        retryCount: 3,
        followupTaskId: 'task-abc',
        reviewCompletedAt: '2025-06-14T10:00:00.000Z',
        reviewCompletedBy: '管理员',
        createdAt: '2025-06-13T10:00:00.000Z'
      }];
      const migrated = migrateInspections(existing);
      expect(migrated[0].syncStatus).toBe('error');
      expect(migrated[0].retryCount).toBe(3);
      expect(migrated[0].followupTaskId).toBe('task-abc');
    });

    it('空数组安全返回', () => {
      expect(migrateInspections([])).toEqual([]);
    });
  });

  describe('migrateTasks - 任务记录迁移', () => {
    it('V0 任务补充 taskType/relatedInspectionId/completedAt/createdAt', () => {
      const v0Tasks = createV0State().tasks;
      const migrated = migrateTasks(v0Tasks);

      expect(migrated).toHaveLength(2);
      migrated.forEach(t => {
        expect(t.taskType).toBeDefined();
        expect(t.relatedInspectionId).toBeNull();
        expect(t.createdAt).toBeDefined();
      });

      const t1 = migrated.find(t => t.id === TASK_ID_001);
      expect(t1.taskType).toBe('general');
      expect(t1.relatedInspectionId).toBeNull();
      expect(t1.completedAt).toBeUndefined();
    });

    it('标题含"复查"自动识别为复查任务', () => {
      const tasks = [{
        id: TASK_ID_001,
        title: 'A01 - 番茄复查',
        done: false
      }];
      const migrated = migrateTasks(tasks);
      expect(migrated[0].taskType).toBe('review_plan');
    });

    it('有 relatedInspectionId 自动识别为巡检跟进任务', () => {
      const tasks = [{
        id: TASK_ID_003,
        relatedInspectionId: INSP_ID_001,
        done: false
      }];
      const migrated = migrateTasks(tasks);
      expect(migrated[0].taskType).toBe('inspection_followup');
    });

    it('已完成任务补充 completedAt', () => {
      const tasks = [{
        id: TASK_ID_001,
        title: '测试任务',
        done: true
      }];
      const migrated = migrateTasks(tasks);
      expect(migrated[0].completedAt).toBeDefined();
    });

    it('已有字段不覆盖', () => {
      const tasks = [{
        id: TASK_ID_001,
        taskType: 'inspection_followup',
        relatedInspectionId: INSP_ID_001,
        createdAt: '2025-06-01T00:00:00.000Z'
      }];
      const migrated = migrateTasks(tasks);
      expect(migrated[0].taskType).toBe('inspection_followup');
      expect(migrated[0].relatedInspectionId).toBe(INSP_ID_001);
      expect(migrated[0].createdAt).toBe('2025-06-01T00:00:00.000Z');
    });
  });

  describe('migrateBeds - 菜畦记录迁移', () => {
    it('补充 warning 字段为空字符串', () => {
      const v0Beds = createV0State().beds;
      const migrated = migrateBeds(v0Beds);
      migrated.forEach(b => {
        expect(b.warning).toBe('');
      });
    });

    it('已有 warning 字段不覆盖', () => {
      const beds = [{ id: BED_ID_A01, name: 'A01', warning: '虫害待处理' }];
      const migrated = migrateBeds(beds);
      expect(migrated[0].warning).toBe('虫害待处理');
    });

    it('warning 为 null 时设为空字符串', () => {
      const beds = [{ id: BED_ID_A01, name: 'A01', warning: null }];
      const migrated = migrateBeds(beds);
      expect(migrated[0].warning).toBe('');
    });
  });

  describe('migrateTransactions - 库存流水迁移', () => {
    it('V0 流水补充关联字段：relatedType/relatedId/relatedName/bedName/crop/materialDeleted', () => {
      const v0Tx = createV0State().transactions;
      const migrated = migrateTransactions(v0Tx);

      expect(migrated).toHaveLength(2);
      migrated.forEach(t => {
        expect(t.relatedType).toBe('');
        expect(t.relatedId).toBe('');
        expect(t.relatedName).toBe('');
        expect(t.bedName).toBe('');
        expect(t.crop).toBe('');
        expect(t.materialDeleted).toBe(false);
      });
    });

    it('已有字段不覆盖', () => {
      const tx = [{
        id: TX_ID_001,
        relatedType: 'task',
        relatedId: TASK_ID_001,
        relatedName: '测试任务',
        bedName: 'A01',
        crop: '番茄',
        materialDeleted: true
      }];
      const migrated = migrateTransactions(tx);
      expect(migrated[0].relatedType).toBe('task');
      expect(migrated[0].relatedId).toBe(TASK_ID_001);
      expect(migrated[0].materialDeleted).toBe(true);
    });

    it('materialDeleted 为 undefined 时设为 false', () => {
      const tx = [{ id: TX_ID_001 }];
      const migrated = migrateTransactions(tx);
      expect(migrated[0].materialDeleted).toBe(false);
    });
  });

  describe('migrateHarvests - 采收记录迁移', () => {
    it('补充 distribution/archived 字段并标准化重量格式', () => {
      const v0Harvests = createV0State().harvests;
      const migrated = migrateHarvests(v0Harvests);

      migrated.forEach(h => {
        expect(h.distribution).toBeNull();
        expect(h.archived).toBe(false);
      });
    });

    it('标准化纯数字克重格式：1500 -> 1.5kg', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        weight: '1500',
        distribution: null
      }];
      const migrated = migrateHarvests(harvests);
      expect(migrated[0].weight).toBe('1.5kg');
    });

    it('分配字段标准化：无效格式清除，有效格式保留', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        weight: '2.5kg',
        distribution: {
          selfPickup: '1.5kg',
          communityShare: '800g',
          loss: 'invalid_format',
          extraField: 'should_be_removed'
        }
      }];
      const migrated = migrateHarvests(harvests);
      expect(migrated[0].distribution.selfPickup).toBe('1.5kg');
      expect(migrated[0].distribution.communityShare).toBe('800g');
      expect(migrated[0].distribution.loss).toBeUndefined();
      expect(migrated[0].distribution.extraField).toBeUndefined();
    });

    it('已确认取菜但未登记自取量时自动补齐', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        weight: '1.5kg',
        distribution: {
          selfPickup: '1kg',
          selfPickupConfirmedAt: '2025-06-13T10:00:00.000Z'
        }
      }];
      const migrated = migrateHarvests(harvests);
      expect(migrated[0].distribution.selfPickupTaken).toBe('1kg');
    });

    it('补充分配历史记录数组', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        weight: '1kg',
        distribution: {
          selfPickup: '500g',
          communityShare: '500g'
        }
      }];
      const migrated = migrateHarvests(harvests);
      expect(migrated[0].distribution.history).toEqual([]);
    });

    it('已归档记录不改变 archived 状态', () => {
      const harvests = [{
        id: HARVEST_ID_001,
        weight: '1kg',
        archived: true,
        archivedAt: '2025-06-14T00:00:00.000Z',
        distribution: null
      }];
      const migrated = migrateHarvests(harvests);
      expect(migrated[0].archived).toBe(true);
      expect(migrated[0].archivedAt).toBe('2025-06-14T00:00:00.000Z');
    });
  });

  describe('migrateContacts - 联系人记录迁移', () => {
    it('V0 记录补充 pickupStatus/relatedHarvestId/expectedPickupDate', () => {
      const v0Contacts = createV0State().contacts;
      const migrated = migrateContacts(v0Contacts);

      const c1 = migrated.find(c => c.id === CONTACT_ID_001);
      expect(c1.pickupStatus).toBe('pending');
      expect(c1.relatedHarvestId).toBeNull();
      expect(c1.expectedPickupDate).toBeNull();
    });

    it('非取菜通知类型不设置 pickupStatus', () => {
      const contacts = [{
        id: CONTACT_ID_002,
        type: '微信',
        content: '沟通认养事宜'
      }];
      const migrated = migrateContacts(contacts);
      expect(migrated[0].pickupStatus).toBeUndefined();
    });

    it('已有字段不覆盖', () => {
      const contacts = [{
        id: CONTACT_ID_001,
        type: '取菜通知',
        pickupStatus: 'confirmed',
        relatedHarvestId: HARVEST_ID_001,
        expectedPickupDate: '2025-06-14'
      }];
      const migrated = migrateContacts(contacts);
      expect(migrated[0].pickupStatus).toBe('confirmed');
      expect(migrated[0].relatedHarvestId).toBe(HARVEST_ID_001);
      expect(migrated[0].expectedPickupDate).toBe('2025-06-14');
    });
  });

  describe('normalizeWeightFormat - 重量格式标准化', () => {
    it('空值原样返回', () => {
      expect(normalizeWeightFormat('')).toBe('');
      expect(normalizeWeightFormat(null)).toBeNull();
      expect(normalizeWeightFormat(undefined)).toBeUndefined();
    });

    it('非字符串原样返回', () => {
      expect(normalizeWeightFormat(123)).toBe(123);
    });

    it('纯数字可解析为克重时标准化为kg/g', () => {
      expect(normalizeWeightFormat('1500')).toBe('1.5kg');
      expect(normalizeWeightFormat('500')).toBe('500g');
    });

    it('合法格式保留不变', () => {
      expect(normalizeWeightFormat('1.5kg')).toBe('1.5kg');
      expect(normalizeWeightFormat('500g')).toBe('500g');
    });
  });

  describe('runAllMigrations - 全量版本升级链路', () => {
    it('V0 -> V3 全链路迁移：所有字段正确补充', () => {
      const store = buildLocalStorageMock(0, createV0State());
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const v0State = createV0State();
      const result = runAllMigrations(v0State);

      expect(getDataVersion()).toBe(3);

      expect(result.inspections).toHaveLength(2);
      result.inspections.forEach(i => {
        expect(i.syncStatus).toBeDefined();
        expect(i.retryCount).toBeDefined();
        expect(i.createdAt).toBeDefined();
      });

      expect(result.tasks).toHaveLength(2);
      result.tasks.forEach(t => {
        expect(t.taskType).toBeDefined();
        expect(t.createdAt).toBeDefined();
      });

      expect(result.beds).toHaveLength(3);
      result.beds.forEach(b => {
        expect(b.warning).toBeDefined();
      });

      expect(result.transactions).toHaveLength(2);
      result.transactions.forEach(t => {
        expect(t.relatedType).toBeDefined();
        expect(t.materialDeleted).toBe(false);
      });

      expect(result.harvests).toHaveLength(2);
      result.harvests.forEach(h => {
        expect(h.archived).toBe(false);
        expect(h.distribution).toBeNull();
      });

      expect(result.contacts).toHaveLength(1);
      const contact = result.contacts[0];
      expect(contact.pickupStatus).toBe('pending');
      expect(contact.relatedHarvestId).toBeNull();
      expect(contact.expectedPickupDate).toBeNull();
    });

    it('V1 -> V3 迁移：跳过 V1 已处理的检查，执行 V2/V3 新增逻辑', () => {
      const v1State = createV1State();
      const store = buildLocalStorageMock(1, v1State);
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const result = runAllMigrations(v1State);
      expect(getDataVersion()).toBe(3);
      expect(result.harvests).toHaveLength(2);
      expect(result.contacts[0].pickupStatus).toBe('pending');
    });

    it('V2 -> V3 迁移：仅执行 V3 新增的采收和联系人迁移', () => {
      const v2State = createV2State();
      v2State.harvests = v2State.harvests.map(h => ({
        ...h,
        distribution: h.id === HARVEST_ID_001 ? {
          selfPickup: '1.5kg',
          communityShare: '800g',
          loss: '200g',
          distributionUpdatedAt: '2025-06-12'
        } : null
      }));
      v2State.contacts = v2State.contacts.map(c => ({
        ...c,
        pickupStatus: c.type === '取菜通知' ? 'pending' : undefined,
        relatedHarvestId: c.id === CONTACT_ID_001 ? HARVEST_ID_001 : null,
        expectedPickupDate: c.id === CONTACT_ID_001 ? '2025-06-14' : null
      }));

      const store = buildLocalStorageMock(2, v2State);
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const result = runAllMigrations(v2State);
      expect(getDataVersion()).toBe(3);

      const h1 = result.harvests.find(h => h.id === HARVEST_ID_001);
      expect(h1.distribution).toBeDefined();
      expect(h1.distribution).not.toBeNull();
      expect(h1.distribution.history).toEqual([]);

      const c1 = result.contacts.find(c => c.id === CONTACT_ID_001);
      expect(c1.pickupStatus).toBe('pending');
      expect(c1.relatedHarvestId).toBe(HARVEST_ID_001);
      expect(c1.expectedPickupDate).toBe('2025-06-14');
    });

    it('已是最新版本 V3：不执行任何迁移', () => {
      const v3State = createV3State();
      const store = buildLocalStorageMock(3, v3State);
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const originalStr = JSON.stringify(v3State);
      const result = runAllMigrations(v3State);

      expect(result.beds).toBe(v3State.beds);
      expect(getDataVersion()).toBe(3);
    });

    it('迁移后库存流水关联完整：V3 fixtures 流水均有正确关联', () => {
      const v2State = createV2State();
      const store = buildLocalStorageMock(2, v2State);
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const result = runAllMigrations(v2State);
      const tx = result.transactions;

      expect(tx.find(t => t.id === TX_ID_001).relatedType).toBe('task');
      expect(tx.find(t => t.id === TX_ID_002).relatedType).toBe('inspection');
      tx.forEach(t => {
        expect(t.materialDeleted).toBe(false);
      });
    });

    it('迁移幂等性：连续执行两次结果一致', () => {
      const v0State = createV0State();
      const store = buildLocalStorageMock(0, v0State);
      Object.keys(store).forEach(k => {
        localStorageMock._data[k] = store[k];
      });

      const first = runAllMigrations(v0State);
      const firstVer = getDataVersion();
      const second = runAllMigrations(first);
      const secondVer = getDataVersion();

      expect(firstVer).toBe(3);
      expect(secondVer).toBe(3);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });
  });
});
