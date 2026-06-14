import React, { useState, useMemo, useEffect } from 'react';
import {
  ListTodo, Filter, CalendarDays, Bell, CheckCircle2,
  Package, AlertCircle, Clock, MessageCircle, ChevronDown, X,
  Truck, RefreshCw, Scissors, AlertTriangle, Lock, User,
  Archive
} from 'lucide-react';
import {
  QUEUE_STATUS,
  getQueueStatus,
  getQueueStats,
  getQueueHarvests,
  filterHarvestsByRange,
  filterHarvestsByBed,
  filterHarvestsByCrop,
  getUniqueBeds,
  getUniqueCrops,
  getThisWeekRange,
  parseWeight,
  formatWeight,
  isValidWeightFormat,
  getDistributionTotal,
  getDistributionRemaining,
  getPickupStatus,
  getSelfPickupGrams,
  getSelfPickupTakenGrams,
  getSelfPickupRemainingGrams,
  getFulfillmentStatus,
  getFulfillmentSummary,
  checkPickupNoticeExists,
  findRelatedPickupNotice,
  getAllPickupNotices,
  getMissingContactInfo,
  splitHarvestByDateRange,
  groupHarvestsByAdopter,
  groupHarvestsByBed,
  groupHarvestsByCrop,
  DISTRIBUTION_TYPES,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  PICKUP_REISSUE_GRACE_DAYS,
  FULFILLMENT_STATUS
} from '../utils/distribution';
import { useDistributionOperations } from '../hooks/useDistributionOperations';
import { isHarvestArchived } from '../utils/archive';

export function HarvestQueue({
  harvests,
  beds,
  contacts,
  setContacts,
  setHarvests,
  onOpenDistribution,
  onArchiveHarvest,
  initialQueueKey = '',
  initialStartDate = '',
  initialEndDate = '',
  queueRequestId = 0
}) {
  const [activeQueueKey, setActiveQueueKey] = useState(initialQueueKey || '');
  const [bedFilter, setBedFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [showFilters, setShowFilters] = useState(false);
  const [partialPickupHarvestId, setPartialPickupHarvestId] = useState(null);
  const [partialPickupWeight, setPartialPickupWeight] = useState('');
  const [groupBy, setGroupBy] = useState('none');

  const {
    sendPickupNotice,
    reissuePickupNotice,
    confirmPickup,
    recordPartialPickup,
    canSendPickupNotice,
    canReissuePickupNotice,
    canConfirmPickup,
    canRecordPartialPickup
  } = useDistributionOperations({
    harvests,
    setHarvests,
    contacts,
    setContacts,
    beds
  });

  useEffect(() => {
    if (initialQueueKey !== undefined && initialQueueKey !== null) {
      setActiveQueueKey(initialQueueKey);
    }
  }, [initialQueueKey, queueRequestId]);

  useEffect(() => {
    if (initialStartDate !== undefined && initialStartDate !== null) {
      setStartDate(initialStartDate);
    }
    if (initialEndDate !== undefined && initialEndDate !== null) {
      setEndDate(initialEndDate);
    }
  }, [initialStartDate, initialEndDate, queueRequestId]);

  const allQueueStats = useMemo(() => getQueueStats(harvests), [harvests]);
  const fulfillmentSummary = useMemo(() => getFulfillmentSummary(harvests), [harvests]);
  const weekRange = useMemo(() => getThisWeekRange(), []);
  const uniqueBeds = useMemo(() => getUniqueBeds(harvests), [harvests]);
  const uniqueCrops = useMemo(() => getUniqueCrops(harvests), [harvests]);

  const groupedHarvests = useMemo(() => {
    if (groupBy === 'adopter') {
      return groupHarvestsByAdopter(baseFilteredHarvests, beds);
    } else if (groupBy === 'bed') {
      return groupHarvestsByBed(baseFilteredHarvests);
    } else if (groupBy === 'crop') {
      return groupHarvestsByCrop(baseFilteredHarvests);
    }
    return null;
  }, [baseFilteredHarvests, groupBy, beds]);

  const baseFilteredHarvests = useMemo(() => {
    let result = [...harvests];
    result = filterHarvestsByBed(result, bedFilter);
    result = filterHarvestsByCrop(result, cropFilter);
    result = filterHarvestsByRange(result, startDate, endDate);
    return result;
  }, [harvests, bedFilter, cropFilter, startDate, endDate]);

  const queueStats = useMemo(() => getQueueStats(baseFilteredHarvests), [baseFilteredHarvests]);

  const filteredHarvests = useMemo(() => {
    let result = [...baseFilteredHarvests];
    result = getQueueHarvests(result, activeQueueKey);
    return result.sort((a, b) => {
      const statusA = getQueueStatus(a);
      const statusB = getQueueStatus(b);
      if (statusA.priority !== statusB.priority) {
        return statusA.priority - statusB.priority;
      }
      return new Date(b.date) - new Date(a.date);
    });
  }, [baseFilteredHarvests, activeQueueKey]);

  const handlePartialPickup = (harvestId) => {
    if (recordPartialPickup(harvestId, partialPickupWeight)) {
      setPartialPickupHarvestId(null);
      setPartialPickupWeight('');
    }
  };

  const setThisWeekRange = () => {
    setStartDate(weekRange.start);
    setEndDate(weekRange.end);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const clearAllFilters = () => {
    setActiveQueueKey('');
    setBedFilter('');
    setCropFilter('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = bedFilter || cropFilter || startDate || endDate || activeQueueKey;

  const queueTabs = [
    { key: '', label: '全部待处理', count: queueStats.unassigned + queueStats.partial + queueStats.pendingPickup + queueStats.overduePickup },
    ...QUEUE_STATUS.filter(s => s.key !== 'completed').map(s => ({
      key: s.key,
      label: s.label,
      count: queueStats[`${s.key}`] || 0
    }))
  ];

  const getQueueTabColor = (key) => {
    if (!key) return '#2f613a';
    const status = QUEUE_STATUS.find(s => s.key === key);
    return status ? status.color : '#2f613a';
  };

  const renderQueueCard = (harvest) => {
    const queueStatus = getQueueStatus(harvest);
    const pickupStatus = getPickupStatus(harvest);
    const fulfillment = getFulfillmentStatus(harvest);
    const totalGrams = parseWeight(harvest.weight);
    const distributedGrams = getDistributionTotal(harvest.distribution);
    const remainingGrams = getDistributionRemaining(harvest);
    const progress = totalGrams > 0 ? Math.min(100, (distributedGrams / totalGrams) * 100) : 0;
    const selfPickupGrams = getSelfPickupGrams(harvest.distribution);
    const selfPickupTaken = getSelfPickupTakenGrams(harvest.distribution);
    const selfPickupRemaining = getSelfPickupRemainingGrams(harvest.distribution);
    const noticeSent = checkPickupNoticeExists(contacts, harvest.id);
    const relatedNotice = findRelatedPickupNotice(contacts, harvest.id);
    const allNotices = getAllPickupNotices(contacts, harvest.id);
    const missingContact = getMissingContactInfo(harvest, beds);
    const daysSinceHarvest = Math.floor((new Date() - new Date(harvest.date)) / 86400000);
    const isArchived = harvest.archived;

    return (
      <article
        key={harvest.id}
        className={`queueCard queue-${queueStatus.key} ${isArchived ? 'archived' : ''}`}
      >
        <div className="queueCardHeader">
          <div className="queueCardMain">
            <div className="queueCardTitle">
              <strong>{harvest.crop}</strong>
              <span className="queueCardWeight">{harvest.weight}</span>
              {isArchived && (
                <span style={{
                  display: 'inline-block',
                  padding: '2px 6px',
                  background: '#e8e8e8',
                  color: '#666',
                  fontSize: '11px',
                  borderRadius: '4px',
                  marginLeft: '6px'
                }}>
                  <Lock size={10} style={{ verticalAlign: 'middle' }} /> 已归档
                </span>
              )}
              <span
                className="queueCardBadge"
                style={{ background: `${queueStatus.color}15`, color: queueStatus.color }}
              >
                {queueStatus.key === 'unassigned' && <AlertCircle size={12} />}
                {queueStatus.key === 'partial' && <Clock size={12} />}
                {queueStatus.key === 'pendingPickup' && <Bell size={12} />}
                {queueStatus.key === 'overduePickup' && <AlertCircle size={12} />}
                {queueStatus.label}
              </span>
              <span
                className="queueCardBadge"
                style={{
                  background: fulfillment.key === FULFILLMENT_STATUS.COMPLETED ? '#e8f5e8' :
                             fulfillment.key === FULFILLMENT_STATUS.PARTIAL ? '#fef5e8' :
                             fulfillment.key === FULFILLMENT_STATUS.ARCHIVED ? '#e8e8e8' : '#e8f0fa',
                  color: fulfillment.key === FULFILLMENT_STATUS.COMPLETED ? '#2f613a' :
                         fulfillment.key === FULFILLMENT_STATUS.PARTIAL ? '#8a6a2c' :
                         fulfillment.key === FULFILLMENT_STATUS.ARCHIVED ? '#666' : '#2c5f8a'
                }}
              >
                <Truck size={12} /> {fulfillment.label}
              </span>
              {queueStatus.distributionOverdue && queueStatus.key !== 'pendingPickup' && queueStatus.key !== 'overduePickup' && (
                <span className="queueOverdueBadge">
                  分配超期{daysSinceHarvest - 3}天
                </span>
              )}
              {queueStatus.pickupOverdue && (queueStatus.key === 'pendingPickup' || queueStatus.key === 'overduePickup') && (
                <span className="queueOverdueBadge">
                  超期{queueStatus.pickupDaysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天未取
                </span>
              )}
            </div>
            <span className="queueCardBed">
              {harvest.bed}
            </span>
          </div>
          <div className="queueCardMeta">
            <span className="queueCardDate">
              <CalendarDays size={12} />
              {harvest.date}
            </span>
            <span className="queueDaysSince">
              采摘{daysSinceHarvest}天前
            </span>
          </div>
        </div>

        <div className="queueCardBody">
          <div className="queueProgressSection">
            <div className="queueProgressHeader">
              <span>
                已分配 <strong style={{ color: '#2f613a' }}>{formatWeight(distributedGrams)}</strong>
                <span style={{ color: '#87917f', fontWeight: 'normal' }}> / {formatWeight(totalGrams)}</span>
              </span>
              <span style={{ color: remainingGrams > 0 ? '#8a6a2c' : '#3d7a2c', fontWeight: '600' }}>
                {remainingGrams > 0 ? `剩余 ${formatWeight(remainingGrams)}` : '✓ 完成'}
              </span>
            </div>
            <div className="queueProgressBar">
              <div
                className="queueProgressFill"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${queueStatus.color}, ${queueStatus.color}dd)`
                }}
              />
            </div>
          </div>

          {harvest.distribution && (
            <div className="queueDistributionSummary">
              {DISTRIBUTION_TYPES.map((t) => {
                const val = harvest.distribution[t.key];
                if (!val) return null;
                return (
                  <span key={t.key} className="queueDistTag" style={{ borderLeft: `3px solid ${t.color}` }}>
                    {t.label}: {val}
                  </span>
                );
              })}
            </div>
          )}

          {selfPickupGrams > 0 && (
            <div className="queuePickupInfo">
              <span className="queuePickupWeight">
                <User size={12} style={{ verticalAlign: 'middle' }} />
                自取：已取 <strong style={{ color: '#2c5f8a' }}>{formatWeight(selfPickupTaken)}</strong>
                <span style={{ color: '#87917f' }}> / {formatWeight(selfPickupGrams)}</span>
                {selfPickupRemaining > 0 && (
                  <span style={{ marginLeft: '8px', color: '#8a6a2c' }}>
                    待取 {formatWeight(selfPickupRemaining)}
                  </span>
                )}
              </span>
              {allNotices.length > 0 && (
                <span className="queueNoticeInfo">
                  <MessageCircle size={12} />
                  已发送 {allNotices.length} 次通知
                  {allNotices.length > 0 && `，最近：${allNotices[0].date}`}
                </span>
              )}
              {allNotices.length === 0 && (
                <span className="queueNoticeInfo queueNoticeMissing" style={{ color: '#8a6a2c' }}>
                  <Bell size={12} />
                  尚未发送取菜通知
                </span>
              )}
              {missingContact.length > 0 && (
                <span style={{ fontSize: '11px', color: '#b04a2a', marginTop: '4px', display: 'block' }}>
                  <AlertTriangle size={10} style={{ verticalAlign: 'middle' }} />
                  缺少联系人信息：{missingContact.join('、')}
                </span>
              )}
              {pickupStatus.key === 'pending' && !pickupStatus.isOverdue && (
                <span style={{ color: '#5a7a9a', fontSize: '11px' }}>
                  {PICKUP_CONFIRM_OVERDUE_DAYS - queueStatus.pickupDaysSince}天后超期
                </span>
              )}
            </div>
          )}

          {fulfillment.key === FULFILLMENT_STATUS.PARTIAL && !isArchived && partialPickupHarvestId === harvest.id && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#fefbf0',
              borderRadius: '8px',
              border: '1px solid #f0e0c0'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#8a6a2c', marginBottom: '8px' }}>
                <Scissors size={14} style={{ verticalAlign: 'middle' }} /> 登记本次取走
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="本次取走重量（如 500g 或 0.5kg）"
                  value={partialPickupWeight}
                  onChange={(e) => setPartialPickupWeight(e.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '6px 10px',
                    border: '1px solid #d0c0a0',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  className="miniBtn"
                  style={{ background: '#8a6a2c', color: '#fff', borderColor: '#8a6a2c' }}
                  onClick={() => handlePartialPickup(harvest.id)}
                  disabled={!canRecordPartialPickup(harvest, partialPickupWeight)}
                >
                  登记
                </button>
                <button
                  type="button"
                  className="miniBtn"
                  onClick={() => {
                    setPartialPickupHarvestId(null);
                    setPartialPickupWeight('');
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {harvest.note && (
            <p className="queueCardNote">📝 {harvest.note}</p>
          )}
        </div>

        <div className="queueCardActions">
          {(queueStatus.key === 'pendingPickup' || queueStatus.key === 'overduePickup') && !isArchived && (
            <>
              {canSendPickupNotice(harvest) && (
                <button
                  type="button"
                  className={`miniBtn ${queueStatus.key === 'overduePickup' ? 'queueActionOverdue' : 'queueActionNotice'}`}
                  onClick={() => sendPickupNotice(harvest.id)}
                >
                  <Bell size={12} />
                  发送取菜通知
                </button>
              )}
              {canReissuePickupNotice(harvest) && (
                <button
                  type="button"
                  className="miniBtn"
                  style={{ background: '#fef5e8', color: '#8a6a2c', borderColor: '#e0c080' }}
                  onClick={() => reissuePickupNotice(harvest.id)}
                >
                  <RefreshCw size={12} />
                  补发通知
                </button>
              )}
              {noticeSent && !canReissuePickupNotice(harvest) && (
                <span style={{ fontSize: '12px', color: '#8a7a6a' }}>
                  {PICKUP_REISSUE_GRACE_DAYS}天内请勿重复通知
                </span>
              )}
              {canConfirmPickup(harvest) && (
                <button
                  type="button"
                  className={`miniBtn ${queueStatus.key === 'overduePickup' ? 'queueActionOverdue' : 'queueActionConfirm'}`}
                  onClick={() => confirmPickup(harvest.id)}
                >
                  <CheckCircle2 size={12} />
                  {queueStatus.key === 'overduePickup' ? '标记全部已取' : '确认全部取走'}
                </button>
              )}
            </>
          )}
          {fulfillment.key === FULFILLMENT_STATUS.PARTIAL && !isArchived && partialPickupHarvestId !== harvest.id && (
            <button
              type="button"
              className="miniBtn"
              style={{ background: '#fefbf0', color: '#8a6a2c', borderColor: '#f0e0c0' }}
              onClick={() => {
                setPartialPickupHarvestId(harvest.id);
                setPartialPickupWeight('');
              }}
            >
              <Scissors size={12} />
              登记部分取走
            </button>
          )}
          {!isArchived && fulfillment.key === FULFILLMENT_STATUS.COMPLETED && onArchiveHarvest && (
            <button
              type="button"
              className="miniBtn"
              onClick={() => onArchiveHarvest(harvest.id)}
              style={{ background: '#e8e8f0', color: '#445', borderColor: '#c0c0d0' }}
            >
              <Archive size={12} />
              归档
            </button>
          )}
          {!isArchived && (
            <button
              type="button"
              className="miniBtn queueActionDistribute"
              onClick={() => onOpenDistribution && onOpenDistribution(harvest)}
            >
              <Package size={12} />
              {harvest.distribution ? '编辑分配' : '登记分配'}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="harvestQueueContainer">
      <div className="queueHeader">
        <div className="queueTitle">
          <h2><ListTodo size={18} />采收处理队列</h2>
          <span className="queueCountBadge">
            共 {filteredHarvests.length} 条
          </span>
        </div>
        <div className="queueHeaderActions">
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginRight: '8px' }}>
            <span style={{ fontSize: '12px', color: '#71806a', marginRight: '4px' }}>分组：</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="filterSelect"
              style={{ fontSize: '12px', padding: '4px 8px', height: 'auto' }}
            >
              <option value="none">不分组</option>
              <option value="adopter">按认养人</option>
              <option value="bed">按菜畦</option>
              <option value="crop">按作物</option>
            </select>
          </div>
          <button
            type="button"
            className="miniBtn"
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: showFilters ? '#eef5e9' : '#fff', color: '#55624e', borderColor: '#cdd8c3' }}
          >
            <Filter size={12} />
            筛选
            {showFilters ? <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={12} />}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="miniBtn clearBtn"
              onClick={clearAllFilters}
            >
              <X size={12} />清除筛选
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="queueFilters">
          <div className="filterRow">
            <label>
              <span className="filterLabel">菜畦</span>
              <select
                value={bedFilter}
                onChange={(e) => setBedFilter(e.target.value)}
              >
                <option value="">全部菜畦</option>
                {uniqueBeds.map(bed => (
                  <option key={bed} value={bed}>{bed}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="filterLabel">作物</span>
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
              >
                <option value="">全部作物</option>
                {uniqueCrops.map(crop => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="filterLabel">开始日期</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              <span className="filterLabel">结束日期</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <div className="quickDateButtons">
              <button
                type="button"
                className="miniBtn"
                onClick={setThisWeekRange}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                <CalendarDays size={12} />本周
              </button>
              <button
                type="button"
                className="miniBtn clearBtn"
                onClick={clearDateRange}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                清除日期
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="queueStatsStrip">
        {QUEUE_STATUS.filter(s => s.key !== 'completed').map((status) => {
          const count = queueStats[status.key] || 0;
          const weightKey = `${status.key}Weight`;
          const weight = queueStats[weightKey] || 0;
          return (
            <div
              key={status.key}
              className="queueStatItem"
              style={{ borderLeft: `3px solid ${status.color}` }}
            >
              <span className="queueStatLabel" style={{ color: status.color }}>
                {status.label}
              </span>
              <strong className="queueStatValue" style={{ color: status.color }}>
                {count}
              </strong>
              {weight > 0 && (
                <span className="queueStatWeight">{formatWeight(weight)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="queueStatsStrip" style={{ marginTop: '8px', background: '#f7faf4' }}>
        <div
          className="queueStatItem"
          style={{ borderLeft: '3px solid #2c5f8a' }}
        >
          <span className="queueStatLabel" style={{ color: '#2c5f8a' }}>
            <Truck size={12} /> 履约中
          </span>
          <strong className="queueStatValue" style={{ color: '#2c5f8a' }}>
            {fulfillmentSummary.pending || 0}
          </strong>
          {fulfillmentSummary.pendingWeight > 0 && (
            <span className="queueStatWeight">{formatWeight(fulfillmentSummary.pendingWeight)}</span>
          )}
        </div>
        <div
          className="queueStatItem"
          style={{ borderLeft: '3px solid #8a6a2c' }}
        >
          <span className="queueStatLabel" style={{ color: '#8a6a2c' }}>
            <Scissors size={12} /> 部分取走
          </span>
          <strong className="queueStatValue" style={{ color: '#8a6a2c' }}>
            {fulfillmentSummary.partial || 0}
          </strong>
          {fulfillmentSummary.partialWeight > 0 && (
            <span className="queueStatWeight">{formatWeight(fulfillmentSummary.partialWeight)}</span>
          )}
        </div>
        <div
          className="queueStatItem"
          style={{ borderLeft: '3px solid #2f613a' }}
        >
          <span className="queueStatLabel" style={{ color: '#2f613a' }}>
            <CheckCircle2 size={12} /> 履约完成
          </span>
          <strong className="queueStatValue" style={{ color: '#2f613a' }}>
            {fulfillmentSummary.completed || 0}
          </strong>
          {fulfillmentSummary.completedWeight > 0 && (
            <span className="queueStatWeight">{formatWeight(fulfillmentSummary.completedWeight)}</span>
          )}
        </div>
      </div>

      <div className="queueTabs">
        {queueTabs.map((tab) => {
          const color = getQueueTabColor(tab.key);
          const isActive = activeQueueKey === tab.key;
          return (
            <button
              key={tab.key || 'all'}
              type="button"
              className={`queueTab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveQueueKey(tab.key)}
              style={{
                borderBottomColor: isActive ? color : 'transparent',
                color: isActive ? color : undefined,
                background: isActive ? '#fff' : undefined
              }}
            >
              {tab.label}
              <span
                className="queueTabCount"
                style={{
                  background: isActive ? `${color}15` : '#eef2eb',
                  color: isActive ? color : '#71806a'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredHarvests.length === 0 ? (
        <div className="emptyState">
          <Package size={36} />
          <p>暂无符合条件的采收记录</p>
          <p className="muted">调整筛选条件或添加新的采摘记录</p>
        </div>
      ) : (
        <div className="queueList">
          {groupedHarvests ? (
            Object.entries(groupedHarvests).map(([groupKey, groupData]) => (
              <div key={groupKey} className="queueGroup">
                <div className="queueGroupHeader">
                  <strong>{groupKey || '未分组'}</strong>
                  <span style={{ fontSize: '12px', color: '#71806a' }}>
                    {groupData.harvests.length} 条 · {formatWeight(groupData.totalWeight)}
                  </span>
                </div>
                <div className="queueGroupItems">
                  {groupData.harvests.map((harvest) => renderQueueCard(harvest))}
                </div>
              </div>
            ))
          ) : (
            filteredHarvests.map((harvest) => renderQueueCard(harvest))
          )}
        </div>
      )}

    </div>
  );
}
