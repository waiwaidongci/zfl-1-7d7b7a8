import React, { useState, useMemo, useEffect } from 'react';
import {
  Bug, Search, Plus, Save, FileText, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, Trash2, Image as ImageIcon,
  Trash, X, Calendar, User, ArrowUpCircle, Package
} from 'lucide-react';
import {
  ABNORMAL_TYPES, TREATMENT_RESULTS,
  getAbnormalTypeInfo, getTreatmentResultInfo, iso
} from '../data/inspectionData';
import {
  getSuggestedMaterials, buildTransactionEntry, RELATED_TYPE_LABELS
} from '../data/seedData';
import {
  syncAllInspections, updateInspectionSyncStatus,
  getInspectionSyncStats, generateTaskFromInspection,
  generateWarningFromInspection, generateReviewTaskFromInspection,
  getFollowupStatus, TASK_TYPE_INSPECTION, TASK_TYPE_REVIEW,
  findTaskByInspectionAndType
} from '../utils/statusSync';

const DRAFT_KEY = 'zfl-1-inspection-draft';

export function InspectionTab({
  inspections, setInspections, beds, tasks, setTasks, setBeds,
  prefillBedId, onPrefillConsumed, materials, transactions, setTransactions
}) {
  const [form, setForm] = useState({
    bedId: '',
    bedName: '',
    abnormalType: '',
    treatmentResult: '',
    note: '',
    photos: [],
    inspector: '',
    date: iso(0),
    time: new Date().toTimeString().slice(0, 5),
    followupDate: '',
    followupOwner: ''
  });

  useEffect(() => {
    if (prefillBedId) {
      const bed = beds.find(b => b.id === prefillBedId);
      if (bed) {
        setForm(prev => ({
          ...prev,
          bedId: bed.id,
          bedName: bed.name
        }));
      }
      if (onPrefillConsumed) {
        onPrefillConsumed();
      }
    }
  }, [prefillBedId, beds, onPrefillConsumed]);

  const [statusFilter, setStatusFilter] = useState('');
  const [abnormalFilter, setAbnormalFilter] = useState('');
  const [query, setQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [inspectionConsumptions, setInspectionConsumptions] = useState([]);

  const bedOptions = useMemo(() =>
    beds.map(bed => ({ id: bed.id, name: bed.name })),
    [beds]);

  const syncStats = useMemo(() =>
    getInspectionSyncStats(inspections),
    [inspections]);

  const filteredInspections = useMemo(() => {
    let result = [...inspections];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(i =>
        i.bedName.toLowerCase().includes(q) ||
        i.note.toLowerCase().includes(q) ||
        i.inspector.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter(i => i.syncStatus === statusFilter);
    }
    if (abnormalFilter) {
      result = result.filter(i => i.abnormalType === abnormalFilter);
    }
    return result.sort((a, b) =>
      new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    );
  }, [inspections, query, statusFilter, abnormalFilter]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        const draftAge = Date.now() - (draft.savedAt || 0);
        if (draftAge < 7 * 24 * 60 * 60 * 1000) {
          setRecoveredDraft(draft);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const hasContent = form.bedName || form.abnormalType || form.treatmentResult || form.note || form.inspector;
    if (hasContent) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ...form,
        savedAt: Date.now()
      }));
    }
  }, [form]);

  const selectBed = (bedId) => {
    const bed = beds.find(b => b.id === bedId);
    if (bed) {
      setForm({ ...form, bedId: bed.id, bedName: bed.name });
    } else {
      setForm({ ...form, bedId: '', bedName: '' });
    }
  };

  const addPhoto = () => {
    const photoId = crypto.randomUUID();
    const placeholderUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent('garden plant inspection photo')}&image_size=square`;
    setForm({
      ...form,
      photos: [...form.photos, { id: photoId, url: placeholderUrl, uploadedAt: new Date().toISOString() }]
    });
  };

  const removePhoto = (photoId) => {
    setForm({
      ...form,
      photos: form.photos.filter(p => p.id !== photoId)
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.bedName.trim() || !form.abnormalType || !form.treatmentResult) return;

    const abnormal = getAbnormalTypeInfo(form.abnormalType);
    const treatment = getTreatmentResultInfo(form.treatmentResult);

    const finalForm = { ...form };
    if (!treatment.needsFollowupPlan) {
      finalForm.followupDate = '';
      finalForm.followupOwner = '';
    }

    const newInspection = {
      id: crypto.randomUUID(),
      ...finalForm,
      followupTaskId: null,
      syncStatus: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    let updatedInspections = [newInspection, ...inspections];
    let updatedTasks = [...tasks];

    localStorage.removeItem(DRAFT_KEY);
    setRecoveredDraft(null);

    setForm({
      bedId: '',
      bedName: '',
      abnormalType: '',
      treatmentResult: '',
      note: '',
      photos: [],
      inspector: '',
      date: iso(0),
      time: new Date().toTimeString().slice(0, 5),
      followupDate: '',
      followupOwner: ''
    });

    if (treatment.clearsWarning) {
      setBeds(beds.map(b =>
        b.name === form.bedName ? { ...b, warning: '' } : b
      ));
    } else {
      const warningText = generateWarningFromInspection(newInspection);
      if (warningText) {
        setBeds(beds.map(b =>
          b.name === form.bedName ? { ...b, warning: warningText } : b
        ));
      }
    }

    if (treatment.createsTask) {
      const taskExists = findTaskByInspectionAndType(updatedTasks, newInspection.id, TASK_TYPE_INSPECTION);
      if (!taskExists) {
        const newTask = generateTaskFromInspection(newInspection);
        if (newTask) {
          updatedTasks = [newTask, ...updatedTasks];
        }
      }
    }

    if (treatment.needsFollowupPlan && newInspection.followupDate) {
      const reviewTaskExists = findTaskByInspectionAndType(updatedTasks, newInspection.id, TASK_TYPE_REVIEW);
      if (!reviewTaskExists) {
        const reviewTask = generateReviewTaskFromInspection(newInspection);
        if (reviewTask) {
          updatedTasks = [reviewTask, ...updatedTasks];
          newInspection.followupTaskId = reviewTask.id;
        }
      }
    }

    setTasks(updatedTasks);

    updatedInspections = updatedInspections.map(i =>
      i.id === newInspection.id ? {
        ...i,
        followupTaskId: newInspection.followupTaskId,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString()
      } : i
    );
    setInspections(updatedInspections);

    if (inspectionConsumptions.length > 0 && materials && setTransactions) {
      const bed = beds.find(b => b.name === form.bedName);
      const newTransactions = inspectionConsumptions.filter(c => c.quantity > 0).map(c => ({
        ...c,
        id: crypto.randomUUID(),
        relatedType: 'inspection',
        relatedId: newInspection.id,
        relatedName: `${form.bedName}-${getAbnormalTypeInfo(form.abnormalType).label}`,
        bedName: form.bedName,
        crop: bed && bed.crop && bed.crop !== '待播种' ? bed.crop : ''
      }));
      if (newTransactions.length > 0) {
        setTransactions([...newTransactions, ...transactions]);
      }
    }
    setInspectionConsumptions([]);
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...form,
      savedAt: Date.now()
    }));
  };

  const handleRecoverDraft = () => {
    if (recoveredDraft) {
      setForm(recoveredDraft);
      setRecoveredDraft(null);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setRecoveredDraft(null);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const { beds: updatedBeds, tasks: updatedTasks, inspections: syncedInspections, syncResults } =
      syncAllInspections(inspections, beds, tasks);

    setBeds(updatedBeds);
    setTasks(updatedTasks);

    let updatedInspections = [...syncedInspections];
    for (const result of syncResults) {
      if (result.status === 'synced') {
        updatedInspections = updateInspectionSyncStatus(
          updatedInspections, result.inspectionId, 'synced', 0
        );
      } else {
        const insp = updatedInspections.find(i => i.id === result.inspectionId);
        updatedInspections = updateInspectionSyncStatus(
          updatedInspections, result.inspectionId, 'error', (insp?.retryCount || 0) + 1
        );
      }
    }

    setInspections(updatedInspections);
    setIsSyncing(false);
  };

  const handleRetrySync = (inspectionId) => {
    setIsSyncing(true);
    setTimeout(() => {
      let updatedTasks = [...tasks];
      let updatedFollowupTaskId = null;

      setInspections(prev => prev.map(i => {
        if (i.id !== inspectionId) return i;
        const treatment = getTreatmentResultInfo(i.treatmentResult);

        if (treatment.clearsWarning) {
          setBeds(beds.map(b =>
            b.name === i.bedName ? { ...b, warning: '' } : b
          ));
        } else {
          const warningText = generateWarningFromInspection(i);
          if (warningText) {
            setBeds(beds.map(b =>
              b.name === i.bedName ? { ...b, warning: warningText } : b
            ));
          }
        }

        if (treatment.createsTask) {
          const taskExists = findTaskByInspectionAndType(updatedTasks, i.id, TASK_TYPE_INSPECTION);
          if (!taskExists) {
            const newTask = generateTaskFromInspection(i);
            if (newTask) {
              updatedTasks = [newTask, ...updatedTasks];
            }
          }
        }

        if (treatment.needsFollowupPlan && i.followupDate) {
          const existingReviewTask = findTaskByInspectionAndType(updatedTasks, i.id, TASK_TYPE_REVIEW);
          if (!existingReviewTask) {
            const reviewTask = generateReviewTaskFromInspection(i);
            if (reviewTask) {
              updatedTasks = [reviewTask, ...updatedTasks];
              updatedFollowupTaskId = reviewTask.id;
            }
          } else {
            updatedFollowupTaskId = existingReviewTask.id;
          }
        }

        return {
          ...i,
          followupTaskId: updatedFollowupTaskId || i.followupTaskId,
          syncStatus: 'synced',
          retryCount: 0,
          syncedAt: new Date().toISOString()
        };
      }));

      setTasks(updatedTasks);
      setIsSyncing(false);
    }, 300);
  };

  const handleDeleteInspection = (inspectionId) => {
    setInspections(inspections.filter(i => i.id !== inspectionId));
  };

  const allSynced = syncStats.pending === 0 && syncStats.error === 0;

  return (
    <>
      <div className="inspectionHero">
        <div>
          <h2><Bug size={20} />巡检记录</h2>
          <p>记录巡检发现的问题，同步更新菜畦状态和待办任务</p>
        </div>
        <div className="inspectionSyncBar">
          <div className="inspectionQuickStats">
            <span className="quickStat success">
              <CheckCircle2 size={12} /> {syncStats.synced} 已同步
            </span>
            {syncStats.pending > 0 && (
              <span className="quickStat">
                <Clock size={12} /> {syncStats.pending} 待同步
              </span>
            )}
            {syncStats.error > 0 && (
              <span className="quickStat danger">
                <AlertTriangle size={12} /> {syncStats.error} 同步失败
              </span>
            )}
          </div>
          <button
            className={`syncAllBtn ${isSyncing ? 'syncing' : ''}`}
            onClick={handleSyncAll}
            disabled={isSyncing || allSynced}
          >
            <RefreshCw size={16} className={isSyncing ? 'syncing' : ''} />
            {isSyncing ? '同步中...' : allSynced ? '全部已同步' : '同步全部'}
          </button>
          {allSynced && (
            <span className="allSyncedTag">
              <CheckCircle2 size={12} /> 状态一致
            </span>
          )}
        </div>
      </div>

      {recoveredDraft && (
        <div className="draftRecoverBanner">
          <FileText size={18} />
          <span>发现未保存的巡检草稿，保存于 {new Date(recoveredDraft.savedAt).toLocaleString()}</span>
          <div className="draftRecoverActions">
            <button className="miniBtn" onClick={handleRecoverDraft}>
              恢复草稿
            </button>
            <button className="miniBtn danger" onClick={handleDiscardDraft}>
              丢弃
            </button>
          </div>
        </div>
      )}

      <section className="workspace inspectionWorkspace">
        <form onSubmit={handleSubmit} className="panel inspectionFormPanel">
          <div className="inspectionForm">
            <h2><Plus size={18} />新增巡检记录</h2>

            <div className="formField">
              <label className="fieldLabel">关联菜畦</label>
              <select value={form.bedId} onChange={(e) => selectBed(e.target.value)}>
                <option value="">选择菜畦</option>
                {bedOptions.map(bed => (
                  <option key={bed.id} value={bed.id}>{bed.name}</option>
                ))}
              </select>
              {!form.bedId && bedOptions.length === 0 && (
                <p className="fieldHint">请先在"菜园总览"添加菜畦</p>
              )}
            </div>

            <div className="formField">
              <label className="fieldLabel">异常类型</label>
              <div className="abnormalTypeGrid">
                {ABNORMAL_TYPES.map(type => (
                  <button
                    key={type.key}
                    type="button"
                    className={`abnormalTypeBtn ${form.abnormalType === type.key ? `active ${type.severity}` : ''}`}
                    onClick={() => setForm({ ...form, abnormalType: type.key })}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="formField">
              <label className="fieldLabel">处理结果</label>
              <div className="treatmentResultGrid">
                {TREATMENT_RESULTS.map(result => (
                  <button
                    key={result.key}
                    type="button"
                    className={`treatmentResultBtn ${form.treatmentResult === result.key ? `active ${result.severity}` : ''}`}
                    onClick={() => {
                      const newForm = { ...form, treatmentResult: result.key };
                      if (!result.needsFollowupPlan) {
                        newForm.followupDate = '';
                        newForm.followupOwner = '';
                      }
                      setForm(newForm);
                    }}
                  >
                    {result.label}
                  </button>
                ))}
              </div>
              {form.treatmentResult && (
                <p className="fieldHint">
                  {getTreatmentResultInfo(form.treatmentResult).clearsWarning
                    ? '✓ 此结果将清除菜畦的异常提醒'
                    : '⚠ 此结果将保留或更新菜畦的异常提醒'
                  }
                  {getTreatmentResultInfo(form.treatmentResult).createsTask &&
                    '，并自动生成待处理任务'
                  }
                </p>
              )}
            </div>

            {form.treatmentResult && getTreatmentResultInfo(form.treatmentResult).needsFollowupPlan && (
              <div className="followupPlanSection">
                <div className="formField">
                  <label className="fieldLabel">
                    <span className="followupTitle">
                      <Calendar size={16} />
                      复查计划
                    </span>
                  </label>
                  <div className="grid2">
                    <div className="formField" style={{ marginBottom: 0 }}>
                      <label className="fieldLabel">复查日期</label>
                      <input
                        type="date"
                        value={form.followupDate}
                        min={iso(0)}
                        onChange={(e) => setForm({ ...form, followupDate: e.target.value })}
                      />
                    </div>
                    <div className="formField" style={{ marginBottom: 0 }}>
                      <label className="fieldLabel">复查负责人</label>
                      <input
                        placeholder="负责人姓名"
                        value={form.followupOwner}
                        onChange={(e) => setForm({ ...form, followupOwner: e.target.value })}
                      />
                    </div>
                  </div>
                  {form.followupDate && (
                    <p className="fieldHint">
                      ✓ 保存后将自动生成复查任务，任务完成后此处会标记复查已完成
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="formField">
              <label className="fieldLabel">巡检记录</label>
              <textarea
                rows="4"
                placeholder="详细描述发现的问题和处理过程..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div className="formField">
              <label className="fieldLabel">现场照片（可选）</label>
              <div className="photoPlaceholderGrid">
                {form.photos.map(photo => (
                  <div key={photo.id} className="photoPlaceholder" style={{ padding: 0, border: 'none', background: '#000' }}>
                    <img src={photo.url} alt="巡检照片" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                    <button type="button" className="photoRemoveBtn" onClick={() => removePhoto(photo.id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {form.photos.length < 6 && (
                  <button type="button" className="photoAddBtn" onClick={addPhoto}>
                    <ImageIcon size={18} />
                    添加照片
                  </button>
                )}
              </div>
            </div>

            <div className="grid2">
              <div className="formField">
                <label className="fieldLabel">巡检人</label>
                <input
                  placeholder="姓名"
                  value={form.inspector}
                  onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                />
              </div>
              <div className="formField">
                <label className="fieldLabel">日期</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="formField">
              <label className="fieldLabel">时间</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>

            {form.abnormalType && materials && (
              <div className="consumptionSuggestionSection">
                <div className="consumptionSuggestionHeader">
                  <ArrowUpCircle size={16} />
                  <span>消耗建议</span>
                  <span className="consumptionSuggestionHint">（可选，同步记入库存消耗）</span>
                </div>
                <div className="suggestionQuickAdd">
                  {getSuggestedMaterials(materials, { type: 'inspection', abnormalType: form.abnormalType }).map((rule, idx) => {
                    const firstMat = rule.materials[0];
                    const alreadyAdded = inspectionConsumptions.find(c => c.materialId === firstMat?.id);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`suggestionChip ${alreadyAdded ? 'added' : ''}`}
                        onClick={() => {
                          if (!firstMat || alreadyAdded) return;
                          const entry = buildTransactionEntry(firstMat.id, materials, {
                            quantity: rule.defaultQty,
                            note: rule.label
                          });
                          if (entry) {
                            setInspectionConsumptions([...inspectionConsumptions, entry]);
                          }
                        }}
                        disabled={!!alreadyAdded}
                      >
                        <Package size={12} />
                        {rule.label}
                        {!alreadyAdded && <span className="suggestionQty">+{rule.defaultQty}{firstMat?.unit}</span>}
                        {alreadyAdded && ' ✓'}
                      </button>
                    );
                  })}
                </div>
                {inspectionConsumptions.length > 0 && (
                  <div className="consumptionItems">
                    {inspectionConsumptions.map((c) => {
                      const availableMaterials = materials.filter(
                        m => !inspectionConsumptions.find(x => x.materialId === m.id && x.materialId !== c.materialId)
                      );
                      return (
                      <div key={c.materialId} className="consumptionItem">
                        <select
                          value={c.materialId}
                          onChange={(e) => {
                            const newMatId = e.target.value;
                            const existing = inspectionConsumptions.find(x => x.materialId === newMatId);
                            if (existing) return;
                            const entry = buildTransactionEntry(newMatId, materials, { quantity: c.quantity });
                            if (entry) {
                              setInspectionConsumptions(inspectionConsumptions.map(x =>
                                x.materialId === c.materialId ? entry : x
                              ));
                            }
                          }}
                        >
                          <option value={c.materialId}>{c.materialName}（{c.unit}）</option>
                          {availableMaterials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}（{m.unit}）</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="数量"
                          value={c.quantity || ''}
                          onChange={(e) => {
                            setInspectionConsumptions(inspectionConsumptions.map(x =>
                              x.materialId === c.materialId ? { ...x, quantity: Number(e.target.value) || 0 } : x
                            ));
                          }}
                          style={{ width: '80px' }}
                        />
                        <span className="consumptionUnit">{c.unit}</span>
                        <button
                          type="button"
                          className="consumptionRemoveBtn"
                          onClick={() => {
                            setInspectionConsumptions(inspectionConsumptions.filter(x => x.materialId !== c.materialId));
                          }}
                        >
                          ×
                        </button>
                      </div>
                      );
                    })}
                    {materials.filter(m => !inspectionConsumptions.find(c => c.materialId === m.id)).length > 0 && (
                      <button type="button" className="consumptionAddBtn" onClick={() => {
                        const available = materials.filter(m => !inspectionConsumptions.find(c => c.materialId === m.id));
                        if (available.length === 0) return;
                        const first = available[0];
                        const entry = buildTransactionEntry(first.id, materials, { quantity: 1 });
                        if (entry) {
                          setInspectionConsumptions([...inspectionConsumptions, entry]);
                        }
                      }}>
                        <Plus size={12} /> 添加物资
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="inspectionFormActions">
              <button type="button" className="draftBtn" onClick={handleSaveDraft}>
                <FileText size={14} /> 保存草稿
              </button>
              <button
                type="submit"
                className="primaryBtn"
                disabled={!form.bedName.trim() || !form.abnormalType || !form.treatmentResult}
              >
                <Save size={14} /> 保存记录
              </button>
            </div>
          </div>
        </form>

        <div className="panel wide inspectionListPanel">
          <div className="toolbar">
            <h2>巡检记录列表</h2>
            <div className="toolbarActions">
              <select
                className="filterSelect"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">全部同步状态</option>
                <option value="synced">已同步</option>
                <option value="pending">待同步</option>
                <option value="error">同步失败</option>
              </select>
              <select
                className="filterSelect"
                value={abnormalFilter}
                onChange={(e) => setAbnormalFilter(e.target.value)}
              >
                <option value="">全部异常类型</option>
                {ABNORMAL_TYPES.map(type => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>
              <label>
                <Search size={16} />
                <input
                  placeholder="搜索菜畦/内容/巡检人"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
          </div>

          {filteredInspections.length === 0 ? (
            <div className="emptyState">
              <Bug size={36} />
              <p>暂无巡检记录{query || statusFilter || abnormalFilter ? '（请调整筛选条件）' : ''}</p>
              <p className="muted">添加巡检记录后将在此展示</p>
            </div>
          ) : (
            <div className="inspectionList">
              {filteredInspections.map(inspection => {
                const abnormal = getAbnormalTypeInfo(inspection.abnormalType);
                const treatment = getTreatmentResultInfo(inspection.treatmentResult);
                const followupStatus = getFollowupStatus(inspection, tasks);
                return (
                  <div
                    key={inspection.id}
                    className={`inspectionCard sync-${abnormal.severity}`}
                  >
                    <div className="inspectionCardHeader">
                      <div className="inspectionCardTitle">
                        <strong>{inspection.bedName}</strong>
                        <span className={`abnormalTag ${abnormal.severity}`}>
                          {abnormal.label}
                        </span>
                        <span className={`abnormalTag ${treatment.severity}`} style={{ opacity: 0.85 }}>
                          {treatment.label}
                        </span>
                        {followupStatus.key !== 'none' && followupStatus.key !== 'not_required' && (
                          <span className={`followupStatusTag ${followupStatus.key} ${followupStatus.overdue ? 'overdue' : ''}`}>
                            {followupStatus.key === 'completed' && <CheckCircle2 size={12} />}
                            {followupStatus.overdue && <AlertTriangle size={12} />}
                            {followupStatus.key === 'pending' && <Clock size={12} />}
                            {followupStatus.label}
                          </span>
                        )}
                      </div>
                      <div className="inspectionCardSync">
                        <span style={{ fontSize: '12px', color: '#71806a' }}>
                          {inspection.date} {inspection.time} · {inspection.inspector || '未知'}
                        </span>
                        <span className={`syncStatusTag ${inspection.syncStatus === 'synced' ? 'success' : inspection.syncStatus === 'error' ? 'danger' : 'warning'}`}>
                          {inspection.syncStatus === 'synced' ? '已同步' :
                            inspection.syncStatus === 'error' ? '同步失败' : '待同步'}
                        </span>
                        {inspection.retryCount > 0 && (
                          <span className="retryCount">
                            重试 {inspection.retryCount} 次
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="inspectionCardBody">
                      <p className="inspectionNote">{inspection.note}</p>
                      {inspection.followupDate && treatment.needsFollowupPlan && (
                        <div className="followupInfo">
                          <div className="followupInfoItem">
                            <Calendar size={12} />
                            <span>复查日期：{inspection.followupDate}</span>
                          </div>
                          {inspection.followupOwner && (
                            <div className="followupInfoItem">
                              <User size={12} />
                              <span>负责人：{inspection.followupOwner}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {inspection.photos && inspection.photos.length > 0 && (
                        <div className="photoPlaceholderGrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '8px' }}>
                          {inspection.photos.slice(0, 4).map(photo => (
                            <div key={photo.id} className="photoPlaceholder" style={{ padding: 0, border: 'none', background: '#000', cursor: 'pointer' }}
                              onClick={() => setSelectedPhoto(photo.url)}
                            >
                              <img src={photo.url} alt="巡检照片" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {inspection.syncStatus !== 'synced' && (
                          <button
                            type="button"
                            className="miniBtn"
                            onClick={() => handleRetrySync(inspection.id)}
                            disabled={isSyncing}
                          >
                            <RefreshCw size={12} />
                            {inspection.syncStatus === 'error' ? '重试同步' : '立即同步'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="miniBtn"
                          style={{ marginLeft: 'auto', background: '#fbe3e3', color: '#8a2c2c', borderColor: '#e8c9bc' }}
                          onClick={() => handleDeleteInspection(inspection.id)}
                        >
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedPhoto && (
        <div className="modalOverlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modalContent" style={{ maxWidth: '600px', background: 'transparent', boxShadow: 'none' }} onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto} alt="巡检照片" style={{ width: '100%', borderRadius: '8px' }} />
            <button className="closeBtn" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff' }} onClick={() => setSelectedPhoto(null)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}
