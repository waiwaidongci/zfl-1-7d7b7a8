import { describe, it, expect } from 'vitest';
import {
  parseWeight,
  formatWeight,
  isValidWeightFormat,
  getDistributionTotal,
  getDistributionRemaining,
  validateDistribution,
  validateDistributionWithPartial,
  getDistributionStatus,
  getPickupStatus,
  getSelfPickupGrams,
  getSelfPickupTakenGrams,
  getSelfPickupRemainingGrams,
  recordPartialPickup,
  getQueueStatusKey,
  getQueueStats,
  generatePickupNoticeContent,
  generatePickupNoticeContact,
  canReissuePickupNotice,
  getFulfillmentStatus,
  FULFILLMENT_STATUS,
  DISTRIBUTION_OVERDUE_DAYS,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  iso,
  getDistributionWarnings,
  getPickupWarnings,
  getAllWarnings,
  getDistributionStats,
  getPickupStats,
  getFulfillmentSummary,
  buildInitialDistribution,
  confirmFullPickup,
  addDistributionHistory,
  recordNoticeSent,
  getMissingContactInfo,
  hasCompleteContactInfo,
  getExpectedPickupDate,
  findBedByName,
  confirmPickupContact,
  findRelatedPickupNotice,
  checkPickupNoticeExists,
  getPickupNoticeCount,
  getAllPickupNotices,
  generateReissueNoticeContact,
  normalizeHarvestDistribution,
  filterHarvestsByRange,
  filterHarvestsByBed,
  filterHarvestsByCrop,
  getUniqueBeds,
  getUniqueCrops,
  groupHarvestsByBed,
  groupHarvestsByCrop,
  groupHarvestsByAdopter,
  splitHarvestByDateRange,
  getQueueStatusWithFulfillment
} from '../distribution';

describe('distribution.js - 重量解析', () => {
  describe('parseWeight', () => {
    it('正常解析 kg 单位', () => {
      expect(parseWeight('1.5kg')).toBe(1500);
      expect(parseWeight('2kg')).toBe(2000);
      expect(parseWeight('0.5kg')).toBe(500);
    });

    it('正常解析 g 单位', () => {
      expect(parseWeight('300g')).toBe(300);
      expect(parseWeight('1000g')).toBe(1000);
      expect(parseWeight('50.5g')).toBe(50.5);
    });

    it('解析纯数字（默认克）', () => {
      expect(parseWeight('500')).toBe(500);
      expect(parseWeight('1.5')).toBe(1.5);
    });

    it('忽略大小写和空格', () => {
      expect(parseWeight(' 1.5 KG ')).toBe(1500);
      expect(parseWeight(' 300 G ')).toBe(300);
    });

    it('空值/无效输入返回 0', () => {
      expect(parseWeight('')).toBe(0);
      expect(parseWeight(null)).toBe(0);
      expect(parseWeight(undefined)).toBe(0);
      expect(parseWeight('abc')).toBe(0);
      expect(parseWeight('-500g')).toBe(0);
    });

    it('非字符串输入返回 0', () => {
      expect(parseWeight(123)).toBe(0);
      expect(parseWeight({})).toBe(0);
      expect(parseWeight([])).toBe(0);
    });
  });

  describe('formatWeight', () => {
    it('克级重量显示 g', () => {
      expect(formatWeight(300)).toBe('300g');
      expect(formatWeight(999)).toBe('999g');
    });

    it('千克级重量显示 kg', () => {
      expect(formatWeight(1000)).toBe('1kg');
      expect(formatWeight(1500)).toBe('1.5kg');
      expect(formatWeight(2000)).toBe('2kg');
    });

    it('零或负数显示 0g', () => {
      expect(formatWeight(0)).toBe('0g');
      expect(formatWeight(-100)).toBe('0g');
      expect(formatWeight(null)).toBe('0g');
    });
  });

  describe('isValidWeightFormat', () => {
    it('合法格式返回 true', () => {
      expect(isValidWeightFormat('1.5kg')).toBe(true);
      expect(isValidWeightFormat('300g')).toBe(true);
      expect(isValidWeightFormat('2KG')).toBe(true);
      expect(isValidWeightFormat(' 500g ')).toBe(true);
    });

    it('非法格式返回 false', () => {
      expect(isValidWeightFormat('')).toBe(false);
      expect(isValidWeightFormat('abc')).toBe(false);
      expect(isValidWeightFormat('500')).toBe(false);
      expect(isValidWeightFormat(null)).toBe(false);
      expect(isValidWeightFormat(123)).toBe(false);
    });
  });
});

describe('distribution.js - 分配超量拦截', () => {
  describe('getDistributionTotal', () => {
    it('计算所有分配类型的总重量', () => {
      const distribution = {
        selfPickup: '500g',
        communityShare: '300g',
        volunteerSample: '100g',
        loss: '50g'
      };
      expect(getDistributionTotal(distribution)).toBe(950);
    });

    it('空分配返回 0', () => {
      expect(getDistributionTotal(null)).toBe(0);
      expect(getDistributionTotal({})).toBe(0);
    });

    it('部分分配项为空时只计算有值的', () => {
      const distribution = {
        selfPickup: '500g',
        communityShare: '',
        volunteerSample: null,
        loss: undefined
      };
      expect(getDistributionTotal(distribution)).toBe(500);
    });
  });

  describe('getDistributionRemaining', () => {
    it('正常计算剩余重量', () => {
      const harvest = {
        weight: '1kg',
        distribution: { selfPickup: '600g', communityShare: '200g' }
      };
      expect(getDistributionRemaining(harvest)).toBe(200);
    });

    it('分配完时剩余为 0', () => {
      const harvest = {
        weight: '1kg',
        distribution: { selfPickup: '600g', communityShare: '400g' }
      };
      expect(getDistributionRemaining(harvest)).toBe(0);
    });

    it('分配超量时剩余不为负（被截断为0）', () => {
      const harvest = {
        weight: '1kg',
        distribution: { selfPickup: '800g', communityShare: '500g' }
      };
      expect(getDistributionRemaining(harvest)).toBe(0);
    });
  });

  describe('validateDistribution', () => {
    it('合法分配无错误', () => {
      const distribution = {
        selfPickup: '500g',
        communityShare: '300g'
      };
      const errors = validateDistribution(distribution, '1kg');
      expect(errors).toHaveLength(0);
    });

    it('分配超量时返回错误', () => {
      const distribution = {
        selfPickup: '800g',
        communityShare: '500g'
      };
      const errors = validateDistribution(distribution, '1kg');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('超过采摘总量');
    });

    it('格式错误返回错误', () => {
      const distribution = {
        selfPickup: 'abc',
        communityShare: '300g'
      };
      const errors = validateDistribution(distribution, '1kg');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('格式不正确'))).toBe(true);
    });

    it('空/undefined distribution 不报错', () => {
      expect(validateDistribution(null, '1kg')).toHaveLength(0);
      expect(validateDistribution(undefined, '1kg')).toHaveLength(0);
    });

    it('总重量为 0 时不触发超量错误', () => {
      const distribution = { selfPickup: '500g' };
      const errors = validateDistribution(distribution, '0g');
      expect(errors.some(e => e.includes('超过'))).toBe(false);
    });
  });

  describe('validateDistributionWithPartial', () => {
    it('已取走重量不超过自取总量时无错误', () => {
      const distribution = {
        selfPickup: '500g',
        selfPickupTaken: '300g'
      };
      const errors = validateDistributionWithPartial(distribution, '1kg');
      expect(errors).toHaveLength(0);
    });

    it('已取走重量超过自取总量时报错', () => {
      const distribution = {
        selfPickup: '500g',
        selfPickupTaken: '600g'
      };
      const errors = validateDistributionWithPartial(distribution, '1kg');
      expect(errors.some(e => e.includes('已取走重量') && e.includes('超过'))).toBe(true);
    });
  });

  describe('recordPartialPickup', () => {
    it('正常记录部分取菜', () => {
      const distribution = { selfPickup: '500g' };
      const result = recordPartialPickup(distribution, '200g');
      expect(result).not.toBeNull();
      expect(result.error).toBeUndefined();
      expect(getSelfPickupTakenGrams(result)).toBe(200);
      expect(getSelfPickupRemainingGrams(result)).toBe(300);
    });

    it('取菜重量超过剩余时返回错误', () => {
      const distribution = { selfPickup: '500g', selfPickupTaken: '400g' };
      const result = recordPartialPickup(distribution, '200g');
      expect(result).not.toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('超过剩余可取');
    });

    it('取菜重量为 0 或无效时返回 null', () => {
      const distribution = { selfPickup: '500g' };
      expect(recordPartialPickup(distribution, '0g')).toBeNull();
      expect(recordPartialPickup(distribution, '')).toBeNull();
      expect(recordPartialPickup(distribution, 'abc')).toBeNull();
    });

    it('全部取完时标记确认时间', () => {
      const distribution = { selfPickup: '500g' };
      const result = recordPartialPickup(distribution, '500g');
      expect(result.selfPickupConfirmedAt).toBeDefined();
    });
  });
});

describe('distribution.js - 自取通知状态', () => {
  describe('getPickupStatus', () => {
    it('未登记自取返回 none', () => {
      const harvest = { weight: '1kg', distribution: { communityShare: '500g' } };
      const status = getPickupStatus(harvest);
      expect(status.key).toBe('none');
    });

    it('已确认取菜返回 confirmed', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-10',
        distribution: {
          selfPickup: '500g',
          selfPickupConfirmedAt: '2025-06-12T10:00:00.000Z'
        }
      };
      const status = getPickupStatus(harvest);
      expect(status.key).toBe('confirmed');
      expect(status.isOverdue).toBe(false);
    });

    it('待取菜（未超期）', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-14',
        distribution: { selfPickup: '500g', distributionUpdatedAt: '2025-06-14' }
      };
      const status = getPickupStatus(harvest);
      expect(status.key).toBe('pending');
      expect(status.isOverdue).toBe(false);
    });

    it('待取菜（已超期）', () => {
      const pastDate = new Date('2025-06-15T10:00:00.000Z');
      pastDate.setDate(pastDate.getDate() - (PICKUP_CONFIRM_OVERDUE_DAYS + 1));
      const harvest = {
        weight: '1kg',
        date: pastDate.toISOString().slice(0, 10),
        distribution: {
          selfPickup: '500g',
          distributionUpdatedAt: pastDate.toISOString().slice(0, 10)
        }
      };
      const status = getPickupStatus(harvest);
      expect(status.key).toBe('pending');
      expect(status.isOverdue).toBe(true);
    });
  });

  describe('generatePickupNoticeContent', () => {
    it('生成取菜通知内容', () => {
      const harvest = {
        id: 'h1',
        crop: '番茄',
        weight: '1kg',
        date: '2025-06-15',
        distribution: { selfPickup: '500g' }
      };
      const content = generatePickupNoticeContent(harvest, '2025-06-16');
      expect(content).toContain('取菜通知');
      expect(content).toContain('番茄');
      expect(content).toContain('500g');
      expect(content).toContain('2025-06-16');
    });

    it('没有采收信息返回空字符串', () => {
      expect(generatePickupNoticeContent(null)).toBe('');
    });
  });

  describe('generatePickupNoticeContact', () => {
    const beds = [
      { id: 'b1', name: 'A01番茄畦', adopter: '张三', phone: '13800138000' }
    ];

    it('正常生成通知联系人', () => {
      const harvest = {
        id: 'h1',
        crop: '番茄',
        bed: 'A01番茄畦',
        weight: '1kg',
        date: '2025-06-15',
        distribution: { selfPickup: '500g' }
      };
      const contact = generatePickupNoticeContact(harvest, beds);
      expect(contact).not.toBeNull();
      expect(contact.adopter).toBe('张三');
      expect(contact.type).toBe('取菜通知');
      expect(contact.relatedHarvestId).toBe('h1');
      expect(contact.pickupStatus).toBe('pending');
    });

    it('没有自取分配时返回 null', () => {
      const harvest = {
        id: 'h1',
        crop: '番茄',
        bed: 'A01番茄畦',
        weight: '1kg',
        distribution: { communityShare: '500g' }
      };
      expect(generatePickupNoticeContact(harvest, beds)).toBeNull();
    });

    it('菜畦不存在时返回 null', () => {
      const harvest = {
        id: 'h1',
        crop: '番茄',
        bed: '不存在的畦',
        weight: '1kg',
        distribution: { selfPickup: '500g' }
      };
      expect(generatePickupNoticeContact(harvest, beds)).toBeNull();
    });

    it('菜畦无认养人时返回 null', () => {
      const bedsNoAdopter = [{ id: 'b2', name: 'B02', adopter: null }];
      const harvest = {
        id: 'h1',
        crop: '生菜',
        bed: 'B02',
        weight: '500g',
        distribution: { selfPickup: '300g' }
      };
      expect(generatePickupNoticeContact(harvest, bedsNoAdopter)).toBeNull();
    });
  });

  describe('canReissuePickupNotice', () => {
    const harvestId = 'h1';

    it('没有历史通知时可以补发', () => {
      const result = canReissuePickupNotice([], harvestId);
      expect(result.canReissue).toBe(true);
    });

    it('距上次通知不足宽限期不能补发', () => {
      const today = new Date('2025-06-15T10:00:00.000Z');
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const contacts = [
        {
          id: 'c1',
          relatedHarvestId: harvestId,
          type: '取菜通知',
          date: yesterday.toISOString().slice(0, 10),
          time: '10:00'
        }
      ];
      const result = canReissuePickupNotice(contacts, harvestId, 3);
      expect(result.canReissue).toBe(false);
      expect(result.reason).toContain('天');
    });

    it('超过宽限期可以补发', () => {
      const today = new Date('2025-06-15T10:00:00.000Z');
      const fourDaysAgo = new Date(today);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const contacts = [
        {
          id: 'c1',
          relatedHarvestId: harvestId,
          type: '取菜通知',
          date: fourDaysAgo.toISOString().slice(0, 10),
          time: '10:00'
        }
      ];
      const result = canReissuePickupNotice(contacts, harvestId, 3);
      expect(result.canReissue).toBe(true);
    });
  });
});

describe('distribution.js - 队列与履约状态', () => {
  describe('getDistributionStatus', () => {
    it('未分配状态', () => {
      const harvest = { weight: '1kg', date: '2025-06-15', distribution: null };
      const status = getDistributionStatus(harvest);
      expect(status.key).toBe('unassigned');
    });

    it('部分分配状态', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-15',
        distribution: { selfPickup: '500g' }
      };
      const status = getDistributionStatus(harvest);
      expect(status.key).toBe('partial');
    });

    it('已完成分配状态', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-15',
        distribution: { selfPickup: '600g', communityShare: '400g' }
      };
      const status = getDistributionStatus(harvest);
      expect(status.key).toBe('completed');
    });

    it('超过分配期限标记超期', () => {
      const pastDate = new Date('2025-06-15T10:00:00.000Z');
      pastDate.setDate(pastDate.getDate() - (DISTRIBUTION_OVERDUE_DAYS + 1));
      const harvest = {
        weight: '1kg',
        date: pastDate.toISOString().slice(0, 10),
        distribution: null
      };
      const status = getDistributionStatus(harvest);
      expect(status.key).toBe('unassigned');
      expect(status.isOverdue).toBe(true);
    });
  });

  describe('getQueueStatusKey', () => {
    it('未分配的采收返回 unassigned', () => {
      const harvest = { weight: '1kg', date: '2025-06-15', distribution: null };
      expect(getQueueStatusKey(harvest)).toBe('unassigned');
    });

    it('待自取返回 pendingPickup', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-14',
        distribution: { selfPickup: '500g', communityShare: '500g' }
      };
      expect(getQueueStatusKey(harvest)).toBe('pendingPickup');
    });

    it('已完成分配且无自取返回 completed', () => {
      const harvest = {
        weight: '1kg',
        date: '2025-06-10',
        distribution: { communityShare: '1kg' }
      };
      expect(getQueueStatusKey(harvest)).toBe('completed');
    });
  });

  describe('getQueueStats', () => {
    it('正确统计各状态数量和重量', () => {
      const harvests = [
        { id: 'h1', weight: '1kg', date: '2025-06-15', distribution: null },
        {
          id: 'h2', weight: '2kg', date: '2025-06-14',
          distribution: { communityShare: '500g' }
        },
        {
          id: 'h3', weight: '500g', date: '2025-06-10',
          distribution: {
            selfPickup: '300g',
            selfPickupConfirmedAt: '2025-06-11T10:00:00.000Z',
            communityShare: '200g'
          }
        }
      ];
      const stats = getQueueStats(harvests);
      expect(stats.total).toBe(3);
      expect(stats.unassigned).toBe(1);
      expect(stats.partial).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.unassignedWeight).toBe(1000);
      expect(stats.partialWeight).toBe(1500);
    });
  });

  describe('getFulfillmentStatus', () => {
    it('已归档返回 archived', () => {
      const harvest = { id: 'h1', archived: true, weight: '1kg' };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.ARCHIVED);
    });

    it('无分配返回待分配', () => {
      const harvest = { id: 'h1', weight: '1kg' };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.PENDING);
    });

    it('有自取但未取走返回待自取', () => {
      const harvest = {
        id: 'h1', weight: '1kg',
        distribution: { selfPickup: '500g', communityShare: '500g' }
      };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.PENDING);
      expect(status.label).toBe('待自取');
    });

    it('部分自取返回部分履约', () => {
      const harvest = {
        id: 'h1', weight: '1kg',
        distribution: { selfPickup: '500g', selfPickupTaken: '200g' }
      };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.PARTIAL);
      expect(status.taken).toBe(200);
      expect(status.remaining).toBe(300);
    });

    it('全部取走返回履约完成', () => {
      const harvest = {
        id: 'h1', weight: '1kg',
        distribution: {
          selfPickup: '500g',
          selfPickupTaken: '500g',
          selfPickupConfirmedAt: '2025-06-15T10:00:00.000Z',
          communityShare: '500g'
        }
      };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.COMPLETED);
    });

    it('无自取但分配完所有非自取项时返回履约完成', () => {
      const harvest = {
        id: 'h1', weight: '1kg',
        distribution: {
          communityShare: '600g',
          volunteerSample: '200g',
          loss: '200g'
        }
      };
      const status = getFulfillmentStatus(harvest);
      expect(status.key).toBe(FULFILLMENT_STATUS.COMPLETED);
    });

    it('null harvest 返回 PENDING', () => {
      expect(getFulfillmentStatus(null).key).toBe(FULFILLMENT_STATUS.PENDING);
      expect(getFulfillmentStatus(undefined).key).toBe(FULFILLMENT_STATUS.PENDING);
    });
  });
});

describe('distribution.js - 警告与统计补充覆盖', () => {
  describe('getDistributionWarnings / getPickupWarnings / getAllWarnings', () => {
    it('未分配采收产生警告', () => {
      const harvests = [
        { id: 'h1', crop: '番茄', bed: 'A01', date: iso(0), weight: '1kg', distribution: null }
      ];
      const warnings = getDistributionWarnings(harvests);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('warning');
    });

    it('超期未分配产生 critical 警告', () => {
      const pastDate = new Date('2025-06-15T10:00:00.000Z');
      pastDate.setDate(pastDate.getDate() - (DISTRIBUTION_OVERDUE_DAYS + 1));
      const harvests = [
        { id: 'h1', crop: '番茄', bed: 'A01', date: pastDate.toISOString().slice(0, 10), weight: '1kg', distribution: null }
      ];
      const warnings = getDistributionWarnings(harvests);
      expect(warnings[0].type).toBe('critical');
      expect(warnings[0].message).toContain('未分配');
    });

    it('部分分配超期产生警告', () => {
      const pastDate = new Date('2025-06-15T10:00:00.000Z');
      pastDate.setDate(pastDate.getDate() - (DISTRIBUTION_OVERDUE_DAYS + 1));
      const harvests = [
        {
          id: 'h1', crop: '番茄', bed: 'A01',
          date: pastDate.toISOString().slice(0, 10),
          weight: '1kg',
          distribution: { selfPickup: '500g' }
        }
      ];
      const warnings = getDistributionWarnings(harvests);
      expect(warnings.some(w => w.id.includes('partial'))).toBe(true);
    });

    it('已完成分配无警告', () => {
      const harvests = [
        {
          id: 'h1', crop: '番茄', bed: 'A01', date: iso(0), weight: '1kg',
          distribution: { selfPickup: '1kg', selfPickupConfirmedAt: iso(0) }
        }
      ];
      expect(getDistributionWarnings(harvests)).toHaveLength(0);
    });

    it('待自取产生待自取警告', () => {
      const harvests = [
        {
          id: 'h1', crop: '番茄', bed: 'A01', date: iso(0), weight: '1kg',
          distribution: { selfPickup: '500g', distributionUpdatedAt: iso(0) }
        }
      ];
      const warnings = getPickupWarnings(harvests);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('pickupPending');
    });

    it('超期未取产生 critical 警告', () => {
      const pastDate = new Date('2025-06-15T10:00:00.000Z');
      pastDate.setDate(pastDate.getDate() - (PICKUP_CONFIRM_OVERDUE_DAYS + 1));
      const harvests = [
        {
          id: 'h1', crop: '番茄', bed: 'A01',
          date: pastDate.toISOString().slice(0, 10), weight: '1kg',
          distribution: { selfPickup: '500g', distributionUpdatedAt: pastDate.toISOString().slice(0, 10) }
        }
      ];
      const warnings = getPickupWarnings(harvests);
      expect(warnings[0].type).toBe('critical');
    });

    it('getAllWarnings 合并两类警告', () => {
      const harvests = [
        { id: 'h1', crop: '番茄', bed: 'A01', date: iso(0), weight: '1kg', distribution: null },
        {
          id: 'h2', crop: '生菜', bed: 'A02', date: iso(0), weight: '1kg',
          distribution: { selfPickup: '500g', distributionUpdatedAt: iso(0) }
        }
      ];
      const all = getAllWarnings(harvests);
      expect(all.length).toBe(2);
    });
  });

  describe('getDistributionStats / getPickupStats / getFulfillmentSummary', () => {
    it('getDistributionStats 正确统计各状态', () => {
      const harvests = [
        { id: 'h1', date: iso(0), weight: '1kg', distribution: null },
        { id: 'h2', date: iso(0), weight: '2kg', distribution: { selfPickup: '500g' } },
        {
          id: 'h3', date: iso(-10), weight: '500g',
          distribution: { selfPickup: '500g', selfPickupConfirmedAt: iso(-9) }
        }
      ];
      const stats = getDistributionStats(harvests);
      expect(stats.unassigned).toBe(1);
      expect(stats.partial).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.totalWeight).toBe(3500);
      expect(stats.remainingWeight).toBe(2500);
    });

    it('getPickupStats 正确统计自取状态', () => {
      const harvests = [
        {
          id: 'h1', distribution: { selfPickup: '500g', selfPickupConfirmedAt: iso(-1) }
        },
        {
          id: 'h2', distribution: { selfPickup: '300g', distributionUpdatedAt: iso(0) }
        },
        {
          id: 'h3', distribution: { communityShare: '1kg' }
        }
      ];
      const stats = getPickupStats(harvests);
      expect(stats.confirmed).toBe(1);
      expect(stats.confirmedWeight).toBe(500);
      expect(stats.pending).toBe(1);
      expect(stats.pendingWeight).toBe(300);
    });

    it('getFulfillmentSummary 汇总履约状态', () => {
      const harvests = [
        { id: 'h1', weight: '1kg', archived: true },
        { id: 'h2', weight: '2kg', distribution: { selfPickup: '1kg', selfPickupTaken: '500g' } },
        { id: 'h3', weight: '500g', distribution: { communityShare: '500g' } }
      ];
      const summary = getFulfillmentSummary(harvests);
      expect(summary.total).toBe(3);
      expect(summary.archived).toBe(1);
      expect(summary.partial).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.byType.communityShare).toBe(500);
    });
  });

  describe('buildInitialDistribution', () => {
    const beds = [{ id: 'b1', name: 'A01', adopter: '张三' }];
    const bedsNoAdopter = [{ id: 'b2', name: 'A02' }];

    it('有认养人且开启 autoAssignSelfPickup 时自动分配默认自取量', () => {
      const harvest = { id: 'h1', bed: 'A01', weight: '1kg' };
      const dist = buildInitialDistribution(harvest, beds, { autoAssignSelfPickup: true });
      expect(parseWeight(dist.selfPickup)).toBeGreaterThan(0);
      expect(parseWeight(dist.communityShare)).toBeGreaterThan(0);
    });

    it('指定 selfPickupRatio 按比例分配', () => {
      const harvest = { id: 'h1', bed: 'A01', weight: '1kg' };
      const dist = buildInitialDistribution(harvest, beds, { defaultSelfPickupRatio: 0.7 });
      expect(parseWeight(dist.selfPickup)).toBe(700);
      expect(parseWeight(dist.communityShare)).toBe(300);
    });

    it('无认养人时不自动分配', () => {
      const harvest = { id: 'h1', bed: 'A02', weight: '1kg' };
      const dist = buildInitialDistribution(harvest, bedsNoAdopter, { autoAssignSelfPickup: true });
      expect(dist.selfPickup).toBe('');
    });

    it('ratio 限制在 0-1 之间', () => {
      const harvest = { id: 'h1', bed: 'A01', weight: '1kg' };
      const distRatio2 = buildInitialDistribution(harvest, beds, { defaultSelfPickupRatio: 2 });
      expect(parseWeight(distRatio2.selfPickup)).toBeLessThanOrEqual(1000);
      const distRatioNeg = buildInitialDistribution(harvest, beds, { defaultSelfPickupRatio: -1 });
      expect(parseWeight(distRatioNeg.selfPickup)).toBe(0);
    });
  });

  describe('confirmFullPickup / addDistributionHistory', () => {
    it('confirmFullPickup 标记全部取走', () => {
      const distribution = { selfPickup: '500g' };
      const result = confirmFullPickup(distribution);
      expect(getSelfPickupTakenGrams(result)).toBe(500);
      expect(result.selfPickupConfirmedAt).toBeDefined();
      expect(result.history.some(h => h.action === 'pickup_confirmed')).toBe(true);
    });

    it('confirmFullPickup 无自取分配时原样返回', () => {
      const distribution = { communityShare: '500g' };
      const result = confirmFullPickup(distribution);
      expect(result.selfPickupTaken).toBeUndefined();
    });

    it('addDistributionHistory 追加历史记录', () => {
      let dist = { selfPickup: '500g' };
      dist = addDistributionHistory(dist, 'test_action', { foo: 'bar' });
      expect(dist.history.length).toBe(1);
      expect(dist.history[0].action).toBe('test_action');
      expect(dist.history[0].foo).toBe('bar');
      expect(dist.history[0].timestamp).toBeDefined();
    });
  });

  describe('recordNoticeSent / getMissingContactInfo / hasCompleteContactInfo', () => {
    it('recordNoticeSent 添加通知发送历史', () => {
      const dist = { selfPickup: '500g' };
      const result = recordNoticeSent(dist, 'reminder');
      expect(result.history.some(h => h.action === 'notice_sent')).toBe(true);
    });

    it('getMissingContactInfo 检测缺失信息', () => {
      const harvest = { bed: 'A01' };
      const bedsComplete = [{ name: 'A01', adopter: '张三', phone: '138' }];
      const bedsNoPhone = [{ name: 'A01', adopter: '张三' }];
      const bedsNoAdopter = [{ name: 'A01' }];
      expect(hasCompleteContactInfo(harvest, bedsComplete)).toBe(true);
      expect(getMissingContactInfo(harvest, bedsNoPhone)).toContain('联系电话');
      expect(getMissingContactInfo(harvest, bedsNoAdopter)).toContain('认养人');
      expect(getMissingContactInfo(harvest, [])).toContain('菜畦信息不存在');
    });
  });

  describe('getExpectedPickupDate / findBedByName', () => {
    it('getExpectedPickupDate 计算预期取菜日期', () => {
      const date = getExpectedPickupDate('2025-06-15');
      expect(date).toBe('2025-06-16');
    });

    it('findBedByName 找到菜畦', () => {
      const beds = [{ id: 'b1', name: 'A01' }, { id: 'b2', name: 'A02' }];
      expect(findBedByName(beds, 'A01').id).toBe('b1');
      expect(findBedByName(beds, '不存在')).toBeNull();
      expect(findBedByName(null, 'A01')).toBeNull();
    });
  });

  describe('confirmPickupContact / findRelatedPickupNotice / checkPickupNoticeExists / getPickupNoticeCount / getAllPickupNotices', () => {
    const contacts = [
      { id: 'c1', relatedHarvestId: 'h1', type: '取菜通知', pickupStatus: 'pending' },
      { id: 'c2', relatedHarvestId: 'h1', type: '其他类型' }
    ];

    it('findRelatedPickupNotice 找到对应通知', () => {
      expect(findRelatedPickupNotice(contacts, 'h1').id).toBe('c1');
      expect(findRelatedPickupNotice(contacts, 'h999')).toBeNull();
    });

    it('confirmPickupContact 标记确认取菜', () => {
      const updated = confirmPickupContact(contacts, 'h1');
      expect(updated[0].pickupStatus).toBe('confirmed');
      expect(updated[0].pickupConfirmedAt).toBeDefined();
    });

    it('checkPickupNoticeExists 检查是否存在', () => {
      expect(checkPickupNoticeExists(contacts, 'h1')).toBe(true);
      expect(checkPickupNoticeExists(contacts, 'h999')).toBe(false);
    });

    it('getPickupNoticeCount 统计数量', () => {
      expect(getPickupNoticeCount(contacts, 'h1')).toBe(1);
    });

    it('getAllPickupNotices 获取所有通知', () => {
      expect(getAllPickupNotices(contacts, 'h1')).toHaveLength(1);
    });
  });

  describe('generateReissueNoticeContact', () => {
    const beds = [{ id: 'b1', name: 'A01番茄畦', adopter: '李阿姨', phone: '138' }];

    it('可以补发时生成补发通知', () => {
      const harvest = {
        id: 'h1', bed: 'A01番茄畦',
        distribution: { selfPickup: '500g' }
      };
      const contacts = [];
      const notice = generateReissueNoticeContact(harvest, beds, contacts);
      expect(notice).not.toBeNull();
      expect(notice.isReissue).toBe(true);
      expect(notice.content).toContain('补发通知');
    });

    it('距上次通知不足宽限期返回错误', () => {
      const harvest = {
        id: 'h1', bed: 'A01番茄畦',
        distribution: { selfPickup: '500g' }
      };
      const contacts = [{
        id: 'c1', relatedHarvestId: 'h1', type: '取菜通知',
        date: iso(0), time: '10:00'
      }];
      const result = generateReissueNoticeContact(harvest, beds, contacts);
      expect(result).not.toBeNull();
      expect(result.error).toBeDefined();
    });

    it('已全部取走时无需补发', () => {
      const harvest = {
        id: 'h1', bed: 'A01番茄畦',
        distribution: { selfPickup: '500g', selfPickupTaken: '500g' }
      };
      const result = generateReissueNoticeContact(harvest, beds, []);
      expect(result.error).toContain('无需补发');
    });
  });

  describe('normalizeHarvestDistribution', () => {
    it('正常数据标准化', () => {
      const harvest = {
        id: 'h1',
        distribution: {
          selfPickup: '500g',
          communityShare: '',
          invalidField: 'xxx',
          distributionUpdatedAt: iso(0)
        }
      };
      const normalized = normalizeHarvestDistribution(harvest);
      expect(normalized.distribution.selfPickup).toBe('500g');
      expect(normalized.distribution.communityShare).toBeUndefined();
      expect(normalized.distribution.invalidField).toBeUndefined();
    });

    it('无有效分配字段时设为 null', () => {
      const harvest = {
        id: 'h1',
        distribution: { distributionUpdatedAt: iso(0) }
      };
      const normalized = normalizeHarvestDistribution(harvest);
      expect(normalized.distribution).toBeNull();
    });

    it('distribution 为 undefined 时设为 null', () => {
      const harvest = { id: 'h1' };
      const normalized = normalizeHarvestDistribution(harvest);
      expect(normalized.distribution).toBeNull();
    });
  });

  describe('筛选与分组函数', () => {
    const harvests = [
      { id: 'h1', bed: 'A01', crop: '番茄', date: '2025-06-10', weight: '1kg' },
      { id: 'h2', bed: 'A02', crop: '生菜', date: '2025-06-12', weight: '500g' },
      { id: 'h3', bed: 'A01', crop: '黄瓜', date: '2025-06-15', weight: '2kg' }
    ];
    const beds = [
      { id: 'b1', name: 'A01', adopter: '张三' },
      { id: 'b2', name: 'A02', adopter: '李四' }
    ];

    it('filterHarvestsByRange 按日期筛选', () => {
      const result = filterHarvestsByRange(harvests, '2025-06-11', '2025-06-13');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('h2');
    });

    it('filterHarvestsByBed 按菜畦筛选', () => {
      expect(filterHarvestsByBed(harvests, 'A01')).toHaveLength(2);
    });

    it('filterHarvestsByCrop 按作物筛选', () => {
      expect(filterHarvestsByCrop(harvests, '番茄')).toHaveLength(1);
    });

    it('getUniqueBeds / getUniqueCrops', () => {
      expect(getUniqueBeds(harvests)).toEqual(['A01', 'A02']);
      const crops = getUniqueCrops(harvests);
      expect(crops).toHaveLength(3);
      expect(crops).toContain('番茄');
      expect(crops).toContain('生菜');
      expect(crops).toContain('黄瓜');
    });

    it('groupHarvestsByBed / groupHarvestsByCrop', () => {
      const byBed = groupHarvestsByBed(harvests);
      expect(byBed['A01']).toHaveLength(2);
      const byCrop = groupHarvestsByCrop(harvests);
      expect(byCrop['番茄']).toHaveLength(1);
    });

    it('groupHarvestsByAdopter 按认养人分组', () => {
      const byAdopter = groupHarvestsByAdopter(harvests, beds);
      expect(byAdopter['张三']).toHaveLength(2);
      expect(byAdopter['李四']).toHaveLength(1);
    });

    it('splitHarvestByDateRange 分割范围内外', () => {
      const { inRange, outside } = splitHarvestByDateRange(harvests, '2025-06-10', '2025-06-12');
      expect(inRange).toHaveLength(2);
      expect(outside).toHaveLength(1);
    });
  });

  describe('getQueueStatusWithFulfillment', () => {
    it('组合队列和履约状态', () => {
      const harvest = {
        id: 'h1', weight: '1kg', date: iso(0),
        distribution: { selfPickup: '500g', selfPickupTaken: '200g' }
      };
      const status = getQueueStatusWithFulfillment(harvest);
      expect(status.fulfillmentKey).toBe(FULFILLMENT_STATUS.PARTIAL);
      expect(status.partialTaken).toBe(200);
    });
  });
});
