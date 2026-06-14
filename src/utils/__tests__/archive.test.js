import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildArchive,
  validateArchiveData,
  markHarvestAsArchived,
  isHarvestArchived,
  canModifyArchivedHarvest,
  getArchivedHarvests,
  getActiveHarvests,
  buildFulfillmentArchiveSummary,
  computeDiff,
  applyImport,
  summarizeImport,
  parseArchiveFile,
  persistToLocalStorage,
  downloadArchive,
  STORAGE_KEYS,
  ENTITY_LABELS
} from '../archive';

describe('archive.js - 档案构建与归档', () => {
  const mockHarvest = (overrides = {}) => ({
    id: 'h-1',
    crop: '番茄',
    bed: 'A01番茄畦',
    date: '2025-06-10',
    weight: '1kg',
    distribution: {
      selfPickup: '500g',
      communityShare: '300g',
      volunteerSample: '100g',
      loss: '100g',
      distributionUpdatedAt: '2025-06-10'
    },
    ...overrides
  });

  const mockBed = (overrides = {}) => ({
    id: 'b-1',
    name: 'A01番茄畦',
    crop: '番茄',
    adopter: '李阿姨',
    ...overrides
  });

  describe('buildArchive', () => {
    it('构建包含所有实体的档案', () => {
      const state = {
        beds: [mockBed()],
        harvests: [mockHarvest()],
        tasks: [{ id: 't-1', title: '测试任务' }],
        schedules: [{ id: 's-1', date: '2025-06-15' }],
        contacts: [{ id: 'c-1', type: '取菜通知' }],
        plants: [{ id: 'p-1', crop: '生菜' }],
        materials: [{ id: 'm-1', name: '有机肥料' }],
        transactions: [{ id: 'tx-1', type: 'outbound' }],
        inspections: [{ id: 'i-1', bedName: 'A01' }],
        bedPlacement: { '1': { x: 0, y: 0 } }
      };

      const archive = buildArchive(state);

      expect(archive.schema).toBe('zfl-garden-archive');
      expect(archive.version).toBe('1.0.0');
      expect(archive.exportedAt).toBeDefined();
      expect(archive.stats.beds).toBe(1);
      expect(archive.stats.harvests).toBe(1);
      expect(archive.stats.bedPlacement).toBe(1);
      expect(archive.data.beds).toHaveLength(1);
      expect(archive.data.harvests).toHaveLength(1);
      expect(archive.data.bedPlacement).toEqual({ '1': { x: 0, y: 0 } });
    });

    it('空状态也能生成合法档案', () => {
      const archive = buildArchive({});
      expect(archive.schema).toBe('zfl-garden-archive');
      expect(archive.stats.beds).toBe(0);
      expect(archive.data.beds).toEqual([]);
      expect(archive.data.bedPlacement).toEqual({});
    });

    it('包含履约摘要', () => {
      const state = {
        harvests: [mockHarvest()],
        contacts: []
      };
      const archive = buildArchive(state);
      expect(archive.fulfillmentSummary).toBeDefined();
      expect(archive.fulfillmentSummary.summary).toBeDefined();
      expect(archive.fulfillmentSummary.harvestDetails).toHaveLength(1);
    });
  });

  describe('markHarvestAsArchived', () => {
    it('标记采收为已归档', () => {
      const harvest = mockHarvest();
      const archived = markHarvestAsArchived(harvest);

      expect(archived.archived).toBe(true);
      expect(archived.archivedAt).toBeDefined();
      expect(archived.fulfillmentStatus).toBe('archived');
    });

    it('保留原始数据不变', () => {
      const harvest = mockHarvest();
      const archived = markHarvestAsArchived(harvest);

      expect(archived.id).toBe('h-1');
      expect(archived.weight).toBe('1kg');
      expect(archived.distribution.selfPickup).toBe('500g');
    });

    it('添加归档历史记录', () => {
      const harvest = mockHarvest();
      const archived = markHarvestAsArchived(harvest);

      expect(archived.distribution.history).toBeDefined();
      const history = archived.distribution.history;
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].action).toBe('archived');
    });

    it('可以指定归档时间', () => {
      const harvest = mockHarvest();
      const customTime = '2025-06-15T12:00:00.000Z';
      const archived = markHarvestAsArchived(harvest, customTime);

      expect(archived.archivedAt).toBe(customTime);
    });
  });

  describe('isHarvestArchived', () => {
    it('已归档返回 true', () => {
      expect(isHarvestArchived({ archived: true })).toBe(true);
    });

    it('未归档返回 false', () => {
      expect(isHarvestArchived({ archived: false })).toBe(false);
      expect(isHarvestArchived({})).toBe(false);
      expect(isHarvestArchived(null)).toBe(false);
      expect(isHarvestArchived(undefined)).toBe(false);
    });
  });

  describe('canModifyArchivedHarvest', () => {
    it('未归档可以修改', () => {
      expect(canModifyArchivedHarvest({ archived: false })).toBe(true);
    });

    it('已归档不能修改', () => {
      expect(canModifyArchivedHarvest({ archived: true })).toBe(false);
    });
  });

  describe('getArchivedHarvests / getActiveHarvests', () => {
    it('正确筛选已归档和活跃采收', () => {
      const harvests = [
        { id: 'h1', archived: false },
        { id: 'h2', archived: true },
        { id: 'h3', archived: false }
      ];

      expect(getArchivedHarvests(harvests)).toHaveLength(1);
      expect(getActiveHarvests(harvests)).toHaveLength(2);
    });
  });

  describe('buildFulfillmentArchiveSummary', () => {
    it('生成包含详细信息的履约摘要', () => {
      const harvests = [mockHarvest()];
      const contacts = [];
      const summary = buildFulfillmentArchiveSummary(harvests, contacts);

      expect(summary.summary).toBeDefined();
      expect(summary.harvestDetails).toHaveLength(1);
      expect(summary.archivedAt).toBeDefined();

      const detail = summary.harvestDetails[0];
      expect(detail.id).toBe('h-1');
      expect(detail.totalGrams).toBe(1000);
      expect(detail.selfPickupTotalGrams).toBe(500);
      expect(detail.fulfillmentStatus).toBeDefined();
      expect(detail.noticeCount).toBe(0);
    });

    it('包含取菜通知信息', () => {
      const harvests = [mockHarvest({ id: 'h-1' })];
      const contacts = [
        { id: 'c1', relatedHarvestId: 'h-1', type: '取菜通知', date: '2025-06-11', time: '10:00' }
      ];
      const summary = buildFulfillmentArchiveSummary(harvests, contacts);

      expect(summary.harvestDetails[0].noticeCount).toBe(1);
      expect(summary.harvestDetails[0].notices).toHaveLength(1);
    });
  });
});

describe('archive.js - 档案校验', () => {
  const buildValidArchiveData = () => ({
    schema: 'zfl-garden-archive',
    version: '1.0.0',
    data: {
      beds: [
        { id: 'b1', name: 'A01', crop: '番茄' },
        { id: 'b2', name: 'A02', crop: '生菜' }
      ],
      harvests: [
        { id: 'h1', bed: 'A01', weight: '1kg', distribution: { selfPickup: '500g' } },
        { id: 'h2', bed: 'A02', weight: '500g' }
      ],
      tasks: [
        { id: 't1', title: '浇水', done: false }
      ],
      inspections: [
        { id: 'i1', bedName: 'A01', abnormalType: 'pest', treatmentResult: 'resolved' }
      ],
      contacts: [
        { id: 'c1', bedId: 'b1', relatedHarvestId: 'h1', type: '取菜通知' }
      ],
      plants: [
        { id: 'p1', bedId: 'b1', crop: '番茄' }
      ],
      materials: [
        { id: 'm1', name: '有机肥' }
      ],
      transactions: [
        { id: 'tx1', materialId: 'm1', type: 'outbound', quantity: 2, bedName: 'A01', relatedType: 'task', relatedId: 't1' }
      ],
      schedules: [],
      bedPlacement: {}
    }
  });

  describe('validateArchiveData - 基础结构校验', () => {
    it('合法档案数据无错误', () => {
      const archive = buildValidArchiveData();
      const { errors, warnings } = validateArchiveData(archive);
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
    });

    it('检测缺少 id 的条目', () => {
      const archive = buildValidArchiveData();
      archive.data.beds.push({ name: 'A03' });
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.message.includes('缺少id'))).toBe(true);
    });

    it('检测重复 id', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests.push({ id: 'h1', weight: '300g' });
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.message.includes('id重复'))).toBe(true);
    });

    it('检测无效条目（非对象）', () => {
      const archive = buildValidArchiveData();
      archive.data.beds.push(null);
      archive.data.beds.push('invalid');
      const { errors } = validateArchiveData(archive);
      expect(errors.filter(e => e.type === 'beds').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateArchiveData - 采收数据校验', () => {
    it('检测采收重量格式错误', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests[0].weight = 'abc';
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.field === 'weight' && e.type === 'harvests')).toBe(true);
    });

    it('检测采收指向不存在的菜畦', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests.push({ id: 'h3', bed: '不存在的畦', weight: '300g' });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.field === 'bed' && w.type === 'harvests')).toBe(true);
    });

    it('检测分配重量格式错误', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests[0].distribution.selfPickup = 'invalid';
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.field === 'distribution.selfPickup')).toBe(true);
    });

    it('检测分配总量超过采收总量', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests[0].distribution = {
        selfPickup: '800g',
        communityShare: '500g'
      };
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.message.includes('分配总重量超过采收总量'))).toBe(true);
    });
  });

  describe('validateArchiveData - 巡检数据校验', () => {
    it('检测巡检指向不存在的菜畦', () => {
      const archive = buildValidArchiveData();
      archive.data.inspections.push({
        id: 'i2',
        bedName: '不存在的畦',
        abnormalType: 'pest',
        treatmentResult: 'resolved'
      });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'inspections' && w.field === 'bedId/bedName')).toBe(true);
    });

    it('检测巡检跟进任务ID不存在', () => {
      const archive = buildValidArchiveData();
      archive.data.inspections[0].followupTaskId = 'not-exist';
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.field === 'followupTaskId')).toBe(true);
    });
  });

  describe('validateArchiveData - 关联引用校验', () => {
    it('检测种植计划指向不存在的菜畦', () => {
      const archive = buildValidArchiveData();
      archive.data.plants.push({ id: 'p2', bedId: 'not-exist' });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'plants')).toBe(true);
    });

    it('检测联系记录指向不存在的采收', () => {
      const archive = buildValidArchiveData();
      archive.data.contacts.push({
        id: 'c2',
        relatedHarvestId: 'not-exist',
        type: '取菜通知'
      });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'contacts' && w.field === 'relatedHarvestId')).toBe(true);
    });

    it('检测物资流水指向不存在的物资', () => {
      const archive = buildValidArchiveData();
      archive.data.transactions.push({
        id: 'tx2',
        materialId: 'not-exist',
        quantity: 1
      });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'transactions' && w.field === 'materialId')).toBe(true);
    });

    it('检测物资流水数量不合法', () => {
      const archive = buildValidArchiveData();
      archive.data.transactions.push({
        id: 'tx2',
        materialId: 'm1',
        quantity: -1
      });
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.field === 'quantity')).toBe(true);
    });

    it('检测物资流水关联实体不存在', () => {
      const archive = buildValidArchiveData();
      archive.data.transactions.push({
        id: 'tx2',
        materialId: 'm1',
        quantity: 1,
        relatedType: 'task',
        relatedId: 'not-exist'
      });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.field === 'relatedId')).toBe(true);
    });
  });
});

describe('archive.js - 差异计算与导入', () => {
  const buildLocalState = () => ({
    beds: [
      { id: 'b1', name: 'A01', crop: '番茄' },
      { id: 'b2', name: 'A02', crop: '生菜' }
    ],
    harvests: [
      { id: 'h1', bed: 'A01', weight: '1kg' }
    ],
    tasks: [
      { id: 't1', title: '浇水', done: false }
    ]
  });

  const buildImportData = () => ({
    beds: [
      { id: 'b1', name: 'A01', crop: '番茄' },
      { id: 'b3', name: 'A03', crop: '黄瓜' }
    ],
    harvests: [
      { id: 'h1', bed: 'A01', weight: '1.2kg' },
      { id: 'h2', bed: 'A03', weight: '500g' }
    ],
    tasks: [
      { id: 't1', title: '浇水', done: false }
    ]
  });

  describe('computeDiff', () => {
    it('识别新增条目', () => {
      const local = buildLocalState();
      const importData = buildImportData();
      const diff = computeDiff(local, importData);

      expect(diff.beds.added).toHaveLength(1);
      expect(diff.beds.added[0].id).toBe('b3');
      expect(diff.harvests.added).toHaveLength(1);
    });

    it('识别更新条目', () => {
      const local = buildLocalState();
      const importData = buildImportData();
      const diff = computeDiff(local, importData);

      expect(diff.harvests.updated).toHaveLength(1);
      expect(diff.harvests.updated[0].id).toBe('h1');
    });

    it('识别未变更条目', () => {
      const local = buildLocalState();
      const importData = buildImportData();
      const diff = computeDiff(local, importData);

      expect(diff.tasks.unchanged).toHaveLength(1);
    });

    it('识别本地独有条目', () => {
      const local = buildLocalState();
      const importData = buildImportData();
      const diff = computeDiff(local, importData);

      expect(diff.beds.localOnly).toHaveLength(1);
      expect(diff.beds.localOnly[0].id).toBe('b2');
    });

    it('识别高敏感字段冲突', () => {
      const local = {
        harvests: [
          { id: 'h1', weight: '1kg', archived: false }
        ]
      };
      const importData = {
        harvests: [
          { id: 'h1', weight: '1kg', archived: true }
        ]
      };
      const diff = computeDiff(local, importData);

      expect(diff.harvests.conflicts).toHaveLength(1);
      expect(diff.harvests.conflicts[0].fields.some(f => f.isHigh)).toBe(true);
    });

    it('bedPlacement 也能计算差异', () => {
      const local = {
        bedPlacement: { '1': { x: 0, y: 0 }, '2': { x: 1, y: 0 } }
      };
      const importData = {
        bedPlacement: { '1': { x: 0, y: 0 }, '3': { x: 2, y: 0 } }
      };
      const diff = computeDiff(local, importData);

      expect(diff.bedPlacement.placementUnchanged['1']).toBeDefined();
      expect(diff.bedPlacement.placementAdded['3']).toBeDefined();
      expect(diff.bedPlacement.placementLocalOnly['2']).toBeDefined();
    });
  });

  describe('applyImport', () => {
    it('应用导入合并数据', () => {
      const local = buildLocalState();
      const importData = buildImportData();
      const diff = computeDiff(local, importData);
      const { mergedState, summary } = applyImport(local, importData, diff, {});

      expect(mergedState.beds).toHaveLength(3);
      expect(mergedState.harvests).toHaveLength(2);
      expect(summary.added.beds).toBe(1);
      expect(summary.updated.harvests).toBe(1);
      expect(summary.localOnlyKept.beds).toBe(1);
    });

    it('冲突默认保留本地版本', () => {
      const local = {
        harvests: [{ id: 'h1', weight: '1kg', archived: false }]
      };
      const importData = {
        harvests: [{ id: 'h1', weight: '1kg', archived: true }]
      };
      const diff = computeDiff(local, importData);
      const { mergedState } = applyImport(local, importData, diff, {});

      expect(mergedState.harvests[0].archived).toBe(false);
    });

    it('可以指定冲突使用导入版本', () => {
      const local = {
        harvests: [{ id: 'h1', weight: '1kg', archived: false }]
      };
      const importData = {
        harvests: [{ id: 'h1', weight: '1kg', archived: true }]
      };
      const diff = computeDiff(local, importData);
      const resolution = {
        conflicts: {
          harvests: { h1: 'incoming' }
        }
      };
      const { mergedState, summary } = applyImport(local, importData, diff, resolution);

      expect(mergedState.harvests[0].archived).toBe(true);
      expect(summary.conflictsResolvedAsIncoming.harvests).toBe(1);
    });
  });

  describe('summarizeImport', () => {
    it('汇总导入统计', () => {
      const summary = {
        added: { beds: 1, harvests: 2 },
        updated: { beds: 0, harvests: 1 },
        conflictsResolvedAsIncoming: { beds: 0, harvests: 0 },
        conflictsResolvedAsCurrent: { beds: 0, harvests: 1 },
        unchanged: { beds: 2, harvests: 1 },
        localOnlyKept: { beds: 1, harvests: 0 },
        skippedErrors: [],
        skippedWarnings: []
      };
      const result = summarizeImport(summary);

      expect(result.totalAdded).toBe(3);
      expect(result.totalUpdated).toBe(1);
      expect(result.totalUnchanged).toBe(3);
      expect(result.byEntity).toHaveLength(Object.keys(ENTITY_LABELS).length);
    });
  });
});

describe('archive.js - 档案校验补充', () => {
  const buildValidArchiveData = () => ({
    schema: 'zfl-garden-archive',
    version: '1.0.0',
    data: {
      beds: [
        { id: 'b1', name: 'A01', crop: '番茄' },
        { id: 'b2', name: 'A02', crop: '生菜' }
      ],
      harvests: [
        { id: 'h1', bed: 'A01', weight: '1kg', distribution: { selfPickup: '500g' } },
        { id: 'h2', bed: 'A02', weight: '500g' }
      ],
      tasks: [{ id: 't1', title: '浇水', done: false }],
      inspections: [
        { id: 'i1', bedName: 'A01', abnormalType: 'pest', treatmentResult: 'resolved' }
      ],
      contacts: [{ id: 'c1', bedId: 'b1', relatedHarvestId: 'h1', type: '取菜通知' }],
      plants: [{ id: 'p1', bedId: 'b1', crop: '番茄' }],
      materials: [{ id: 'm1', name: '有机肥' }],
      transactions: [
        { id: 'tx1', materialId: 'm1', type: 'outbound', quantity: 2, bedName: 'A01', relatedType: 'task', relatedId: 't1' }
      ],
      schedules: [],
      bedPlacement: {}
    }
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateArchiveData - contacts bedId check', () => {
    it('contact with bedId pointing to non-existent bed produces warning', () => {
      const archive = buildValidArchiveData();
      archive.data.contacts.push({ id: 'c2', bedId: 'b-nonexist', relatedHarvestId: 'h1', type: '取菜通知' });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'contacts' && w.field === 'bedId' && w.id === 'c2')).toBe(true);
    });
  });

  describe('validateArchiveData - transactions bedName check', () => {
    it('transaction with bedName pointing to non-existent bed name produces warning', () => {
      const archive = buildValidArchiveData();
      archive.data.transactions.push({
        id: 'tx2', materialId: 'm1', type: 'outbound', quantity: 1, bedName: '不存在的畦'
      });
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'transactions' && w.field === 'bedName')).toBe(true);
    });
  });

  describe('validateArchiveData - NaN quantity', () => {
    it('transaction with NaN quantity produces error', () => {
      const archive = buildValidArchiveData();
      archive.data.transactions.push({
        id: 'tx2', materialId: 'm1', type: 'outbound', quantity: NaN
      });
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.type === 'transactions' && e.field === 'quantity')).toBe(true);
    });
  });

  describe('validateArchiveData - combined errors', () => {
    it('harvest with weight format error produces errors', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests[0].weight = 'abc';
      const { errors } = validateArchiveData(archive);
      expect(errors.some(e => e.type === 'harvests' && e.field === 'weight')).toBe(true);
    });

    it('harvest with valid weight but distribution over-amount produces warnings', () => {
      const archive = buildValidArchiveData();
      archive.data.harvests[0].weight = '1kg';
      archive.data.harvests[0].distribution = {
        selfPickup: '800g',
        communityShare: '500g'
      };
      const { warnings } = validateArchiveData(archive);
      expect(warnings.some(w => w.type === 'harvests' && w.message.includes('分配总重量超过采收总量'))).toBe(true);
    });
  });
});

describe('archive.js - computeDiff 补充', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('computeDiff - bedPlacement conflicts', () => {
    it('differing bedPlacement values go into placementUpdated not placementConflicts', () => {
      const local = { bedPlacement: { '1': { x: 0, y: 0 } } };
      const importData = { bedPlacement: { '1': { x: 5, y: 5 } } };
      const diff = computeDiff(local, importData);
      expect(diff.bedPlacement.placementUpdated['1']).toBeDefined();
      expect(diff.bedPlacement.placementUpdated['1'].incoming).toEqual({ x: 5, y: 5 });
      expect(diff.bedPlacement.placementUpdated['1'].current).toEqual({ x: 0, y: 0 });
      expect(Object.keys(diff.bedPlacement.placementConflicts)).toHaveLength(0);
    });
  });

  describe('computeDiff - empty local state', () => {
    it('all import items are added and no localOnly', () => {
      const local = {};
      const importData = {
        beds: [{ id: 'b1', name: 'A01', crop: '番茄' }],
        harvests: [{ id: 'h1', bed: 'A01', weight: '1kg' }]
      };
      const diff = computeDiff(local, importData);
      expect(diff.beds.added).toHaveLength(1);
      expect(diff.harvests.added).toHaveLength(1);
      expect(diff.beds.localOnly).toHaveLength(0);
      expect(diff.harvests.localOnly).toHaveLength(0);
    });
  });
});

describe('archive.js - applyImport 补充', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('applyImport - bedPlacement merge', () => {
    it('correctly merges placementAdded, placementUpdated, placementUnchanged, placementLocalOnly', () => {
      const local = {
        bedPlacement: {
          '1': { x: 0, y: 0 },
          '2': { x: 1, y: 1 },
          '4': { x: 3, y: 3 }
        }
      };
      const importData = {
        bedPlacement: {
          '1': { x: 0, y: 0 },
          '2': { x: 10, y: 10 },
          '3': { x: 2, y: 2 }
        }
      };
      const diff = computeDiff(local, importData);
      const { mergedState } = applyImport(local, importData, diff, {});
      expect(mergedState.bedPlacement['1']).toEqual({ x: 0, y: 0 });
      expect(mergedState.bedPlacement['2']).toEqual({ x: 10, y: 10 });
      expect(mergedState.bedPlacement['3']).toEqual({ x: 2, y: 2 });
      expect(mergedState.bedPlacement['4']).toEqual({ x: 3, y: 3 });
    });
  });

  describe('applyImport - conflicts resolution for current', () => {
    it('conflict resolved as current keeps local data', () => {
      const local = { harvests: [{ id: 'h1', weight: '1kg', archived: false }] };
      const importData = { harvests: [{ id: 'h1', weight: '1kg', archived: true }] };
      const diff = computeDiff(local, importData);
      const resolution = { conflicts: { harvests: { h1: 'current' } } };
      const { mergedState, summary } = applyImport(local, importData, diff, resolution);
      expect(mergedState.harvests[0].archived).toBe(false);
      expect(summary.conflictsResolvedAsCurrent.harvests).toBe(1);
    });
  });

  describe('applyImport - no diff for bedPlacement', () => {
    it('uses localState.bedPlacement when diff has no bedPlacement', () => {
      const local = { beds: [], bedPlacement: { '1': { x: 0, y: 0 } } };
      const importData = { beds: [] };
      const diff = computeDiff(local, importData);
      const { mergedState } = applyImport(local, importData, diff, {});
      expect(mergedState.bedPlacement).toEqual({ '1': { x: 0, y: 0 } });
    });
  });
});

describe('archive.js - persistToLocalStorage', () => {
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
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true
    });
  });

  it('writes all STORAGE_KEYS to localStorage and returns saved keys', () => {
    const mergedState = {
      beds: [{ id: 'b1' }],
      harvests: [{ id: 'h1' }],
      tasks: [],
      schedules: [],
      contacts: [],
      plants: [],
      materials: [],
      transactions: [],
      inspections: [],
      bedPlacement: { '1': { x: 0, y: 0 } }
    };
    const saved = persistToLocalStorage(mergedState);
    expect(saved).toEqual(Object.values(STORAGE_KEYS));
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify(mergedState[key]));
    });
  });

  it('skips keys with undefined values', () => {
    const mergedState = { beds: [{ id: 'b1' }] };
    const saved = persistToLocalStorage(mergedState);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toBe(STORAGE_KEYS.beds);
  });
});

describe('archive.js - parseArchiveFile', () => {
  let mockReaderInstances = [];
  let originalFileReader;

  beforeEach(() => {
    mockReaderInstances = [];
    originalFileReader = globalThis.FileReader;

    class MockFileReader {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this._result = null;
        mockReaderInstances.push(this);
      }
      readAsText() {
      }
      _triggerLoad(result) {
        this._result = result;
        if (this.onload) {
          this.onload({ target: { result } });
        }
      }
      _triggerError() {
        if (this.onerror) {
          this.onerror();
        }
      }
    }

    Object.defineProperty(globalThis, 'FileReader', {
      value: MockFileReader,
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'FileReader', {
      value: originalFileReader,
      configurable: true,
      writable: true
    });
  });

  it('resolves with parsed data on success', async () => {
    const validArchive = {
      schema: 'zfl-garden-archive',
      version: '1.0.0',
      data: { beds: [], harvests: [] }
    };
    const promise = parseArchiveFile(new File([], 'test.json'));
    expect(mockReaderInstances.length).toBe(1);
    mockReaderInstances[0]._triggerLoad(JSON.stringify(validArchive));
    const result = await promise;
    expect(result.schema).toBe('zfl-garden-archive');
    expect(result.data).toBeDefined();
  });

  it('rejects on invalid JSON', async () => {
    const promise = parseArchiveFile(new File([], 'bad.json'));
    mockReaderInstances[0]._triggerLoad('not valid json{');
    await expect(promise).rejects.toThrow('JSON解析失败');
  });

  it('rejects on wrong schema', async () => {
    const wrongSchema = { schema: 'wrong-schema', version: '1.0.0', data: {} };
    const promise = parseArchiveFile(new File([], 'wrong.json'));
    mockReaderInstances[0]._triggerLoad(JSON.stringify(wrongSchema));
    await expect(promise).rejects.toThrow('档案格式不兼容');
  });

  it('rejects on missing data node', async () => {
    const noData = { schema: 'zfl-garden-archive', version: '1.0.0' };
    const promise = parseArchiveFile(new File([], 'nodata.json'));
    mockReaderInstances[0]._triggerLoad(JSON.stringify(noData));
    await expect(promise).rejects.toThrow('缺少data节点');
  });

  it('rejects on non-object root', async () => {
    const promise = parseArchiveFile(new File([], 'array.json'));
    mockReaderInstances[0]._triggerLoad('[1,2,3]');
    await expect(promise).rejects.toThrow('根节点必须是对象');
  });

  it('rejects on FileReader error', async () => {
    const promise = parseArchiveFile(new File([], 'err.json'));
    mockReaderInstances[0]._triggerError();
    await expect(promise).rejects.toThrow('文件读取失败');
  });
});

describe('archive.js - markHarvestAsArchived 补充', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('harvest without distribution field still works', () => {
    const harvest = { id: 'h1', crop: '番茄', bed: 'A01', date: '2025-06-10', weight: '1kg' };
    const archived = markHarvestAsArchived(harvest);
    expect(archived.archived).toBe(true);
    expect(archived.archivedAt).toBe('2025-06-15T10:00:00.000Z');
    expect(archived.distribution).toBeDefined();
    expect(archived.distribution.history).toBeDefined();
    expect(archived.distribution.history.length).toBeGreaterThan(0);
    expect(archived.distribution.history[archived.distribution.history.length - 1].action).toBe('archived');
  });
});

describe('archive.js - downloadArchive', () => {
  let createObjectURlSpy;
  let revokeObjectURLSpy;
  let createElementSpy;
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;

  beforeEach(() => {
    clickSpy = vi.fn();
    createObjectURlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(el => el);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
      const a = { click: clickSpy, href: '', download: '' };
      return a;
    });
  });

  afterEach(() => {
    createObjectURlSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('downloadArchive triggers download with default filename', () => {
    const archive = {
      schemaVersion: 1,
      exportedAt: '2025-06-15T10:00:00.000Z',
      data: { harvests: [], beds: [] }
    };
    downloadArchive(archive);
    expect(createObjectURlSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    const createdEl = createElementSpy.mock.results[0].value;
    expect(createdEl.download).toBe('菜园运营档案-2025-06-15.json');
  });

  it('downloadArchive with custom filename uses given name', () => {
    const archive = {
      schemaVersion: 1,
      exportedAt: '2025-06-15T10:00:00.000Z',
      data: { harvests: [] }
    };
    downloadArchive(archive, 'custom-archive.json');
    const createdEl = createElementSpy.mock.results[0].value;
    expect(createdEl.download).toBe('custom-archive.json');
  });
});
