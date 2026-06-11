import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, User, Users, Heart, Trash2, Wheat, CheckCircle2, Clock, CalendarDays, Bell, MessageCircle } from 'lucide-react';
import {
  DISTRIBUTION_TYPES,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  parseWeight,
  formatWeight,
  getDistributionTotal,
  validateDistribution,
  getPickupStatus,
  getSelfPickupGrams,
  generatePickupNoticeContact,
  confirmPickupContact,
  checkPickupNoticeExists,
  findRelatedPickupNotice
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
  const errors = useMemo(() => validateDistribution(form, harvest?.weight || ''), [form, harvest]);
  const isOver = distributedGrams > totalGrams && totalGrams > 0;
  const progress = totalGrams > 0 ? Math.min(100, (distributedGrams / totalGrams) * 100) : 0;

  const selfPickupGrams = useMemo(() => getSelfPickupGrams(form), [form]);
  const pendingConfirmedAt = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isAddingSelfPickup = selfPickupGrams > 0 && !harvest?.distribution?.selfPickup;
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

  const noticeExists = useMemo(() => harvest ? checkPickupNoticeExists(contacts, harvest.id) : false, [contacts, harvest]);
  const relatedNotice = useMemo(() => harvest ? findRelatedPickupNotice(contacts, harvest.id) : null, [contacts, harvest]);

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

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
    if (key === 'selfPickup' && (!value || !parseWeight(value))) {
      setSelfPickupConfirmed(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (errors.length > 0) return;
    const cleaned = {};
    for (const t of DISTRIBUTION_TYPES) {
      const v = form[t.key]?.trim();
      if (v) cleaned[t.key] = v;
    }
    if (selfPickupConfirmed && selfPickupGrams > 0) {
      cleaned.selfPickupConfirmedAt = displayedConfirmedAt;
      if (harvest && checkPickupNoticeExists(contacts, harvest.id)) {
        setContacts(confirmPickupContact(contacts, harvest.id));
      }
    }
    onSave(Object.keys(cleaned).length > 0 ? cleaned : null);
  };

  const handleQuickConfirm = () => {
    if (selfPickupGrams > 0 && onConfirmPickup) {
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
          <h2><Wheat size={18} />登记采收分配</h2>
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
                    />
                  </div>
                );
              })}
            </div>

            {selfPickupGrams > 0 && (
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
                            认养人自取：{formatWeight(selfPickupGrams)} · {PICKUP_CONFIRM_OVERDUE_DAYS}天内确认有效
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
                    {!selfPickupConfirmed && !noticeExists && (
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
                    {!selfPickupConfirmed ? (
                      <button
                        type="button"
                        className="pickupConfirmBtn"
                        onClick={() => setSelfPickupConfirmed(true)}
                      >
                        <CheckCircle2 size={14} />
                        确认已取走
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pickupUndoBtn"
                        onClick={() => setSelfPickupConfirmed(false)}
                      >
                        撤销确认
                      </button>
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
            <button type="button" className="clearBtn" onClick={onClose} style={{ flex: 1 }}>取消</button>
            <button type="submit" disabled={errors.length > 0} style={{ flex: 1 }}>
              保存分配
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
