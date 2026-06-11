import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, User, Users, Heart, Trash2, Wheat } from 'lucide-react';
import {
  DISTRIBUTION_TYPES,
  parseWeight,
  formatWeight,
  getDistributionTotal,
  validateDistribution
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

export function DistributionModal({ harvest, onClose, onSave }) {
  const [form, setForm] = useState({
    selfPickup: '',
    communityShare: '',
    volunteerSample: '',
    loss: ''
  });

  useEffect(() => {
    if (harvest?.distribution) {
      setForm({
        selfPickup: harvest.distribution.selfPickup || '',
        communityShare: harvest.distribution.communityShare || '',
        volunteerSample: harvest.distribution.volunteerSample || '',
        loss: harvest.distribution.loss || ''
      });
    } else {
      setForm({ selfPickup: '', communityShare: '', volunteerSample: '', loss: '' });
    }
  }, [harvest]);

  const totalGrams = useMemo(() => parseWeight(harvest?.weight || ''), [harvest]);
  const distributedGrams = useMemo(() => getDistributionTotal(form), [form]);
  const remainingGrams = Math.max(0, totalGrams - distributedGrams);
  const errors = useMemo(() => validateDistribution(form, harvest?.weight || ''), [form, harvest]);
  const isOver = distributedGrams > totalGrams && totalGrams > 0;
  const progress = totalGrams > 0 ? Math.min(100, (distributedGrams / totalGrams) * 100) : 0;

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (errors.length > 0) return;
    const cleaned = {};
    for (const t of DISTRIBUTION_TYPES) {
      const v = form[t.key]?.trim();
      if (v) cleaned[t.key] = v;
    }
    onSave(Object.keys(cleaned).length > 0 ? cleaned : null);
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
