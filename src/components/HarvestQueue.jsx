import React, { useState, useMemo } from 'react';
import {
  ListTodo, Filter, CalendarDays, Bell, CheckCircle2,
  Package, AlertCircle, Clock, MessageCircle, ChevronDown, X
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
  getDistributionTotal,
  getDistributionRemaining,
  getPickupStatus,
  getSelfPickupGrams,
  generatePickupNoticeContact,
  confirmPickupContact,
  checkPickupNoticeExists,
  findRelatedPickupNotice,
  DISTRIBUTION_TYPES,
  PICKUP_CONFIRM_OVERDUE_DAYS
} from '../utils/distribution';

export function HarvestQueue({
  harvests,
  beds,
  contacts,
  setContacts,
  setHarvests,
  onOpenDistribution,
  initialQueueKey = '',
  initialStartDate = '',
  initialEndDate = ''
}) {
  const [activeQueueKey, setActiveQueueKey] = useState(initialQueueKey || '');
  const [bedFilter, setBedFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [showFilters, setShowFilters] = useState(false);

  const queueStats = useMemo(() => getQueueStats(harvests), [harvests]);
  const weekRange = useMemo(() => getThisWeekRange(), []);
  const uniqueBeds = useMemo(() => getUniqueBeds(harvests), [harvests]);
  const uniqueCrops = useMemo(() => getUniqueCrops(harvests), [harvests]);

  const filteredHarvests = useMemo(() => {
    let result = [...harvests];
    result = getQueueHarvests(result, activeQueueKey);
    result = filterHarvestsByBed(result, bedFilter);
    result = filterHarvestsByCrop(result, cropFilter);
    result = filterHarvestsByRange(result, startDate, endDate);
    return result.sort((a, b) => {
      const statusA = getQueueStatus(a);
      const statusB = getQueueStatus(b);
      if (statusA.priority !== statusB.priority) {
        return statusA.priority - statusB.priority;
      }
      return new Date(b.date) - new Date(a.date);
    });
  }, [harvests, activeQueueKey, bedFilter, cropFilter, startDate, endDate]);

  const generatePickupNotice = (harvestId) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest || !harvest.distribution?.selfPickup) return;
    if (checkPickupNoticeExists(contacts, harvestId)) return;
    const contact = generatePickupNoticeContact(harvest, beds);
    if (contact) {
      setContacts([contact, ...contacts]);
    }
  };

  const confirmPickup = (harvestId) => {
    setHarvests(harvests.map((h) => {
      if (h.id !== harvestId) return h;
      if (!h.distribution || !h.distribution.selfPickup) return h;
      return {
        ...h,
        distribution: {
          ...h.distribution,
          selfPickupConfirmedAt: new Date().toISOString().slice(0, 10)
        }
      };
    }));
    if (checkPickupNoticeExists(contacts, harvestId)) {
      setContacts(confirmPickupContact(contacts, harvestId));
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
          {filteredHarvests.map((harvest) => {
            const queueStatus = getQueueStatus(harvest);
            const pickupStatus = getPickupStatus(harvest);
            const totalGrams = parseWeight(harvest.weight);
            const distributedGrams = getDistributionTotal(harvest.distribution);
            const remainingGrams = getDistributionRemaining(harvest);
            const progress = totalGrams > 0 ? Math.min(100, (distributedGrams / totalGrams) * 100) : 0;
            const selfPickupGrams = getSelfPickupGrams(harvest.distribution);
            const noticeSent = checkPickupNoticeExists(contacts, harvest.id);
            const relatedNotice = findRelatedPickupNotice(contacts, harvest.id);
            const daysSinceHarvest = Math.floor((new Date() - new Date(harvest.date)) / 86400000);

            return (
              <article
                key={harvest.id}
                className={`queueCard queue-${queueStatus.key}`}
              >
                <div className="queueCardHeader">
                  <div className="queueCardMain">
                    <div className="queueCardTitle">
                      <strong>{harvest.crop}</strong>
                      <span className="queueCardWeight">{harvest.weight}</span>
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
                        认养人自取：{formatWeight(selfPickupGrams)}
                      </span>
                      {relatedNotice ? (
                        <span className="queueNoticeInfo">
                          <MessageCircle size={12} />
                          通知已发送：{relatedNotice.date} {relatedNotice.time}
                        </span>
                      ) : (
                        <span className="queueNoticeInfo queueNoticeMissing" style={{ color: '#8a6a2c' }}>
                          <Bell size={12} />
                          尚未发送取菜通知
                        </span>
                      )}
                      {pickupStatus.key === 'pending' && !pickupStatus.isOverdue && (
                        <span style={{ color: '#5a7a9a', fontSize: '11px' }}>
                          {PICKUP_CONFIRM_OVERDUE_DAYS - queueStatus.pickupDaysSince}天后超期
                        </span>
                      )}
                    </div>
                  )}

                  {harvest.note && (
                    <p className="queueCardNote">📝 {harvest.note}</p>
                  )}
                </div>

                <div className="queueCardActions">
                  {(queueStatus.key === 'pendingPickup' || queueStatus.key === 'overduePickup') && (
                    <>
                      {!noticeSent && (
                        <button
                          type="button"
                          className={`miniBtn ${queueStatus.key === 'overduePickup' ? 'queueActionOverdue' : 'queueActionNotice'}`}
                          onClick={() => generatePickupNotice(harvest.id)}
                        >
                          <Bell size={12} />
                          发送取菜通知
                        </button>
                      )}
                      <button
                        type="button"
                        className={`miniBtn ${queueStatus.key === 'overduePickup' ? 'queueActionOverdue' : 'queueActionConfirm'}`}
                        onClick={() => confirmPickup(harvest.id)}
                      >
                        <CheckCircle2 size={12} />
                        {queueStatus.key === 'overduePickup' ? '标记已取' : '确认取菜'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="miniBtn queueActionDistribute"
                    onClick={() => onOpenDistribution && onOpenDistribution(harvest)}
                  >
                    <Package size={12} />
                    {harvest.distribution ? '编辑分配' : '登记分配'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
