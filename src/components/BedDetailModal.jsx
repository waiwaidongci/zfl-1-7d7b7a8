import React, { useMemo } from 'react';
import {
  X, User, Phone, CalendarDays, Droplets, TriangleAlert,
  Users, MessageCircle, Wheat, Package, Sprout, AlertCircle,
  CheckCircle2, Clock, Bug, Search, MapPin, Calendar,
  AlertTriangle
} from 'lucide-react';
import { getWaterUrgency, STATUS_STYLES, getZoneOfBed } from '../config/floorPlan';
import { getBedInspectionSummary, getFollowupStatus } from '../utils/statusSync';
import { getAbnormalTypeInfo } from '../data/inspectionData';

export function BedDetailModal({
  bed, plants, contacts, harvests, transactions, tasks,
  inspections, onClose, onQuickWater, onAddInspection, bedPlacement
}) {
  if (!bed) return null;

  const waterUrgency = useMemo(() => getWaterUrgency(bed.nextWater), [bed.nextWater]);

  const bedPlants = useMemo(() =>
    plants.filter(p => p.bedId === bed.id).sort((a, b) =>
      new Date(b.harvestDate) - new Date(a.harvestDate)
    ), [plants, bed.id]);

  const bedContacts = useMemo(() =>
    contacts.filter(c => c.bedId === bed.id).sort((a, b) =>
      new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    ).slice(0, 5), [contacts, bed.id]);

  const bedHarvests = useMemo(() =>
    harvests.filter(h => h.bed === bed.name).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    ).slice(0, 5), [harvests, bed.name]);

  const bedMaterials = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === 'consume').forEach(t => {
      let match = false;
      if (t.relatedType === 'harvest') {
        const h = harvests.find(h => h.id === t.relatedId);
        if (h && h.bed === bed.name) match = true;
      } else if (t.relatedType === 'task') {
        if (t.relatedName && t.relatedName.includes(bed.name.slice(0, 3))) match = true;
      }
      if (match) {
        if (!map[t.materialId]) {
          map[t.materialId] = {
            name: t.materialName,
            total: 0,
            unit: t.unit,
            category: t.category
          };
        }
        map[t.materialId].total += t.quantity;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [transactions, harvests, bed.name]);

  const bedTasks = useMemo(() =>
    tasks.filter(t => !t.done && t.title.includes(bed.name.slice(0, 3))).slice(0, 5),
    [tasks, bed.name]);

  const inspectionSummary = useMemo(() =>
    getBedInspectionSummary(bed.name, inspections, tasks),
    [inspections, bed.name, tasks]);

  const bedZone = useMemo(() =>
    getZoneOfBed(bed, bedPlacement),
    [bed, bedPlacement]);

  const statusStyle = STATUS_STYLES[bed.status] || STATUS_STYLES['空闲'];

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent bedDetailModal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="bedDetailTitle">
            <h3>{bed.name}</h3>
            <button className="closeBtn" onClick={onClose}>×</button>
          </div>
          <p className="bedDetailCrop">{bed.crop}</p>
        </div>

        <div className="modalBody">
          {bed.warning && (
            <div className="bedDetailWarning">
              <TriangleAlert size={20} />
              <div>
                <strong>异常提醒</strong>
                <p>{bed.warning}</p>
              </div>
            </div>
          )}

          <div className="bedDetailGrid">
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><MapPin size={14} />所属区域</span>
              <span className="bedDetailValue" style={{ color: bedZone ? bedZone.color : '#71806a', fontWeight: 500 }}>
                {bedZone ? `${bedZone.name} · ${bedZone.description}` : '未分配区域'}
              </span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><User size={14} />认养人</span>
              <span className="bedDetailValue">{bed.adopter || '待认养'}</span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><Phone size={14} />联系电话</span>
              <span className="bedDetailValue">{bed.phone || '-'}</span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><Search size={14} />面积</span>
              <span className="bedDetailValue">{bed.area}</span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><CheckCircle2 size={14} />状态</span>
              <span className="bedDetailValue" style={{ color: bed.status === '认养中' ? '#2f613a' : bed.status === '暂停维护' ? '#8a6a2c' : '#71806a' }}>
                {bed.status}
              </span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><Droplets size={14} />下次浇水</span>
              <span className={`bedDetailValue water-${waterUrgency.key}`}>
                {bed.nextWater}
                {waterUrgency.key !== 'normal' && ` · ${waterUrgency.label}`}
              </span>
            </div>
            <div className="bedDetailItem">
              <span className="bedDetailLabel"><Bug size={14} />巡检</span>
              <span className="bedDetailValue">
                共{inspectionSummary.total}次
                {inspectionSummary.unresolvedCount > 0 &&
                  <span style={{ color: '#8b3f23', marginLeft: '6px' }}>
                    {inspectionSummary.unresolvedCount}项待处理
                  </span>
                }
                {inspectionSummary.pendingReviewCount > 0 &&
                  <span style={{ color: '#8a6a2c', marginLeft: '6px' }}>
                    {inspectionSummary.pendingReviewCount}项待复查
                  </span>
                }
                {inspectionSummary.overdueReviewCount > 0 &&
                  <span style={{ color: '#8b3f23', marginLeft: '6px' }}>
                    ⚠ {inspectionSummary.overdueReviewCount}项复查逾期
                  </span>
                }
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {waterUrgency.key !== 'normal' && (
              <button
                type="button"
                className="miniBtn"
                style={{ background: '#2c5f8a', color: '#fff', borderColor: '#2c5f8a' }}
                onClick={() => onQuickWater(bed.id)}
              >
                <Droplets size={14} />完成浇水
              </button>
            )}
            <button
              type="button"
              className="miniBtn"
              onClick={() => onAddInspection(bed)}
            >
              <Bug size={14} />新增巡检
            </button>
          </div>

          {bedPlants.length > 0 && (
            <div className="bedDetailSection">
              <h4><Sprout size={16} />种植计划</h4>
              {bedPlants.map(plant => (
                <div key={plant.id} className="bedDetailPlant">
                  <div className="bedDetailPlantHeader">
                    <strong>{plant.crop}</strong>
                    <span className={`stageTag ${plant.growthStage}`}>{plant.growthStage}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#55624e' }}>
                    <CalendarDays size={12} /> {plant.sowDate} → {plant.harvestDate}
                  </p>
                  {plant.note && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71806a' }}>
                      📝 {plant.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {bedContacts.length > 0 && (
            <div className="bedDetailSection">
              <h4><MessageCircle size={16} />最近联系</h4>
              {bedContacts.map(contact => (
                <div key={contact.id} className="bedDetailPlant">
                  <div className="bedDetailPlantHeader">
                    <span className={`contactTypeTag ${contact.type}`}>
                      {contact.type === '电话' && <Phone size={10} />}
                      {contact.type === '微信' && <MessageCircle size={10} />}
                      {contact.type === '现场沟通' && <Users size={10} />}
                      {contact.type}
                    </span>
                    <span style={{ fontSize: '12px', color: '#71806a' }}>
                      {contact.date} {contact.time}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3c4d38' }}>
                    {contact.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {bedHarvests.length > 0 && (
            <div className="bedDetailSection">
              <h4><Wheat size={16} />近期采摘</h4>
              {bedHarvests.map(harvest => (
                <div key={harvest.id} className="bedDetailHarvest">
                  <div className="bedDetailHarvestHeader">
                    <strong>{harvest.crop} {harvest.weight}</strong>
                    <span style={{ fontSize: '12px', color: '#71806a' }}>{harvest.date}</span>
                  </div>
                  {harvest.note && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71806a' }}>
                      📝 {harvest.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {bedMaterials.length > 0 && (
            <div className="bedDetailSection">
              <h4><Package size={16} />物资消耗</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {bedMaterials.map(m => (
                  <span key={m.name} className="miniConsumeTag">
                    {m.name}: {m.total}{m.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {bedTasks.length > 0 && (
            <div className="bedDetailSection">
              <h4><Clock size={16} />待处理任务</h4>
              {bedTasks.map(task => (
                <div key={task.id} className="bedDetailPlant">
                  <div className="bedDetailPlantHeader">
                    <span style={{ color: '#3c4d38' }}>{task.title}</span>
                    <span style={{ fontSize: '12px', color: task.due < new Date().toISOString().slice(0, 10) ? '#8b3f23' : '#71806a' }}>
                      截止 {task.due}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71806a' }}>
                    负责人：{task.owner}
                  </p>
                </div>
              ))}
            </div>
          )}

          {inspectionSummary.recent.length > 0 && (
            <div className="bedDetailSection">
              <h4><Bug size={16} />近期巡检</h4>
              {inspectionSummary.recent.map(insp => {
                const abnormal = getAbnormalTypeInfo(insp.abnormalType);
                const followupStatus = getFollowupStatus(insp, tasks);
                return (
                  <div key={insp.id} className="bedDetailPlant">
                    <div className="bedDetailPlantHeader">
                      <span className={`abnormalTag ${abnormal.severity}`}>
                        {abnormal.label}
                      </span>
                      <span style={{ fontSize: '12px', color: '#71806a' }}>
                        {insp.date} {insp.time} · {insp.inspector}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3c4d38' }}>
                      {insp.note}
                    </p>
                    {insp.followupDate && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#55624e' }}>
                        <span>
                          <Calendar size={10} style={{ marginRight: '4px', verticalAlign: '-2px' }} />
                          复查：{insp.followupDate}
                        </span>
                        {insp.followupOwner && (
                          <span>
                            <User size={10} style={{ marginRight: '4px', verticalAlign: '-2px' }} />
                            负责人：{insp.followupOwner}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                      <span className={`syncStatusTag ${insp.syncStatus === 'synced' ? 'success' : 'warning'}`}
                        style={{ display: 'inline-flex' }}>
                        {insp.syncStatus === 'synced' ? '已同步' : '待同步'}
                      </span>
                      {followupStatus.key !== 'none' && followupStatus.key !== 'not_required' && (
                        <span className={`followupStatusTag ${followupStatus.key} ${followupStatus.overdue ? 'overdue' : ''}`}>
                          {followupStatus.key === 'completed' && <CheckCircle2 size={10} />}
                          {followupStatus.overdue && <AlertTriangle size={10} />}
                          {followupStatus.key === 'pending' && <Clock size={10} />}
                          {followupStatus.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
