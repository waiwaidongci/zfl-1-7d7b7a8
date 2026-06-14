import React, { useState, useMemo, useEffect } from 'react';
import {
  Wheat, Search, AlertCircle, CheckCircle2, Clock, Package,
  User, Users, Heart, Trash2, Filter, CalendarDays, Bell, MessageCircle,
  ListTodo, LayoutList, Scissors, Truck, RefreshCw, AlertTriangle,
  Archive, Lock
} from 'lucide-react';
import { DistributionModal } from './DistributionModal';
import { HarvestQueue } from './HarvestQueue';
import {
  DISTRIBUTION_TYPES,
  DISTRIBUTION_OVERDUE_DAYS,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  PICKUP_REISSUE_GRACE_DAYS,
  FULFILLMENT_STATUS,
  parseWeight,
  formatWeight,
  isValidWeightFormat,
  getDistributionTotal,
  getDistributionStatus,
  getDistributionStats,
  getDistributionRemaining,
  getPickupStatus,
  getPickupStats,
  getPickupWarnings,
  checkPickupNoticeExists,
  findRelatedPickupNotice,
  getAllPickupNotices,
  canReissuePickupNotice,
  getQueueStats,
  getThisWeekRange,
  buildInitialDistribution,
  getFulfillmentStatus,
  getFulfillmentSummary,
  validateDistributionWithPartial,
  hasCompleteContactInfo,
  getMissingContactInfo,
  getSelfPickupTakenGrams,
  getSelfPickupRemainingGrams,
  splitHarvestByDateRange,
  groupHarvestsByAdopter,
  groupHarvestsByBed,
  groupHarvestsByCrop
} from '../utils/distribution';
import { useDistributionOperations } from '../hooks/useDistributionOperations';
import { isHarvestArchived, canModifyArchivedHarvest } from '../utils/archive';

const typeIcons = {
  selfPickup: User,
  communityShare: Users,
  volunteerSample: Heart,
  loss: Trash2
};

export function DistributionTab({
  harvests, setHarvests, harvestOptions, harvestForm, setHarvestForm, addHarvest,
  beds, contacts, setContacts,
  materials, harvestConsumptions, setHarvestConsumptions, renderConsumptionSuggestions,
  initialView = 'list', initialQueueKey = '', initialStartDate = '', initialEndDate = '',
  queueRequestId = 0,
  onArchiveHarvest
}) {
  const [editingHarvest, setEditingHarvest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [currentView, setCurrentView] = useState(initialView);
  const [showAdvancedSplit, setShowAdvancedSplit] = useState(false);
  const [splitMethod, setSplitMethod] = useState('simple');
  const [partialPickupWeight, setPartialPickupWeight] = useState('');

  const {
    sendPickupNotice,
    reissuePickupNotice,
    confirmPickup,
    recordPartialPickup,
    saveDistribution,
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
    if (queueRequestId > 0 && initialView) {
      setCurrentView(initialView);
    }
  }, [queueRequestId, initialView]);

  const stats = useMemo(() => getDistributionStats(harvests), [harvests]);
  const pickupStats = useMemo(() => getPickupStats(harvests), [harvests]);
  const pickupWarnings = useMemo(() => getPickupWarnings(harvests), [harvests]);
  const fulfillmentSummary = useMemo(() => getFulfillmentSummary(harvests), [harvests]);

  const handlePartialPickup = (harvestId, takenWeightStr) => {
    if (recordPartialPickup(harvestId, takenWeightStr)) {
      setPartialPickupWeight('');
    }
  };

  const applyQuickSplit = (harvestId, splitType) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest) return;
    const distribution = buildInitialDistribution(harvest, beds, {
      defaultSelfPickupRatio: splitType === 'all_self' ? 1 : splitType === 'half_community' ? 0.5 : 0.7
    });
    if (distribution.error) return;
    saveDistribution(harvestId, distribution);
  };

  const addHarvestWithDistribution = (e) => {
    e.preventDefault();
    const harvest = addHarvest(e, true);
    if (harvest && showAdvancedSplit) {
      const distribution = buildInitialDistribution(harvest, beds, {});
      if (!distribution.error) {
        setHarvests(prev => prev.map(h =>
          h.id === harvest.id ? { ...h, distribution } : h
        ));
      }
    }
  };

  const filteredHarvests = useMemo(() => {
    let result = [...harvests];
    if (query.trim()) {
      const q = query.trim();
      result = result.filter((h) =>
        `${h.bed}${h.crop}${h.weight}${h.note}`.includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((h) => getDistributionStatus(h).key === statusFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [harvests, query, statusFilter]);

  const handleSaveDistribution = (harvestId, distribution) => {
    saveDistribution(harvestId, distribution);
    setEditingHarvest(null);
  };

  const openDistribution = (harvest) => {
    setEditingHarvest(harvest);
  };

  if (currentView === 'queue') {
    return (
      <>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="miniBtn"
            onClick={() => setCurrentView('list')}
            style={{ background: '#fff', color: '#55624e', borderColor: '#cdd8c3' }}
          >
            <LayoutList size={14} />列表视图
          </button>
          <button
            type="button"
            className="miniBtn"
            style={{ background: '#eef5e9', color: '#2f613a', borderColor: '#a0d0a0' }}
          >
            <ListTodo size={14} />采收队列
          </button>
        </div>
        <HarvestQueue
          harvests={harvests}
          beds={beds}
          contacts={contacts}
          setContacts={setContacts}
          setHarvests={setHarvests}
          onOpenDistribution={openDistribution}
          onArchiveHarvest={onArchiveHarvest}
          initialQueueKey={initialQueueKey}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          queueRequestId={queueRequestId}
        />
        {editingHarvest && (
          <DistributionModal
            harvest={editingHarvest}
            onClose={() => setEditingHarvest(null)}
            onSave={(dist) => handleSaveDistribution(editingHarvest.id, dist)}
            onConfirmPickup={() => {
              confirmPickup(editingHarvest.id);
              setEditingHarvest(null);
            }}
            beds={beds}
            contacts={contacts}
            setContacts={setContacts}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="dashboard">
        <article>
          <h2>待分配</h2>
          <p className="statNumber" style={{ color: stats.unassigned > 0 ? '#8a2c2c' : '#2f613a' }}>
            {stats.unassigned}<span>批</span>
          </p>
        </article>
        <article>
          <h2>履约中</h2>
          <p className="statNumber" style={{ color: fulfillmentSummary.pending > 0 ? '#2c5f8a' : '#2f613a' }}>
            {fulfillmentSummary.pending}<span>批</span>
          </p>
          {fulfillmentSummary.pendingWeight > 0 && (
            <p className="statSub">{formatWeight(fulfillmentSummary.pendingWeight)}</p>
          )}
        </article>
        <article>
          <h2>部分取走</h2>
          <p className="statNumber" style={{ color: fulfillmentSummary.partial > 0 ? '#8a6a2c' : '#2f613a' }}>
            {fulfillmentSummary.partial}<span>批</span>
          </p>
          {fulfillmentSummary.partialWeight > 0 && (
            <p className="statSub">{formatWeight(fulfillmentSummary.partialWeight)}</p>
          )}
        </article>
        <article>
          <h2>待取菜</h2>
          <p className="statNumber" style={{ color: pickupStats.pending > 0 ? '#2c5f8a' : '#2f613a' }}>
            {pickupStats.pending}<span>批</span>
          </p>
          {pickupStats.pendingWeight > 0 && (
            <p className="statSub">{formatWeight(pickupStats.pendingWeight)}</p>
          )}
        </article>
        <article>
          <h2>超期未取</h2>
          <p className="statNumber" style={{ color: pickupStats.overdue > 0 ? '#8b3f23' : '#2f613a' }}>
            {pickupStats.overdue}<span>批</span>
          </p>
          {pickupStats.overdueWeight > 0 && (
            <p className="statSub" style={{ color: '#8b3f23' }}>{formatWeight(pickupStats.overdueWeight)}</p>
          )}
        </article>
        <article>
          <h2>履约完成</h2>
          <p className="statNumber" style={{ color: '#2f613a' }}>
            {fulfillmentSummary.completed}<span>批</span>
          </p>
          {fulfillmentSummary.completedWeight > 0 && (
            <p className="statSub">{formatWeight(fulfillmentSummary.completedWeight)}</p>
          )}
        </article>
      </section>

      {stats.overdue > 0 && (
        <section className="inventoryWarning" style={{ background: '#fef8e8', borderColor: '#f0d6a0' }}>
          <h2 style={{ color: '#8a6a2c' }}><AlertCircle size={18} />采收分配提醒</h2>
          <div className="warningCards">
            {harvests.filter((h) => getDistributionStatus(h).isOverdue).slice(0, 4).map((h) => {
              const status = getDistributionStatus(h);
              const remaining = getDistributionRemaining(h);
              return (
                <div key={h.id} className="warningCard" style={{ background: '#fefbf0', borderColor: '#f0d6a0' }}>
                  <div className="warningInfo">
                    <strong style={{ color: '#5a4a1e' }}>{h.crop}</strong>
                    <span style={{ fontSize: '12px', color: '#8a7a4e' }}>{h.bed}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#8a6a2c' }}>
                      {status.label}
                      {remaining > 0 && ` · 剩${formatWeight(remaining)}`}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#b06a4a' }}>
                      采摘于 {h.date}
                    </span>
                    <button type="button" className="miniBtn" style={{ marginTop: '6px', marginLeft: 0 }} onClick={() => openDistribution(h)}>
                      立即处理
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pickupStats.overdue > 0 && (
        <section className="inventoryWarning" style={{ background: '#fdece4', borderColor: '#e8b0a0' }}>
          <h2 style={{ color: '#8b3f23' }}><AlertCircle size={18} />取菜超期提醒</h2>
          <div className="warningCards">
            {harvests.filter((h) => {
              const ps = getPickupStatus(h);
              return ps.key === 'pending' && ps.isOverdue;
            }).slice(0, 4).map((h) => {
              const ps = getPickupStatus(h);
              const noticeSent = checkPickupNoticeExists(contacts, h.id);
              const relatedNotice = findRelatedPickupNotice(contacts, h.id);
              return (
                <div key={h.id} className="warningCard" style={{ background: '#fef4ef', borderColor: '#e8b0a0' }}>
                  <div className="warningInfo">
                    <strong style={{ color: '#7a2a1a' }}>{h.crop}</strong>
                    <span style={{ fontSize: '12px', color: '#9a6a5a' }}>{h.bed} · 自取 {h.distribution?.selfPickup}</span>
                    {relatedNotice && (
                      <span style={{ fontSize: '11px', color: '#2c5f8a', marginTop: '2px' }}>
                        <MessageCircle size={10} /> 通知 {relatedNotice.date}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#8b3f23' }}>
                      超期{ps.daysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天未取
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#b07a5a' }}>
                      请尽快联系认养人
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {canSendPickupNotice(h.id) && (
                        <button type="button" className="miniBtn" style={{ background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }} onClick={() => sendPickupNotice(h.id)}>
                          <Bell size={12} />发送通知
                        </button>
                      )}
                      <button type="button" className="miniBtn" style={{ background: '#fde8dd', color: '#8b3f23', borderColor: '#e8b0a0' }} onClick={() => confirmPickup(h.id)}>
                        <CheckCircle2 size={12} />标记已取
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pickupStats.pending > 0 && pickupStats.overdue === 0 && (
        <section className="inventoryWarning" style={{ background: '#eaf0f7', borderColor: '#a0c0e0' }}>
          <h2 style={{ color: '#2c5f8a' }}><Clock size={18} />待取菜提醒</h2>
          <div className="warningCards">
            {harvests.filter((h) => {
              const ps = getPickupStatus(h);
              return ps.key === 'pending' && !ps.isOverdue;
            }).slice(0, 4).map((h) => {
              const ps = getPickupStatus(h);
              const noticeSent = checkPickupNoticeExists(contacts, h.id);
              const relatedNotice = findRelatedPickupNotice(contacts, h.id);
              return (
                <div key={h.id} className="warningCard" style={{ background: '#f2f7fc', borderColor: '#a0c0e0' }}>
                  <div className="warningInfo">
                    <strong style={{ color: '#1e4a6a' }}>{h.crop}</strong>
                    <span style={{ fontSize: '12px', color: '#5a7a9a' }}>{h.bed} · 自取 {h.distribution?.selfPickup}</span>
                    {relatedNotice && (
                      <span style={{ fontSize: '11px', color: '#2c5f8a', marginTop: '2px' }}>
                        <MessageCircle size={10} /> 通知 {relatedNotice.date}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c5f8a' }}>
                      {PICKUP_CONFIRM_OVERDUE_DAYS - ps.daysSince}天后超期
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#6a8aaa' }}>
                      待认养人取走
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {canSendPickupNotice(h.id) && (
                        <button type="button" className="miniBtn" style={{ marginTop: 0, marginLeft: 0, background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }} onClick={() => sendPickupNotice(h.id)}>
                          <Bell size={12} />发送通知
                        </button>
                      )}
                      <button type="button" className="miniBtn" style={{ marginTop: 0, marginLeft: 0 }} onClick={() => confirmPickup(h.id)}>
                        <CheckCircle2 size={12} />确认取菜
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="workspace">
        <form onSubmit={addHarvestWithDistribution} className="panel">
          <h2><Wheat size={18} />新增采摘记录</h2>
          <select value={harvestForm.bed} onChange={(e) => {
            const bedName = e.target.value;
            const matchedBed = beds.find(b => b.name === bedName);
            const bedCrop = matchedBed && matchedBed.crop && matchedBed.crop !== '待播种'
              ? matchedBed.crop
              : harvestForm.crop;
            setHarvestForm({ ...harvestForm, bed: bedName, crop: bedCrop });
          }}>
            <option value="">选择菜畦</option>
            {harvestOptions.map((name) => <option key={name}>{name}</option>)}
          </select>
          <input placeholder="采摘作物" value={harvestForm.crop} onChange={(e) => setHarvestForm({ ...harvestForm, crop: e.target.value })} />
          <input placeholder="重量（如 1.4kg 或 300g）" value={harvestForm.weight} onChange={(e) => setHarvestForm({ ...harvestForm, weight: e.target.value })} />
          <input type="date" value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} />
          <input placeholder="备注" value={harvestForm.note} onChange={(e) => setHarvestForm({ ...harvestForm, note: e.target.value })} />

          <div className="formSection" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e9e0' }}>
            <label className="checkboxLabel" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={showAdvancedSplit}
                onChange={(e) => setShowAdvancedSplit(e.target.checked)}
              />
              <span><Scissors size={14} /> 登记时自动拆分去向</span>
            </label>

            {showAdvancedSplit && (
              <div className="advancedSplitOptions" style={{ padding: '12px', background: '#f7faf4', borderRadius: '8px', border: '1px solid #dce5d5' }}>
                <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#55624e' }}>
                  拆分方式
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`miniBtn ${splitMethod === 'simple' ? 'active' : ''}`}
                    style={{
                      background: splitMethod === 'simple' ? '#2f613a' : '#fff',
                      color: splitMethod === 'simple' ? '#fff' : '#55624e',
                      borderColor: splitMethod === 'simple' ? '#2f613a' : '#cdd8c3'
                    }}
                    onClick={() => setSplitMethod('simple')}
                  >
                    智能分配
                  </button>
                  <button
                    type="button"
                    className={`miniBtn ${splitMethod === 'all_self' ? 'active' : ''}`}
                    style={{
                      background: splitMethod === 'all_self' ? '#2c5f8a' : '#fff',
                      color: splitMethod === 'all_self' ? '#fff' : '#55624e',
                      borderColor: splitMethod === 'all_self' ? '#2c5f8a' : '#cdd8c3'
                    }}
                    onClick={() => setSplitMethod('all_self')}
                  >
                    全部认养
                  </button>
                  <button
                    type="button"
                    className={`miniBtn ${splitMethod === 'half_community' ? 'active' : ''}`}
                    style={{
                      background: splitMethod === 'half_community' ? '#8a6a2c' : '#fff',
                      color: splitMethod === 'half_community' ? '#fff' : '#55624e',
                      borderColor: splitMethod === 'half_community' ? '#8a6a2c' : '#cdd8c3'
                    }}
                    onClick={() => setSplitMethod('half_community')}
                  >
                    半份分享
                  </button>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#71806a' }}>
                  {splitMethod === 'simple' && '按菜畦类型和历史分配模式智能拆分'}
                  {splitMethod === 'all_self' && '全部归入认养人自取'}
                  {splitMethod === 'half_community' && '50%认养自取，50%社区分享'}
                </div>
              </div>
            )}
          </div>

          {renderConsumptionSuggestions && materials && (
            <div style={{ margin: '8px 0' }}>
              {renderConsumptionSuggestions({ type: 'harvest' }, harvestConsumptions, setHarvestConsumptions)}
            </div>
          )}
          <button>保存采摘{showAdvancedSplit ? '并拆分' : ''}</button>
        </form>

        <div className="panel wide">
          <div className="toolbar">
            <h2>采收分配列表</h2>
            <div className="toolbarActions">
              <button
                type="button"
                className="miniBtn"
                onClick={() => setCurrentView('queue')}
                style={{ background: '#eef5e9', color: '#2f613a', borderColor: '#a0d0a0' }}
              >
                <ListTodo size={14} />采收队列
              </button>
              <select className="filterSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">全部状态</option>
                <option value="unassigned">未分配</option>
                <option value="partial">部分分配</option>
                <option value="completed">已完成</option>
              </select>
              <label><Search size={16} /><input placeholder="搜索菜畦/作物/重量" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
              {statusFilter && (
                <button className="clearBtn" onClick={() => setStatusFilter('')}>清除筛选</button>
              )}
            </div>
          </div>

          {filteredHarvests.length === 0 ? (
            <div className="emptyState">
              <Package size={36} />
              <p>暂无采摘记录{query || statusFilter ? '（请调整筛选条件）' : ''}</p>
              <p className="muted">添加采摘记录后可在此进行分配登记</p>
            </div>
          ) : (
            <div className="harvestList">
              {filteredHarvests.map((harvest) => {
                const status = getDistributionStatus(harvest);
                const pickup = getPickupStatus(harvest);
                const fulfillment = getFulfillmentStatus(harvest);
                const distributed = getDistributionTotal(harvest.distribution);
                const total = parseWeight(harvest.weight);
                const remaining = getDistributionRemaining(harvest);
                const progress = total > 0 ? Math.min(100, (distributed / total) * 100) : 0;
                const daysSince = Math.floor((new Date() - new Date(harvest.date)) / 86400000);
                const selfPickupTotal = parseWeight(harvest.distribution?.selfPickup) || 0;
                const selfPickupTaken = getSelfPickupTakenGrams(harvest.distribution);
                const selfPickupRemaining = getSelfPickupRemainingGrams(harvest.distribution);
                const notices = getAllPickupNotices(contacts, harvest.id);
                const canReissue = canReissuePickupNotice(contacts, harvest.id, PICKUP_REISSUE_GRACE_DAYS);
                const hasContactInfo = hasCompleteContactInfo(harvest, beds);
                const missingContact = getMissingContactInfo(harvest, beds);

                return (
                  <article key={harvest.id} className={`harvestCard ${harvest.archived ? 'archived' : ''}`}>
                    <div className="harvestHeader">
                      <div className="harvestInfo">
                        <strong>{harvest.crop} · {harvest.weight}</strong>
                        <span className="harvestBed">{harvest.bed}</span>
                        {harvest.archived && (
                          <span className="archiveBadge" style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            background: '#e8e8e8',
                            color: '#666',
                            fontSize: '11px',
                            borderRadius: '4px',
                            marginLeft: '8px'
                          }}>
                            已归档
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`distributionStatusTag ${status.key} ${status.isOverdue ? 'overdue' : ''}`}>
                          {status.isOverdue && <AlertCircle size={12} />}
                          {status.label}
                          {status.isOverdue && `（超${daysSince - DISTRIBUTION_OVERDUE_DAYS}天）`}
                        </span>
                        <span className={`fulfillmentStatusTag ${fulfillment.key}`} style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: fulfillment.key === FULFILLMENT_STATUS.COMPLETED ? '#e8f5e8' :
                                     fulfillment.key === FULFILLMENT_STATUS.PARTIAL ? '#fef5e8' :
                                     fulfillment.key === FULFILLMENT_STATUS.ARCHIVED ? '#e8e8e8' : '#e8f0fa',
                          color: fulfillment.key === FULFILLMENT_STATUS.COMPLETED ? '#2f613a' :
                                 fulfillment.key === FULFILLMENT_STATUS.PARTIAL ? '#8a6a2c' :
                                 fulfillment.key === FULFILLMENT_STATUS.ARCHIVED ? '#666' : '#2c5f8a'
                        }}>
                          <Truck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          {fulfillment.label}
                        </span>
                        {pickup.key !== 'none' && (
                          <span className={`pickupStatusTag ${pickup.key} ${pickup.isOverdue ? 'overdue' : ''}`}>
                            {pickup.key === 'confirmed' ? <CheckCircle2 size={12} /> : pickup.isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                            {pickup.label}
                            {pickup.isOverdue && `（超${pickup.daysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天）`}
                            {pickup.key === 'confirmed' && pickup.confirmedAt && ` · ${pickup.confirmedAt.slice(5)}`}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: '#71806a' }}>{harvest.date}</span>
                      </div>
                    </div>

                    <div className="harvestBody">
                      <div className="distributionProgressWrap" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                        <div className="distributionProgressHeader" style={{ fontSize: '13px' }}>
                          <span>
                            已分配 <strong style={{ color: '#2f613a' }}>{formatWeight(distributed)}</strong>
                            <span style={{ color: '#87917f', fontWeight: 'normal' }}> / {formatWeight(total)}</span>
                          </span>
                          <span style={{ color: remaining > 0 ? '#8a6a2c' : '#3d7a2c', fontWeight: '600' }}>
                            {remaining > 0 ? `剩余 ${formatWeight(remaining)}` : '✓ 完成'}
                          </span>
                        </div>
                        <div className="distributionProgressBarWrap">
                          <div
                            className={`distributionProgressBar ${distributed > total ? 'over' : ''}`}
                            style={{ width: `${Math.min(100, distributed > total ? 100 : progress)}%` }}
                          />
                        </div>
                      </div>

                      {selfPickupTotal > 0 && (
                        <div className="pickupProgressWrap" style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          background: '#f2f7fc',
                          borderRadius: '6px',
                          border: '1px solid #d0e0f0'
                        }}>
                          <div style={{ fontSize: '12px', color: '#5a7a9a', marginBottom: '4px' }}>
                            <User size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            自取进度：已取 <strong style={{ color: '#2c5f8a' }}>{formatWeight(selfPickupTaken)}</strong>
                            <span style={{ color: '#87917f' }}> / {formatWeight(selfPickupTotal)}</span>
                            {selfPickupRemaining > 0 && (
                              <span style={{ marginLeft: '8px', color: '#8a6a2c' }}>
                                待取 {formatWeight(selfPickupRemaining)}
                              </span>
                            )}
                          </div>
                          {notices.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#6a8aaa', marginTop: '4px' }}>
                              <Bell size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                              已发送 {notices.length} 次通知，最近：{notices[0].date}
                            </div>
                          )}
                          {!hasContactInfo && missingContact.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#b04a2a', marginTop: '4px' }}>
                              <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                              缺少联系人信息：{missingContact.join('、')}
                            </div>
                          )}
                        </div>
                      )}

                      {harvest.distribution && (
                        <div className="distributionMiniSummary">
                          {DISTRIBUTION_TYPES.map((t) => {
                            const val = harvest.distribution[t.key];
                            if (!val) return null;
                            const Icon = typeIcons[t.key];
                            return (
                              <span key={t.key} style={{ borderLeft: `3px solid ${t.color}`, paddingLeft: '6px' }}>
                                <Icon size={11} /> {t.label}: {val}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {fulfillment.key === FULFILLMENT_STATUS.PARTIAL && !harvest.archived && (
                        <div className="partialPickupSection" style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: '#fefbf0',
                          borderRadius: '8px',
                          border: '1px solid #f0e0c0'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#8a6a2c', marginBottom: '8px' }}>
                            <Scissors size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            登记部分取走
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              placeholder="本次取走重量（如 500g 或 0.5kg）"
                              value={partialPickupWeight}
                              onChange={(e) => setPartialPickupWeight(e.target.value)}
                              style={{
                                flex: '1',
                                minWidth: '200px',
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
                              onClick={() => handlePartialPickup(harvest.id, partialPickupWeight)}
                              disabled={!isValidWeightFormat(partialPickupWeight) || harvest.archived}
                            >
                              登记本次取走
                            </button>
                            <button
                              type="button"
                              className="miniBtn"
                              onClick={() => setPartialPickupWeight(formatWeight(selfPickupRemaining))}
                              disabled={harvest.archived}
                            >
                              全部取走
                            </button>
                          </div>
                        </div>
                      )}

                      {harvest.note && <p className="harvestNote">📝 {harvest.note}</p>}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      {pickup.key === 'pending' && !harvest.archived && (
                        <>
                          {canSendPickupNotice(harvest.id) && (
                            <button
                              type="button"
                              className="miniBtn pickupNoticeBtn"
                              onClick={() => sendPickupNotice(harvest.id)}
                              style={{ background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }}
                            >
                              <Bell size={12} />
                              发送取菜通知
                            </button>
                          )}
                          {canReissuePickupNotice(harvest.id) && (
                            <button
                              type="button"
                              className="miniBtn"
                              onClick={() => reissuePickupNotice(harvest.id)}
                              style={{ background: '#fef5e8', color: '#8a6a2c', borderColor: '#e0c080' }}
                            >
                              <RefreshCw size={12} />
                              补发通知
                            </button>
                          )}
                          {checkPickupNoticeExists(contacts, harvest.id) && !canReissuePickupNotice(harvest.id) && (
                            <span className="muted" style={{ fontSize: '12px', color: '#8a7a6a' }}>
                              {PICKUP_REISSUE_GRACE_DAYS}天内请勿重复通知
                            </span>
                          )}
                          {selfPickupRemaining > 0 && (
                            <button
                              type="button"
                              className={`miniBtn ${pickup.isOverdue ? 'pickupOverdueBtn' : 'pickupPendingBtn'}`}
                              onClick={() => confirmPickup(harvest.id)}
                            >
                              <CheckCircle2 size={12} />
                              {pickup.isOverdue ? '标记全部已取' : '确认全部取走'}
                            </button>
                          )}
                        </>
                      )}
                      {pickup.key === 'confirmed' && (
                        <span className="pickupConfirmedBadge">
                          <CheckCircle2 size={12} />
                          {pickup.confirmedAt?.slice(5) || ''} 已取
                        </span>
                      )}
                      {!harvest.archived && fulfillment.key === FULFILLMENT_STATUS.COMPLETED && onArchiveHarvest && (
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
                      {!harvest.archived && (
                        <button type="button" className="miniBtn distributionBtn" onClick={() => openDistribution(harvest)}>
                          <Package size={12} />
                          {harvest.distribution ? '编辑分配' : '登记分配'}
                        </button>
                      )}
                      {!harvest.distribution && !harvest.archived && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="miniBtn"
                            onClick={() => applyQuickSplit(harvest.id, 'all_self')}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            快速：全部认养
                          </button>
                          <button
                            type="button"
                            className="miniBtn"
                            onClick={() => applyQuickSplit(harvest.id, 'half_community')}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            快速：半份分享
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editingHarvest && (
        <DistributionModal
          harvest={editingHarvest}
          onClose={() => setEditingHarvest(null)}
          onSave={(dist) => handleSaveDistribution(editingHarvest.id, dist)}
          onConfirmPickup={() => {
            confirmPickup(editingHarvest.id);
            setEditingHarvest(null);
          }}
          beds={beds}
          contacts={contacts}
          setContacts={setContacts}
        />
      )}
    </>
  );
}
