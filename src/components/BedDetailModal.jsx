import React, { useMemo, useState } from 'react';
import {
  X, User, Phone, CalendarDays, Droplets, TriangleAlert,
  Users, MessageCircle, Wheat, Package, Sprout, AlertCircle,
  CheckCircle2, Clock, Bug, Search, MapPin, Calendar,
  AlertTriangle, ArrowUpCircle, TrendingUp, Plus, ListTodo
} from 'lucide-react';
import { getWaterUrgency, STATUS_STYLES, getZoneOfBed } from '../config/floorPlan';
import { getBedInspectionSummary, getFollowupStatus } from '../utils/statusSync';
import { getAbnormalTypeInfo } from '../data/inspectionData';
import { RELATED_TYPE_LABELS } from '../data/seedData';
import {
  getBedStatusForRotation,
  getBedHistoryCrops,
  generateCropSuggestions,
  ROTATION_STATUS_LABELS
} from '../utils/cropRotation';

export function BedDetailModal({
  bed, plants, contacts, harvests, transactions, tasks,
  inspections, onClose, onQuickWater, onAddInspection, bedPlacement,
  materials, beds, onCreatePlant, onCreateTask
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
    const bedIdMap = {};
    if (beds) beds.forEach(b => { bedIdMap[b.name] = b.id; });
    const taskBedMap = {};
    tasks.forEach(t => {
      const matchedBed = beds ? beds.find(b => t.title.includes(b.name.slice(0, 3))) : null;
      if (matchedBed) taskBedMap[t.id] = matchedBed.id;
    });

    const consumptions = transactions.filter(t => {
      if (t.type !== 'consume') return false;
      let match = false;
      if (t.relatedType === 'harvest') {
        const h = harvests.find(h => h.id === t.relatedId);
        if (h && h.bed === bed.name) match = true;
      } else if (t.relatedType === 'task') {
        if (taskBedMap[t.relatedId] === bed.id) match = true;
        else if (t.relatedName && t.relatedName.includes(bed.name.slice(0, 3))) match = true;
      } else if (t.relatedType === 'plant') {
        const p = plants.find(p => p.id === t.relatedId);
        if (p && p.bedId === bed.id) match = true;
      } else if (t.relatedType === 'inspection') {
        const i = inspections.find(i => i.id === t.relatedId);
        if (i && i.bedName === bed.name) match = true;
      } else if (t.relatedType === 'bed') {
        if (t.relatedId === bed.id) match = true;
      }
      if (!match && t.bedName === bed.name) match = true;
      return match;
    });

    const summary = {};
    consumptions.forEach(t => {
      if (!summary[t.materialId]) {
        summary[t.materialId] = {
          name: t.materialName,
          total: 0,
          unit: t.unit,
          category: t.category,
          records: []
        };
      }
      summary[t.materialId].total += t.quantity;
      summary[t.materialId].records.push({
        quantity: t.quantity,
        date: t.date,
        relatedType: t.relatedType,
        relatedName: t.relatedName,
        note: t.note
      });
    });

    const byType = {};
    consumptions.forEach(t => {
      const type = t.relatedType || 'unassigned';
      if (!byType[type]) {
        byType[type] = { count: 0, totalQty: 0 };
      }
      byType[type].count += 1;
      byType[type].totalQty += t.quantity;
    });

    return {
      summary: Object.values(summary).sort((a, b) => b.total - a.total),
      consumptions: consumptions.sort((a, b) => new Date(b.date) - new Date(a.date)),
      totalTypes: Object.keys(summary).length,
      totalQuantity: consumptions.reduce((sum, t) => sum + t.quantity, 0),
      byType
    };
  }, [transactions, harvests, bed.name, bed.id, tasks, plants, inspections, beds]);

  const bedTasks = useMemo(() =>
    tasks.filter(t => !t.done && t.title.includes(bed.name.slice(0, 3))).slice(0, 5),
    [tasks, bed.name]);

  const inspectionSummary = useMemo(() =>
    getBedInspectionSummary(bed.name, inspections, tasks),
    [inspections, bed.name, tasks]);

  const bedZone = useMemo(() =>
    getZoneOfBed(bed, bedPlacement),
    [bed, bedPlacement]);

  const rotationInfo = useMemo(() => {
    const bedInfo = getBedStatusForRotation(bed, plants, bedPlacement);
    const history = getBedHistoryCrops(bed, harvests, plants);
    const suggestions = generateCropSuggestions(bedInfo, history);
    return {
      ...bedInfo,
      history,
      suggestions,
      statusLabel: ROTATION_STATUS_LABELS[bedInfo.status]
    };
  }, [bed, plants, bedPlacement, harvests]);

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

          {bedMaterials.summary.length > 0 && (
            <div className="bedDetailSection">
              <h4><Package size={16} />物资投入汇总</h4>
              <div className="bedMaterialSummaryStats">
                <span className="bedMaterialStat">{bedMaterials.totalTypes}种物资</span>
                <span className="bedMaterialStat">共{bedMaterials.totalQuantity}件消耗</span>
                <span className="bedMaterialStat">{bedMaterials.consumptions.length}条记录</span>
              </div>
              {Object.keys(bedMaterials.byType).length > 0 && (
                <div className="bedMaterialTypeStats">
                  <span className="bedMaterialTypeLabel">按类型：</span>
                  <div className="bedMaterialTypeTags">
                    {Object.entries(bedMaterials.byType).map(([type, stats]) => (
                      <span key={type} className="bedMaterialTypeTag">
                        {RELATED_TYPE_LABELS[type] || '未关联'}：{stats.count}次
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bedMaterialSummaryList">
                {bedMaterials.summary.map(m => (
                  <div key={m.name} className="bedMaterialSummaryItem">
                    <div className="bedMaterialSummaryHeader">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{m.name}</strong>
                        <span className={`categoryTag ${m.category}`} style={{ fontSize: '11px' }}>{m.category}</span>
                      </div>
                      <span className="bedMaterialQty">{m.total}{m.unit}</span>
                    </div>
                    <div className="bedMaterialRecords">
                      {m.records.slice(0, 3).map((r, idx) => (
                        <span key={idx} className="bedMaterialRecord">
                          <span className="bedMaterialRecordType">
                            {RELATED_TYPE_LABELS[r.relatedType] || '直接消耗'}
                          </span>
                          -{r.quantity}{m.unit}
                          <span className="bedMaterialRecordDate">{r.date}</span>
                        </span>
                      ))}
                      {m.records.length > 3 && (
                        <span className="bedMaterialRecord more">+{m.records.length - 3}次</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {bedMaterials.consumptions.length > 0 && (
                <div className="bedMaterialRecentList">
                  <p className="bedMaterialRecentTitle"><ArrowUpCircle size={12} />最近消耗记录</p>
                  {bedMaterials.consumptions.slice(0, 5).map(t => (
                    <div key={t.id} className="bedMaterialRecentItem">
                      <span className="miniConsumeTag">{t.materialName} -{t.quantity}{t.unit}</span>
                      <span className="attributionTag">
                        {RELATED_TYPE_LABELS[t.relatedType] || '未关联'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#87917f' }}>{t.date}</span>
                    </div>
                  ))}
                </div>
              )}
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

          <div className="bedDetailSection rotationSection">
            <div className="sectionHeaderWithBadge">
              <h4><TrendingUp size={16} />轮作规划建议</h4>
              <span
                className="rotationStatusBadge"
                style={{
                  background: rotationInfo.statusLabel.bg,
                  color: rotationInfo.statusLabel.color
                }}
              >
                {rotationInfo.statusLabel.label}
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#55624e' }}>
              <Calendar size={12} />
              {rotationInfo.status === 'idle'
                ? '菜畦空闲，可立即安排种植'
                : `预计 ${rotationInfo.availableDate} 可安排下一茬（${rotationInfo.daysUntilAvailable}天后）`}
            </p>

            {rotationInfo.history.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '12px', color: '#71806a', marginBottom: '6px' }}>历史种植：</p>
                <div className="historyChips">
                  {rotationInfo.history.slice(0, 4).map((h, idx) => (
                    <span key={idx} className="historyChip">
                      {h.crop}
                      <span className="historyDate">{h.date}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rotationInfo.suggestions.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '12px', color: '#71806a', marginBottom: '8px' }}>推荐作物：</p>
                <div className="rotationSuggestionList">
                  {rotationInfo.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="rotationSuggestionItem">
                      <div className="suggestionRank">{idx + 1}</div>
                      <div className="suggestionContent">
                        <div className="suggestionHeader">
                          <strong>{suggestion.crop}</strong>
                          <span className="growthTag">
                            <Clock size={10} /> {suggestion.growthDays}天
                          </span>
                          <span className="familyTag">{suggestion.family}</span>
                        </div>
                        <p className="suggestionReason">{suggestion.reason}</p>
                        <div className="suggestionActions">
                          {onCreatePlant && (
                            <button
                              className="actionBtn primary small"
                              onClick={() => onCreatePlant(bed, suggestion, rotationInfo.availableDate)}
                            >
                              <Plus size={12} /> 转种植计划
                            </button>
                          )}
                          {onCreateTask && (
                            <button
                              className="actionBtn secondary small"
                              onClick={() => onCreateTask(bed, { ...suggestion, action: 'sow' }, rotationInfo.availableDate)}
                            >
                              <ListTodo size={12} /> 转待办
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
