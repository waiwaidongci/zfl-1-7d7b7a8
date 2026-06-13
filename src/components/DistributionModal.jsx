import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, User, Users, Heart, Trash2, Wheat, CheckCircle2, Clock, CalendarDays, Bell, MessageCircle, History, Scissors, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import {
  DISTRIBUTION_TYPES,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  PICKUP_REISSUE_GRACE_DAYS,
  FULFILLMENT_STATUS,
  parseWeight,
  formatWeight,
  isValidWeightFormat,
  getDistributionTotal,
  validateDistribution,
  validateDistributionWithPartial,
  getPickupStatus,
  getSelfPickupGrams,
  getSelfPickupTakenGrams,
  getSelfPickupRemainingGrams,
  getFulfillmentStatus,
  generatePickupNoticeContact,
  generateReissueNoticeContact,
  confirmPickupContact,
  checkPickupNoticeExists,
  findRelatedPickupNotice,
  getAllPickupNotices,
  canReissuePickupNotice,
  recordPartialPickup,
  addDistributionHistory,
  hasCompleteContactInfo,
  getMissingContactInfo
} from '../utils/distribution';

const typeIcons = {
  selfPickup: User,
  communityShare: Users,
  volunteerSample: Heart,
  loss: Trash2
};

const typeClassNames = {
  selfPickup: 'selfPickup',
  communityShare: 'communityShare',
  volunteerSample: 'volunteerSample',
  loss: 'loss'
};

export function DistributionModal({
  harvest, onClose, onSave, onConfirmPickup,
  beds, contacts, setContacts
}) {
  const [form, setForm] = useState({
    selfPickup: '',
    communityShare: '',
    volunteerSample: '',
    loss: ''
  });
  const [selfPickupConfirmed, setSelfPickupConfirmed] = useState(false);
  const [partialPickupWeight, setPartialPickupWeight] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const isArchived = harvest?.archived;
  const isReadOnly = isArchived;

  useEffect(() => {
    if (harvest?.distribution) {
      setForm({
        selfPickup: harvest.distribution.selfPickup || '',
        communityShare: harvest.distribution.communityShare || '',
        volunteerSample: harvest.distribution.volunteerSample || '',
        loss: harvest.distribution.loss || ''
      });
      setSelfPickupConfirmed(!!harvest.distribution.selfPickupConfirmedAt);
    } else {
      setForm({ selfPickup: '', communityShare: '', volunteerSample: '', loss: '' });
      setSelfPickupConfirmed(false);
    }
  }, [harvest]);

  const totalGrams = useMemo(() => parseWeight(harvest?.weight || ''), [harvest]);
  const distributedGrams = useMemo(() => getDistributionTotal(form), [form]);
  const remainingGrams = Math.max(0, totalGrams - distributedGrams);
  const selfPickupTotalGrams = useMemo(() => getSelfPickupGrams(form), [form]);
  const selfPickupTakenGrams = useMemo(() => harvest?.distribution ? getSelfPickupTakenGrams(harvest.distribution) : 0, [harvest]);
  const selfPickupRemainingGrams = useMemo(() => harvest?.distribution ? getSelfPickupRemainingGrams(harvest.distribution) : selfPickupTotalGrams, [harvest, selfPickupTotalGrams]);

  const errors = useMemo(() => {
    const baseErrors = validateDistribution(form, harvest?.weight || '');
    if (harvest?.distribution) {
      const partialErrors = validateDistributionWithPartial(harvest.distribution, harvest.weight);
      return [...baseErrors, ...partialErrors];
    }
    return baseErrors;
  }, [form, harvest]);

  const isOver = distributedGrams > totalGrams && totalGrams > 0;
  const progress = totalGrams > 0 ? Math.min(100, (distributedGrams / totalGrams) * 100) : 0;

  const pendingConfirmedAt = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isAddingSelfPickup = selfPickupTotalGrams > 0 && !harvest?.distribution?.selfPickup;
  const displayedConfirmedAt = selfPickupConfirmed
    ? harvest?.distribution?.selfPickupConfirmedAt || pendingConfirmedAt
    : '';
  const pickupStatus = useMemo(() => {
    if (!harvest) return { key: 'none' };
    const fakeHarvest = {
      ...harvest,
      distribution: {
        ...form,
        selfPickupConfirmedAt: displayedConfirmedAt || undefined,
        distributionUpdatedAt: harvest?.distribution?.distributionUpdatedAt || harvest?.distributionUpdatedAt || (isAddingSelfPickup ? pendingConfirmedAt : undefined)
      }
    };
    return getPickupStatus(fakeHarvest);
  }, [harvest, form, displayedConfirmedAt, isAddingSelfPickup, pendingConfirmedAt]);

  const fulfillmentStatus = useMemo(() => harvest ? getFulfillmentStatus(harvest) : { key: FULFILLMENT_STATUS.PENDING }, [harvest]);
  const noticeExists = useMemo(() => harvest ? checkPickupNoticeExists(contacts, harvest.id) : false, [contacts, harvest]);
  const relatedNotice = useMemo(() => harvest ? findRelatedPickupNotice(contacts, harvest.id) : null, [contacts, harvest]);
  const allNotices = useMemo(() => harvest ? getAllPickupNotices(contacts, harvest.id) : [], [contacts, harvest]);
  const canReissue = useMemo(() => harvest ? canReissuePickupNotice(contacts, harvest.id, PICKUP_REISSUE_GRACE_DAYS) : false, [contacts, harvest]);
  const hasContact = useMemo(() => harvest ? hasCompleteContactInfo(harvest, beds) : false, [harvest, beds]);
  const missingContact = useMemo(() => harvest ? getMissingContactInfo(harvest, beds) : [], [harvest, beds]);
  const distributionHistory = useMemo(() => harvest?.distribution?.history || [], [harvest]);

  const handleGenerateNotice = () => {
    if (!harvest || !form.selfPickup || !parseWeight(form.selfPickup)) return;
    if (noticeExists) return;
    const tempHarvest = {
      ...harvest,
      distribution: {
        ...harvest.distribution,
        ...form,
        distributionUpdatedAt: harvest?.distribution?.distributionUpdatedAt || new Date().toISOString().slice(0, 10)
      }
    };
    const contact = generatePickupNoticeContact(tempHarvest, beds);
    if (contact) {
      setContacts([contact, ...contacts]);
    }
  };

  const handleReissueNotice = () => {
    if (!harvest || !canReissue) return;
    const contact = generateReissueNoticeContact(harvest, beds, contacts);
    if (contact && !contact.error) {
      setContacts([contact, ...contacts]);
    }
  };

  const handlePartialPickup = () => {
    if (!harvest || !isValidWeightFormat(partialPickupWeight) || isReadOnly) return;
    const takenGrams = parseWeight(partialPickupWeight);
    if (takenGrams <= 0 || takenGrams > selfPickupRemainingGrams) return;

    const updatedDist = recordPartialPickup(harvest.distribution, partialPickupWeight);
    const distWithHistory = addDistributionHistory(updatedDist, 'partial_pickup', {
      takenWeight: partialPickupWeight,
      timestamp: new Date().toISOString()
    });

    onSave({
      ...harvest.distribution,
      ...form,
      selfPickupTaken: distWithHistory.selfPickupTaken,
      history: distWithHistory.history
    });
    setPartialPickupWeight('');
  };

  const handleChange = (key, value) => {
    if (isReadOnly) return;
    setForm({ ...form, [key]: value });
    if (key === 'selfPickup' && (!value || !parseWeight(value))) {
      setSelfPickupConfirmed(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (errors.length > 0 || isReadOnly) return;
    const cleaned = {};
    for (const t of DISTRIBUTION_TYPES) {
      const v = form[t.key]?.trim();
      if (v) cleaned[t.key] = v;
    }
    if (selfPickupConfirmed && selfPickupTotalGrams > 0) {
      cleaned.selfPickupConfirmedAt = displayedConfirmedAt;
      if (harvest && checkPickupNoticeExists(contacts, harvest.id)) {
        setContacts(confirmPickupContact(contacts, harvest.id));
      }
    }
    if (harvest?.distribution?.history) {
      cleaned.history = harvest.distribution.history;
    }
    if (harvest?.distribution?.selfPickupTaken) {
      cleaned.selfPickupTaken = harvest.distribution.selfPickupTaken;
    }
    onSave(Object.keys(cleaned).length > 0 ? cleaned : null);
  };

  const handleQuickConfirm = () => {
    if (selfPickupTotalGrams > 0 && onConfirmPickup && !isReadOnly) {
      if (harvest && checkPickupNoticeExists(contacts, harvest.id)) {
        setContacts(confirmPickupContact(contacts, harvest.id));
      }
      onConfirmPickup();
    }
  };

  if (!harvest) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent distributionModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>
            <Wheat size={18} />
            {isReadOnly ? '查看采收分配' : '登记采收分配'}
            {isReadOnly && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                background: '#e8e8e8',
                color: '#666',
                fontSize: '12px',
                borderRadius: '4px',
                fontWeight: 'normal'
              }}>
                <Lock size={12} style={{ verticalAlign: 'middle' }} /> 已归档，只读
              </span>
            )}
          </h2>
          <button className="closeBtn" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modalBody">
            <div className="distributionHarvestInfo">
              <div className="distributionInfoItem">
                <span className="distributionInfoLabel">菜畦</span>
                <span className="distributionInfoValue">{harvest.bed}</span>
              </div>
              <div className="distributionInfoItem">
                <span className="distributionInfoLabel">作物</span>
                <span className="distributionInfoValue">{harvest.crop}</span>
              </div>
              <div className="distributionInfoItem">
                <span className="distributionInfoLabel">采摘总量</span>
                <span className="distributionInfoValue highlight">{harvest.weight}</span>
              </div>
              <div className="distributionInfoItem">
                <span className="distributionInfoLabel">履约状态</span>
                <span className="distributionInfoValue" style={{
                  color: fulfillmentStatus.key === FULFILLMENT_STATUS.COMPLETED ? '#2f613a' :
                         fulfillmentStatus.key === FULFILLMENT_STATUS.PARTIAL ? '#8a6a2c' :
                         fulfillmentStatus.key === FULFILLMENT_STATUS.ARCHIVED ? '#666' : '#2c5f8a'
                }}>
                  {fulfillmentStatus.label}
                </span>
              </div>
            </div>

            <div className="distributionProgressWrap">
              <div className="distributionProgressHeader">
                <span>分配进度</span>
                <span className={`distributionProgressText ${isOver ? 'over' : remainingGrams === 0 ? 'done' : ''}`}>
                  {formatWeight(distributedGrams)} / {formatWeight(totalGrams)}
                  {progress >= 100 && !isOver ? ' ✓' : ''}
                </span>
              </div>
              <div className="distributionProgressBarWrap">
                <div
                  className={`distributionProgressBar ${isOver ? 'over' : ''}`}
                  style={{ width: `${Math.min(100, isOver ? 100 : progress)}%` }}
                />
              </div>
              <p className="distributionRemaining">
                {isOver
                  ? <strong style={{ color: '#8a2c2c' }}>超量 {formatWeight(distributedGrams - totalGrams)}</strong>
                  : remainingGrams > 0
                    ? <>剩余可分配：<strong>{formatWeight(remainingGrams)}</strong></>
                    : <strong style={{ color: '#3d7a2c' }}>已全部分配完成</strong>
                }
              </p>
            </div>

            <div className="distributionFields">
              {DISTRIBUTION_TYPES.map((t) => {
                const Icon = typeIcons[t.key];
                const val = form[t.key];
                const hint = val && parseWeight(val) > 0 ? formatWeight(parseWeight(val)) : '';
                return (
                  <div key={t.key} className={`distributionFieldGroup ${typeClassNames[t.key]}`}>
                    <label className="distributionFieldLabel">
                      <Icon size={14} />{t.label}
                    </label>
                    {hint && <span className="distributionFieldHint">{hint}</span>}
                    <input
                      type="text"
                      placeholder="例如 500g 或 1.2kg"
                      value={val}
                      onChange={(e) => handleChange(t.key, e.target.value)}
                      disabled={isReadOnly}
                      style={{ opacity: isReadOnly ? 0.7 : 1 }}
                    />
                  </div>
                );
              })}
            </div>

            {selfPickupTotalGrams > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#f2f7fc',
                borderRadius: '8px',
                border: '1px solid #d0e0f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '500', fontSize: '13px', color: '#2c5f8a' }}>
                    <User size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    自取进度
                  </div>
                  <button
                    type="button"
                    className="miniBtn"
                    style={{ fontSize: '12px', padding: '2px 8px' }}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History size={12} style={{ verticalAlign: 'middle' }} />
                    {showHistory ? ' 隐藏历史' : ' 查看历史'}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#5a7a9a' }}>
                  已取：<strong style={{ color: '#2c5f8a' }}>{formatWeight(selfPickupTakenGrams)}</strong>
                  <span style={{ color: '#87917f' }}> / {formatWeight(selfPickupTotalGrams)}</span>
                  {selfPickupRemainingGrams > 0 && (
                    <span style={{ marginLeft: '12px', color: '#8a6a2c' }}>
                      待取：<strong>{formatWeight(selfPickupRemainingGrams)}</strong>
                    </span>
                  )}
                </div>
                {allNotices.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#6a8aaa', marginTop: '6px' }}>
                    <Bell size={10} style={{ verticalAlign: 'middle' }} />
                    已发送 {allNotices.length} 次通知
                    {allNotices.length > 0 && `，最近：${allNotices[0].date}`}
                  </div>
                )}
                {!hasContact && missingContact.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#b04a2a', marginTop: '6px' }}>
                    <AlertTriangle size={10} style={{ verticalAlign: 'middle' }} />
                    缺少联系人信息：{missingContact.join('、')}
                  </div>
                )}
              </div>
            )}

            {showHistory && distributionHistory.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#f7faf4',
                borderRadius: '8px',
                border: '1px solid #d0e0c0'
              }}>
                <div style={{ fontWeight: '500', fontSize: '13px', color: '#55624e', marginBottom: '8px' }}>
                  <History size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  履约历史
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '12px', color: '#55624e' }}>
                  {distributionHistory.map((entry, idx) => (
                    <div key={idx} style={{ padding: '4px 0', borderBottom: idx < distributionHistory.length - 1 ? '1px dashed #e0e8dc' : 'none' }}>
                      <span style={{ color: '#87917f' }}>{entry.timestamp?.slice(0, 16).replace('T', ' ') || '未知时间'}</span>
                      <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                        {entry.action === 'partial_pickup' ? '部分取走' :
                         entry.action === 'distribution_updated' ? '分配更新' :
                         entry.action === 'pickup_confirmed' ? '确认取菜' :
                         entry.action === 'notice_sent' ? '发送通知' : entry.action}
                      </span>
                      {entry.details?.takenWeight && (
                        <span style={{ marginLeft: '8px', color: '#2f613a' }}>
                          {entry.details.takenWeight}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selfPickupRemainingGrams > 0 && !isReadOnly && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#fefbf0',
                borderRadius: '8px',
                border: '1px solid #f0e0c0'
              }}>
                <div style={{ fontWeight: '500', fontSize: '13px', color: '#8a6a2c', marginBottom: '8px' }}>
                  <Scissors size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  登记本次取走
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="本次取走重量（如 500g 或 0.5kg"
                    value={partialPickupWeight}
                    onChange={(e) => setPartialPickupWeight(e.target.value)}
                    style={{
                      flex: '1',
                      minWidth: '180px',
                      padding: '8px 12px',
                      border: '1px solid #d0c0a0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    type="button"
                    className="miniBtn"
                    style={{ background: '#8a6a2c', color: '#fff', borderColor: '#8a6a2c' }}
                    onClick={handlePartialPickup}
                    disabled={!isValidWeightFormat(partialPickupWeight)}
                  >
                    登记本次取走
                  </button>
                  <button
                    type="button"
                    className="miniBtn"
                    onClick={() => setPartialPickupWeight(formatWeight(selfPickupRemainingGrams))}
                  >
                    全部取走
                  </button>
                </div>
              </div>
            )}

            {selfPickupTotalGrams > 0 && (
              <div className={`pickupConfirmSection ${pickupStatus.isOverdue ? 'overdue' : ''} ${selfPickupConfirmed ? 'confirmed' : ''}`}>
                <div className="pickupConfirmHeader">
                  <div className="pickupConfirmInfo">
                    {selfPickupConfirmed ? (
                      <>
                        <CheckCircle2 size={18} style={{ color: '#3d7a2c' }} />
                        <div>
                          <strong style={{ color: '#3d7a2c' }}>已确认取菜</strong>
                          <span className="pickupConfirmDate">
                            <CalendarDays size={12} />
                            确认时间：{displayedConfirmedAt}
                          </span>
                          {relatedNotice && (
                            <span className="pickupConfirmDate" style={{ marginTop: '2px' }}>
                              <MessageCircle size={12} />
                              通知记录：{relatedNotice.date} {relatedNotice.time}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Clock size={18} style={{ color: pickupStatus.isOverdue ? '#8b3f23' : '#2c5f8a' }} />
                        <div>
                          <strong style={{ color: pickupStatus.isOverdue ? '#8b3f23' : '#2c5f8a' }}>
                            {pickupStatus.isOverdue ? `超期未取（已超过${pickupStatus.daysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天）` : '待认养人取菜'}
                          </strong>
                          <span className="pickupConfirmDate">
                            认养人自取：{formatWeight(selfPickupTotalGrams)} · {PICKUP_CONFIRM_OVERDUE_DAYS}天内确认有效
                          </span>
                          {relatedNotice && (
                            <span className="pickupConfirmDate" style={{ marginTop: '2px', color: '#2c5f8a' }}>
                              <MessageCircle size={12} />
                              已发送通知：{relatedNotice.date} {relatedNotice.time}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!selfPickupConfirmed && !noticeExists && hasContact && !isReadOnly && (
                      <button
                        type="button"
                        className="pickupNoticeModalBtn"
                        onClick={handleGenerateNotice}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #a0c0e0', background: '#e8f0fa', color: '#2c5f8a', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Bell size={12} />
                        发送取菜通知
                      </button>
                    )}
                    {!selfPickupConfirmed && noticeExists && canReissue && hasContact && !isReadOnly && (
                      <button
                        type="button"
                        className="pickupNoticeModalBtn"
                        onClick={handleReissueNotice}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0c080', background: '#fef5e8', color: '#8a6a2c', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RefreshCw size={12} />
                        补发通知
                      </button>
                    )}
                    {!selfPickupConfirmed && noticeExists && !canReissue && (
                      <span style={{ fontSize: '12px', color: '#8a7a6a' }}>
                        {PICKUP_REISSUE_GRACE_DAYS}天内请勿重复通知
                      </span>
                    )}
                    {!selfPickupConfirmed && !isReadOnly ? (
                      <button
                        type="button"
                        className="pickupConfirmBtn"
                        onClick={() => setSelfPickupConfirmed(true)}
                      >
                        <CheckCircle2 size={14} />
                        确认已取走
                      </button>
                    ) : (
                      !isReadOnly && (
                        <button
                          type="button"
                          className="pickupUndoBtn"
                          onClick={() => setSelfPickupConfirmed(false)}
                        >
                          撤销确认
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="distributionError">
                <AlertCircle size={16} />
                <div>
                  {errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            )}

            {harvest.note && (
              <p style={{ margin: 0, fontSize: '13px', color: '#71806a' }}>
                📝 采摘备注：{harvest.note}
              </p>
            )}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid #eef2eb', display: 'flex', gap: '10px' }}>
            <button type="button" className="clearBtn" onClick={onClose} style={{ flex: 1 }}>
              {isReadOnly ? '关闭' : '取消'}
            </button>
            {!isReadOnly && (
              <button type="submit" disabled={errors.length > 0} style={{ flex: 1 }}>
                保存分配
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
