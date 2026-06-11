import React, { useState, useMemo } from 'react';
import {
  Wheat, Search, AlertCircle, CheckCircle2, Clock, Package,
  User, Users, Heart, Trash2, Filter, CalendarDays, Bell, MessageCircle
} from 'lucide-react';
import { DistributionModal } from './DistributionModal';
import {
  DISTRIBUTION_TYPES,
  DISTRIBUTION_OVERDUE_DAYS,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  parseWeight,
  formatWeight,
  getDistributionTotal,
  getDistributionStatus,
  getDistributionStats,
  getDistributionRemaining,
  getPickupStatus,
  getPickupStats,
  getPickupWarnings,
  generatePickupNoticeContact,
  confirmPickupContact,
  checkPickupNoticeExists,
  findRelatedPickupNotice
} from '../utils/distribution';
import { iso } from '../data/seedData';

const typeIcons = {
  selfPickup: User,
  communityShare: Users,
  volunteerSample: Heart,
  loss: Trash2
};

export function DistributionTab({
  harvests, setHarvests, harvestOptions, harvestForm, setHarvestForm, addHarvest,
  beds, contacts, setContacts
}) {
  const [editingHarvest, setEditingHarvest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');

  const stats = useMemo(() => getDistributionStats(harvests), [harvests]);
  const pickupStats = useMemo(() => getPickupStats(harvests), [harvests]);
  const pickupWarnings = useMemo(() => getPickupWarnings(harvests), [harvests]);

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
          selfPickupConfirmedAt: iso(0)
        }
      };
    }));
    if (checkPickupNoticeExists(contacts, harvestId)) {
      setContacts(confirmPickupContact(contacts, harvestId));
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

  const saveDistribution = (harvestId, distribution) => {
    setHarvests(harvests.map((h) =>
      h.id === harvestId ? {
        ...h,
        distribution: distribution ? { ...distribution, distributionUpdatedAt: iso(0) } : null
      } : h
    ));
    setEditingHarvest(null);
  };

  const openDistribution = (harvest) => {
    setEditingHarvest(harvest);
  };

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
          <h2>部分分配</h2>
          <p className="statNumber" style={{ color: stats.partial > 0 ? '#8a6a2c' : '#2f613a' }}>
            {stats.partial}<span>批</span>
          </p>
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
          <h2>已取菜</h2>
          <p className="statNumber">
            {pickupStats.confirmed}<span>批</span>
          </p>
          {pickupStats.confirmedWeight > 0 && (
            <p className="statSub">{formatWeight(pickupStats.confirmedWeight)}</p>
          )}
        </article>
        <article>
          <h2>分配完成</h2>
          <p className="statNumber">{stats.completed}<span>批</span></p>
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
                      {!noticeSent && (
                        <button type="button" className="miniBtn" style={{ background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }} onClick={() => generatePickupNotice(h.id)}>
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
                      {!noticeSent && (
                        <button type="button" className="miniBtn" style={{ marginTop: 0, marginLeft: 0, background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }} onClick={() => generatePickupNotice(h.id)}>
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
        <form onSubmit={addHarvest} className="panel">
          <h2><Wheat size={18} />新增采摘记录</h2>
          <select value={harvestForm.bed} onChange={(e) => setHarvestForm({ ...harvestForm, bed: e.target.value })}>
            <option value="">选择菜畦</option>
            {harvestOptions.map((name) => <option key={name}>{name}</option>)}
          </select>
          <input placeholder="采摘作物" value={harvestForm.crop} onChange={(e) => setHarvestForm({ ...harvestForm, crop: e.target.value })} />
          <input placeholder="重量（如 1.4kg 或 300g）" value={harvestForm.weight} onChange={(e) => setHarvestForm({ ...harvestForm, weight: e.target.value })} />
          <input type="date" value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} />
          <input placeholder="备注" value={harvestForm.note} onChange={(e) => setHarvestForm({ ...harvestForm, note: e.target.value })} />
          <button>保存采摘</button>
        </form>

        <div className="panel wide">
          <div className="toolbar">
            <h2>采收分配列表</h2>
            <div className="toolbarActions">
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
                const distributed = getDistributionTotal(harvest.distribution);
                const total = parseWeight(harvest.weight);
                const remaining = getDistributionRemaining(harvest);
                const progress = total > 0 ? Math.min(100, (distributed / total) * 100) : 0;
                const daysSince = Math.floor((new Date() - new Date(harvest.date)) / 86400000);

                return (
                  <article key={harvest.id} className="harvestCard">
                    <div className="harvestHeader">
                      <div className="harvestInfo">
                        <strong>{harvest.crop} · {harvest.weight}</strong>
                        <span className="harvestBed">{harvest.bed}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`distributionStatusTag ${status.key} ${status.isOverdue ? 'overdue' : ''}`}>
                          {status.isOverdue && <AlertCircle size={12} />}
                          {status.label}
                          {status.isOverdue && `（超${daysSince - DISTRIBUTION_OVERDUE_DAYS}天）`}
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

                      {harvest.note && <p className="harvestNote">📝 {harvest.note}</p>}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      {pickup.key === 'pending' && (
                        <>
                          {!checkPickupNoticeExists(contacts, harvest.id) && (
                            <button
                              type="button"
                              className="miniBtn pickupNoticeBtn"
                              onClick={() => generatePickupNotice(harvest.id)}
                              style={{ background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }}
                            >
                              <Bell size={12} />
                              发送取菜通知
                            </button>
                          )}
                          <button
                            type="button"
                            className={`miniBtn ${pickup.isOverdue ? 'pickupOverdueBtn' : 'pickupPendingBtn'}`}
                            onClick={() => confirmPickup(harvest.id)}
                          >
                            <CheckCircle2 size={12} />
                            {pickup.isOverdue ? '标记已取' : '确认取菜'}
                          </button>
                        </>
                      )}
                      {pickup.key === 'confirmed' && (
                        <span className="pickupConfirmedBadge">
                          <CheckCircle2 size={12} />
                          {pickup.confirmedAt?.slice(5) || ''} 已取
                        </span>
                      )}
                      <button type="button" className="miniBtn distributionBtn" onClick={() => openDistribution(harvest)}>
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
      </section>

      {editingHarvest && (
        <DistributionModal
          harvest={editingHarvest}
          onClose={() => setEditingHarvest(null)}
          onSave={(dist) => saveDistribution(editingHarvest.id, dist)}
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
