import { describe, it, expect, beforeEach } from 'vitest';

import {
  parseWeight,
  formatWeight,
  validateDistribution,
  getDistributionStatus,
  getDistributionRemaining,
  getDistributionTotal,
  getPickupStatus,
  getFulfillmentStatus,
  FULFILLMENT_STATUS,
  generatePickupNoticeContact,
  recordPartialPickup,
  confirmFullPickup,
  canReissuePickupNotice,
  getSelfPickupRemainingGrams,
  iso
} from '../distribution';

import {
  syncAllInspections,
  syncTaskCompletionToInspection,
  getClosedLoopStatus,
  CLOSED_LOOP_STATUS,
  findBrokenLinks,
  getFollowupStatus,
  TASK_TYPE_INSPECTION,
  TASK_TYPE_REVIEW
} from '../statusSync';

import {
  buildArchive,
  validateArchiveData,
  markHarvestAsArchived,
  isHarvestArchived,
  buildFulfillmentArchiveSummary
} from '../archive';

import {
  runAllConsistencyChecks,
  checkOverDistribution,
  checkPickupNoticeInconsistency,
  checkPartialPickupConsistency,
  checkInspectionSyncStatus,
  ISSUE_SEVERITY
} from '../consistencyCheck';

describe('集成回归：采收分配 → 自取通知 → 履约归档 → 一致性检查', () => {
  const setupBeds = () => [
    {
      id: 'bed-a01',
      name: 'A01番茄畦',
      crop: '番茄',
      adopter: '李阿姨',
      phone: '13800138000',
      warning: '',
      status: '认养中'
    },
    {
      id: 'bed-b02',
      name: 'B02生菜畦',
      crop: '生菜',
      adopter: '王大爷',
      phone: '13900139000',
      warning: '',
      status: '认养中'
    }
  ];

  const setupHarvest = () => ({
    id: 'h-2025-001',
    crop: '番茄',
    bed: 'A01番茄畦',
    date: iso(-3),
    weight: '2.5kg',
    distribution: null,
    archived: false
  });

  it('场景一：完整正常流程 - 采收分配→自取通知→确认取菜→归档', () => {
    const beds = setupBeds();
    let harvest = setupHarvest();
    let contacts = [];

    // Step 1: 初始状态校验
    expect(parseWeight(harvest.weight)).toBe(2500);
    expect(getDistributionStatus(harvest).key).toBe('unassigned');
    expect(getFulfillmentStatus(harvest).key).toBe(FULFILLMENT_STATUS.PENDING);

    // Step 2: 分配 - 自取 1.5kg，社区分享 800g，损耗 200g
    const distribution = {
      selfPickup: '1.5kg',
      communityShare: '800g',
      loss: '200g',
      distributionUpdatedAt: iso(-2)
    };
    harvest = { ...harvest, distribution };

    // 校验分配合法性
    const errors = validateDistribution(distribution, harvest.weight);
    expect(errors).toHaveLength(0);
    expect(getDistributionTotal(distribution)).toBe(2500);
    expect(getDistributionRemaining(harvest)).toBe(0);
    expect(getDistributionStatus(harvest).key).toBe('completed');

    // Step 3: 生成取菜通知
    const notice = generatePickupNoticeContact(harvest, beds);
    expect(notice).not.toBeNull();
    expect(notice.adopter).toBe('李阿姨');
    expect(notice.type).toBe('取菜通知');
    expect(notice.relatedHarvestId).toBe(harvest.id);
    contacts.push(notice);

    // Step 4: 部分取菜 - 先取 1kg
    const partialResult = recordPartialPickup(harvest.distribution, '1kg');
    expect(partialResult.error).toBeUndefined();
    harvest = { ...harvest, distribution: partialResult };

    const fulfillmentAfterPartial = getFulfillmentStatus(harvest);
    expect(fulfillmentAfterPartial.key).toBe(FULFILLMENT_STATUS.PARTIAL);
    expect(fulfillmentAfterPartial.taken).toBe(1000);
    expect(fulfillmentAfterPartial.remaining).toBe(500);

    // Step 5: 再次取菜 - 取走剩余 500g
    const secondPickup = recordPartialPickup(harvest.distribution, '500g');
    expect(secondPickup.error).toBeUndefined();
    harvest = { ...harvest, distribution: secondPickup };

    // 全部取完后的状态
    const pickupStatus = getPickupStatus(harvest);
    expect(pickupStatus.key).toBe('confirmed');

    const fulfillmentComplete = getFulfillmentStatus(harvest);
    expect(fulfillmentComplete.key).toBe(FULFILLMENT_STATUS.COMPLETED);

    // Step 6: 归档
    const archived = markHarvestAsArchived(harvest);
    expect(isHarvestArchived(archived)).toBe(true);
    expect(archived.fulfillmentStatus).toBe(FULFILLMENT_STATUS.ARCHIVED);
    expect(archived.distribution.history).toBeDefined();
    expect(archived.distribution.history.some(h => h.action === 'archived')).toBe(true);

    // Step 7: 构建档案并校验
    const state = {
      beds,
      harvests: [archived],
      tasks: [],
      schedules: [],
      contacts,
      plants: [],
      materials: [],
      transactions: [],
      inspections: [],
      bedPlacement: {}
    };
    const archive = buildArchive(state);
    const validation = validateArchiveData(archive);

    expect(validation.errors).toHaveLength(0);
    expect(validation.warnings).toHaveLength(0);
    expect(archive.stats.harvests).toBe(1);
    expect(archive.fulfillmentSummary.harvestDetails[0].fulfillmentStatus).toBe(FULFILLMENT_STATUS.ARCHIVED);
  });

  it('场景二：异常路径 - 超量分配拦截与一致性检查', () => {
    const beds = setupBeds();
    const harvest = {
      id: 'h-2025-002',
      crop: '生菜',
      bed: 'B02生菜畦',
      date: iso(-1),
      weight: '1kg',
      distribution: {
        selfPickup: '800g',
        communityShare: '500g'
      }
    };

    // 直接校验：超量分配应被拦截
    const errors = validateDistribution(harvest.distribution, harvest.weight);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('超过采摘总量'))).toBe(true);

    // 一致性检查：应检测到分配超量问题
    const overDistIssues = checkOverDistribution([harvest]);
    expect(overDistIssues.length).toBeGreaterThan(0);
    expect(overDistIssues[0].severity).toBe(ISSUE_SEVERITY.CRITICAL);
    expect(overDistIssues[0].category).toBe('harvest_distribution');

    // 部分取菜超量拦截
    const distWithSelfPickup = {
      selfPickup: '500g',
      selfPickupTaken: '400g'
    };
    const overPickup = recordPartialPickup(distWithSelfPickup, '200g');
    expect(overPickup.error).toBeDefined();
    expect(overPickup.error).toContain('超过剩余可取');

    // 一致性检查：自取数量异常
    const badHarvest = {
      id: 'h-bad',
      crop: '番茄',
      bed: 'A01番茄畦',
      weight: '1kg',
      distribution: {
        selfPickup: '500g',
        selfPickupTaken: '700g'
      }
    };
    const partialIssues = checkPartialPickupConsistency([badHarvest]);
    expect(partialIssues.some(i => i.severity === ISSUE_SEVERITY.CRITICAL)).toBe(true);
  });

  it('场景三：自取通知状态流转与补发机制', () => {
    const beds = setupBeds();
    const harvest = {
      id: 'h-2025-003',
      crop: '番茄',
      bed: 'A01番茄畦',
      date: iso(-5),
      weight: '2kg',
      distribution: {
        selfPickup: '1.5kg',
        distributionUpdatedAt: iso(-5)
      }
    };
    let contacts = [];

    // 初始状态：待自取
    const initialPickupStatus = getPickupStatus(harvest);
    expect(initialPickupStatus.key).toBe('pending');
    expect(initialPickupStatus.isOverdue).toBe(true);

    // 发送首次通知
    const firstNotice = generatePickupNoticeContact(harvest, beds);
    expect(firstNotice).not.toBeNull();
    contacts.push(firstNotice);

    // 立即补发：应被拦截（距上次通知不足宽限期）
    const canReissueNow = canReissuePickupNotice(contacts, harvest.id, 1);
    expect(canReissueNow.canReissue).toBe(false);
    expect(canReissueNow.reason).toContain('天');

    // 未发送通知的一致性检查
    const harvestNoNotice = {
      ...harvest,
      id: 'h-no-notice'
    };
    const pickupIssues = checkPickupNoticeInconsistency([harvestNoNotice], []);
    expect(pickupIssues.some(i => i.title.includes('未通知'))).toBe(true);
  });

  it('场景四：巡检任务同步与闭环完整性', () => {
    const beds = setupBeds();
    const inspections = [
      {
        id: 'insp-001',
        bedName: 'A01番茄畦',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        note: '发现蚜虫，需喷洒有机杀虫剂并持续观察',
        photos: [],
        inspector: '张工',
        date: iso(-2),
        time: '10:00',
        followupDate: iso(3),
        followupOwner: '李阿姨',
        followupTaskId: null,
        syncStatus: 'pending',
        retryCount: 0
      }
    ];
    let tasks = [];

    // Step 1: 初始状态 - 未同步
    expect(inspections[0].syncStatus).toBe('pending');
    const syncIssues = checkInspectionSyncStatus(inspections, beds, tasks);
    expect(syncIssues.length).toBeGreaterThan(0);

    // Step 2: 执行同步
    const syncResult = syncAllInspections(inspections, beds, tasks);
    tasks = syncResult.tasks;
    const updatedInspections = syncResult.inspections;
    const updatedBeds = syncResult.beds;

    // 验证同步结果
    expect(syncResult.syncResults[0].status).toBe('synced');
    expect(tasks.length).toBeGreaterThan(0);
    expect(updatedBeds[0].warning).not.toBe('');
    expect(updatedBeds[0].warning).toContain('虫害');

    // 跟进任务存在
    const followupTask = tasks.find(t => t.taskType === TASK_TYPE_INSPECTION);
    expect(followupTask).toBeDefined();
    expect(followupTask.relatedInspectionId).toBe('insp-001');
    expect(followupTask.done).toBe(false);

    // 复查任务存在
    const reviewTask = tasks.find(t => t.taskType === TASK_TYPE_REVIEW);
    expect(reviewTask).toBeDefined();

    // Step 3: 标记同步完成后，闭环状态检查 - 未完成
    const syncedInspections = updatedInspections.map(i => ({ ...i, syncStatus: 'synced' }));
    const closedLoopBefore = getClosedLoopStatus(
      syncedInspections[0],
      tasks,
      []
    );
    expect(closedLoopBefore.status).toBe(CLOSED_LOOP_STATUS.PENDING);

    // Step 4: 完成跟进任务
    const completedFollowup = { ...followupTask, done: true };
    const afterFollowup = syncTaskCompletionToInspection(
      completedFollowup,
      updatedInspections,
      updatedBeds,
      [completedFollowup, reviewTask]
    );
    tasks = tasks.map(t => t.id === followupTask.id ? { ...t, done: true } : t);

    // Step 5: 完成复查任务
    const completedReview = { ...reviewTask, done: true };
    const afterReview = syncTaskCompletionToInspection(
      completedReview,
      afterFollowup.inspections,
      afterFollowup.beds,
      [completedFollowup, completedReview]
    );
    tasks = tasks.map(t => t.id === reviewTask.id ? { ...t, done: true } : t);

    // 全部完成后清除菜畦警告
    expect(afterReview.beds[0].warning).toBe('');

    // Step 6: 标记巡检同步完成后，检查闭环状态 - 已完成
    const finalInspections = afterReview.inspections.map(i => ({ ...i, syncStatus: 'synced' }));
    const closedLoopAfter = getClosedLoopStatus(
      finalInspections[0],
      tasks,
      []
    );
    expect(closedLoopAfter.status).toBe(CLOSED_LOOP_STATUS.COMPLETE);
    expect(closedLoopAfter.issues).toHaveLength(0);

    // Step 7: 断链检测 - 正常数据无断链
    const brokenLinks = findBrokenLinks(finalInspections, tasks, []);
    expect(brokenLinks).toHaveLength(0);
  });

  it('场景五：断链与异常检测 - 孤立数据与缺失关联', () => {
    const inspections = [
      {
        id: 'insp-valid',
        bedName: 'A01番茄畦',
        abnormalType: 'pest',
        treatmentResult: 'resolved',
        note: '已解决',
        date: iso(-1),
        time: '10:00',
        syncStatus: 'synced'
      }
    ];
    const tasks = [
      {
        id: 'task-orphan',
        title: '孤立任务',
        relatedInspectionId: 'insp-not-exist',
        taskType: TASK_TYPE_INSPECTION,
        done: false
      }
    ];
    const transactions = [
      {
        id: 'tx-orphan',
        materialId: 'mat-not-exist',
        materialName: '未知物资',
        type: 'outbound',
        quantity: 1,
        date: iso(-1),
        relatedType: 'task',
        relatedId: 'task-not-exist'
      }
    ];

    const brokenLinks = findBrokenLinks(inspections, tasks, transactions);
    expect(brokenLinks.length).toBeGreaterThan(0);

    // 检测到孤立任务
    expect(brokenLinks.some(b => b.type === 'broken_link_task')).toBe(true);
    // 检测到孤立流水
    expect(brokenLinks.some(b => b.type === 'orphan_transaction')).toBe(true);
  });

  it('场景六：全链路一致性检查 - 正常数据零问题', () => {
    const beds = setupBeds();
    const harvest = {
      id: 'h-good',
      crop: '番茄',
      bed: 'A01番茄畦',
      date: iso(-2),
      weight: '2kg',
      distribution: {
        selfPickup: '1kg',
        communityShare: '800g',
        volunteerSample: '200g',
        selfPickupConfirmedAt: iso(-1),
        selfPickupTaken: '1kg',
        distributionUpdatedAt: iso(-2)
      },
      archived: false
    };
    const contacts = [
      {
        id: 'c1',
        relatedHarvestId: 'h-good',
        type: '取菜通知',
        date: iso(-2),
        time: '10:00',
        pickupStatus: 'confirmed'
      }
    ];
    const inspections = [
      {
        id: 'insp-good',
        bedName: 'A01番茄畦',
        abnormalType: 'pest',
        treatmentResult: 'resolved',
        note: '已解决',
        date: iso(-5),
        time: '10:00',
        syncStatus: 'synced'
      }
    ];
    const tasks = [];
    const plants = [];
    const materials = [];
    const transactions = [];

    const allIssues = runAllConsistencyChecks({
      beds,
      tasks,
      inspections,
      harvests: [harvest],
      plants,
      transactions,
      contacts,
      materials
    });

    expect(allIssues).toHaveLength(0);
  });

  it('场景七：档案校验 - 多种异常数据检测', () => {
    const state = {
      beds: [
        { id: 'b1', name: 'A01' },
        { id: 'b2', name: 'A02' }
      ],
      harvests: [
        { id: 'h1', bed: 'A01', weight: '1kg' },
        { id: 'h2', bed: '不存在的畦', weight: '500g' },
        { id: 'h3', bed: 'A02', weight: 'invalid', distribution: { selfPickup: 'abc' } }
      ],
      tasks: [{ id: 't1', title: '浇水' }],
      inspections: [
        { id: 'i1', bedName: '不存在的畦', abnormalType: 'pest', treatmentResult: 'resolved' }
      ],
      contacts: [
        { id: 'c1', relatedHarvestId: 'not-exist', type: '取菜通知' }
      ],
      plants: [],
      materials: [{ id: 'm1', name: '肥料' }],
      transactions: [
        { id: 'tx1', materialId: 'm1', quantity: 2, relatedType: 'task', relatedId: 'not-exist' },
        { id: 'tx2', materialId: 'm1', quantity: -1 }
      ],
      schedules: [],
      bedPlacement: {}
    };

    const archive = buildArchive(state);
    const { errors, warnings } = validateArchiveData(archive);

    // 验证有错误被检测到
    expect(errors.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);

    // 错误类型检测
    expect(errors.some(e => e.message.includes('重量格式不合法'))).toBe(true);
    expect(errors.some(e => e.field === 'quantity')).toBe(true);

    // 警告类型检测
    expect(warnings.some(w => w.type === 'harvests' && w.field === 'bed')).toBe(true);
    expect(warnings.some(w => w.type === 'inspections')).toBe(true);
    expect(warnings.some(w => w.type === 'contacts' && w.field === 'relatedHarvestId')).toBe(true);
    expect(warnings.some(w => w.field === 'relatedId')).toBe(true);
  });

  it('场景八：履约状态与归档 - 多状态混合', () => {
    const harvests = [
      {
        id: 'h-pending',
        crop: '番茄',
        bed: 'A01',
        date: iso(-1),
        weight: '1kg',
        distribution: null
      },
      {
        id: 'h-partial',
        crop: '生菜',
        bed: 'A02',
        date: iso(-2),
        weight: '800g',
        distribution: {
          selfPickup: '500g',
          selfPickupTaken: '200g',
          distributionUpdatedAt: iso(-2)
        }
      },
      {
        id: 'h-completed',
        crop: '黄瓜',
        bed: 'B01',
        date: iso(-5),
        weight: '2kg',
        distribution: {
          selfPickup: '1kg',
          selfPickupTaken: '1kg',
          selfPickupConfirmedAt: iso(-4),
          communityShare: '1kg',
          distributionUpdatedAt: iso(-5)
        }
      },
      {
        id: 'h-archived',
        crop: '辣椒',
        bed: 'B02',
        date: iso(-10),
        weight: '500g',
        archived: true,
        archivedAt: iso(-8),
        distribution: {
          selfPickup: '300g',
          selfPickupConfirmedAt: iso(-9)
        }
      }
    ];
    const contacts = [];

    const summary = buildFulfillmentArchiveSummary(harvests, contacts);

    expect(summary.summary.total).toBe(4);
    expect(summary.summary.pending).toBe(1);
    expect(summary.summary.partial).toBe(1);
    expect(summary.summary.completed).toBe(1);
    expect(summary.summary.archived).toBe(1);

    // 验证各采收的履约状态
    const details = summary.harvestDetails;
    expect(details.find(d => d.id === 'h-pending').fulfillmentStatus).toBe(FULFILLMENT_STATUS.PENDING);
    expect(details.find(d => d.id === 'h-partial').fulfillmentStatus).toBe(FULFILLMENT_STATUS.PARTIAL);
    expect(details.find(d => d.id === 'h-completed').fulfillmentStatus).toBe(FULFILLMENT_STATUS.COMPLETED);
    expect(details.find(d => d.id === 'h-archived').fulfillmentStatus).toBe(FULFILLMENT_STATUS.ARCHIVED);
  });

  it('场景九：跟进复查状态 - 逾期检测', () => {
    const inspections = [
      {
        id: 'insp-pending',
        bedName: 'A01',
        abnormalType: 'pest',
        treatmentResult: 'needs_followup',
        followupDate: iso(5),
        syncStatus: 'synced'
      },
      {
        id: 'insp-overdue',
        bedName: 'B02',
        abnormalType: 'disease',
        treatmentResult: 'needs_followup',
        followupDate: iso(-3),
        syncStatus: 'synced'
      },
      {
        id: 'insp-no-plan',
        bedName: 'C03',
        abnormalType: 'weed',
        treatmentResult: 'needs_followup',
        followupDate: null,
        syncStatus: 'synced'
      },
      {
        id: 'insp-not-required',
        bedName: 'D04',
        abnormalType: 'other',
        treatmentResult: 'no_action',
        syncStatus: 'synced'
      }
    ];
    const tasks = [];

    // 各状态正确识别
    const pendingStatus = getFollowupStatus(
      inspections.find(i => i.id === 'insp-pending'),
      tasks
    );
    expect(pendingStatus.key).toBe('pending');
    expect(pendingStatus.overdue).toBe(false);

    const overdueStatus = getFollowupStatus(
      inspections.find(i => i.id === 'insp-overdue'),
      tasks
    );
    expect(overdueStatus.key).toBe('overdue');
    expect(overdueStatus.overdue).toBe(true);

    const noPlanStatus = getFollowupStatus(
      inspections.find(i => i.id === 'insp-no-plan'),
      tasks
    );
    expect(noPlanStatus.key).toBe('no_plan');

    const notRequiredStatus = getFollowupStatus(
      inspections.find(i => i.id === 'insp-not-required'),
      tasks
    );
    expect(notRequiredStatus.key).toBe('not_required');
  });

  it('场景十：异常回归 - 超量分配拦截 + 数据脏写后的一致性检查', () => {
    const beds = setupBeds();
    let harvest = {
      id: 'h-over-001',
      crop: '番茄',
      bed: 'A01番茄畦',
      date: iso(-5),
      weight: '2kg',
      distribution: {
        selfPickup: '1.5kg',
        communityShare: '800g',
        loss: '100g',
        distributionUpdatedAt: iso(-4)
      },
      archived: false
    };

    const errors = validateDistribution(harvest.distribution, harvest.weight);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('超过') || e.includes('超出'))).toBe(true);

    const distStatus = getDistributionStatus(harvest);
    expect(distStatus.key).toBe('completed');
    expect(getDistributionTotal(harvest.distribution)).toBeGreaterThan(parseWeight(harvest.weight));

    const pickupNotice = generatePickupNoticeContact(harvest, beds);
    expect(pickupNotice).not.toBeNull();

    const consistencyIssues = runAllConsistencyChecks({
      harvests: [harvest],
      beds,
      tasks: [],
      inspections: [],
      contacts: pickupNotice ? [pickupNotice] : [],
      transactions: [],
      plants: [],
      materials: []
    });
    expect(consistencyIssues.some(i => i.severity === ISSUE_SEVERITY.CRITICAL)).toBe(true);
    const overDistIssues = checkOverDistribution([harvest]);
    expect(overDistIssues.length).toBeGreaterThan(0);

    const archived = markHarvestAsArchived(harvest);
    expect(isHarvestArchived(archived)).toBe(true);
    const summary = buildFulfillmentArchiveSummary([archived], []);
    expect(summary.harvestDetails).toHaveLength(1);
    const archiveValidation = validateArchiveData({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        harvests: [archived],
        beds,
        tasks: [],
        inspections: [],
        contacts: [],
        transactions: [],
        schedules: [],
        plants: [],
        materials: []
      }
    });
    expect(archiveValidation.warnings.length).toBeGreaterThan(0);
    expect(archiveValidation.errors).toHaveLength(0);
  });

  it('场景十一：巡检→任务→归档→再导入全链路闭环', () => {
    const beds = setupBeds();

    const inspection = {
      id: 'insp-e2e-1',
      bedId: 'bed-a01',
      bedName: 'A01番茄畦',
      abnormalType: 'pest',
      treatmentResult: 'needs_followup',
      note: '番茄有蚜虫，喷有机苦参碱',
      inspector: '巡检员A',
      date: iso(-10).slice(0, 10),
      followupDate: iso(-5).slice(0, 10),
      followupOwner: '李阿姨',
      followupTaskId: null,
      syncStatus: 'pending',
      createdAt: iso(-10)
    };

    const syncResult = syncAllInspections([inspection], beds, []);
    expect(syncResult.syncResults[0].status).toBe('synced');
    const syncedInsp = { ...syncResult.inspections[0], syncStatus: 'synced' };
    expect(syncResult.beds[0].warning).toBeTruthy();
    const allTasks = syncResult.tasks;
    expect(allTasks.length).toBeGreaterThanOrEqual(1);

    const followupTask = allTasks.find(t =>
      t.relatedInspectionId === inspection.id && t.taskType === TASK_TYPE_INSPECTION
    );
    expect(followupTask).toBeDefined();
    const doneTask = { ...followupTask, done: true, doneAt: iso(-6) };
    const tasksAfterFollowup = allTasks.map(t =>
      t.id === followupTask.id ? doneTask : t
    );

    const updatedAfterFollowup = syncTaskCompletionToInspection(
      doneTask,
      [syncedInsp],
      syncResult.beds,
      tasksAfterFollowup
    );

    const reviewTask = allTasks.find(t =>
      t.relatedInspectionId === inspection.id && t.taskType === TASK_TYPE_REVIEW
    );
    let finalInspections = updatedAfterFollowup.inspections;
    let finalBeds = updatedAfterFollowup.beds;
    let completedAllTasks = [doneTask];

    if (reviewTask) {
      const doneReview = { ...reviewTask, done: true, doneAt: iso(-4) };
      completedAllTasks = [doneTask, doneReview];
      const tasksAfterBoth = tasksAfterFollowup.map(t =>
        t.id === reviewTask.id ? doneReview : t
      );
      const afterReview = syncTaskCompletionToInspection(
        doneReview,
        updatedAfterFollowup.inspections,
        updatedAfterFollowup.beds,
        tasksAfterBoth
      );
      finalInspections = afterReview.inspections;
      finalBeds = afterReview.beds;
      expect(afterReview.updated).toBe(true);
      const closed = getClosedLoopStatus(
        finalInspections[0],
        completedAllTasks,
        []
      );
      expect(closed.status).toBe(CLOSED_LOOP_STATUS.COMPLETE);
    }

    const harvest = markHarvestAsArchived({
      id: 'h-e2e-1',
      crop: '番茄',
      bed: 'A01番茄畦',
      date: iso(-3),
      weight: '1.2kg',
      distribution: {
        selfPickup: '1kg',
        communityShare: '200g',
        distributionUpdatedAt: iso(-2)
      },
      archived: false
    });

    const archive = buildArchive({
      beds: finalBeds,
      harvests: [harvest],
      tasks: completedAllTasks,
      inspections: finalInspections,
      contacts: [],
      transactions: [],
      schedules: [],
      plants: [],
      materials: []
    });
    const validated = validateArchiveData(archive);
    expect(validated.errors).toHaveLength(0);

    const consistency = runAllConsistencyChecks({
      harvests: [harvest],
      beds: finalBeds,
      tasks: archive.data.tasks,
      inspections: archive.data.inspections,
      contacts: [],
      transactions: [],
      plants: [],
      materials: []
    });
    const criticalCount = consistency.filter(i => i.severity === ISSUE_SEVERITY.CRITICAL).length;
    expect(criticalCount).toBe(0);
  });
});
