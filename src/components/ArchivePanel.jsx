import React, { useState, useRef, useMemo } from 'react';
import {
  Download, Upload, FileJson, AlertCircle, CheckCircle2,
  X, ChevronDown, ChevronRight, Trash2, Info, ArrowRight,
  Clock, Bug, Package, Sprout, MessageCircle, Users, Calendar,
  Leaf, Wheat, Archive, Map, RefreshCw
} from 'lucide-react';
import {
  buildArchive,
  downloadArchive,
  parseArchiveFile,
  validateArchiveData,
  computeDiff,
  applyImport,
  persistToLocalStorage,
  summarizeImport,
  ENTITY_LABELS,
  STORAGE_KEYS
} from '../utils/archive';

const ENTITY_ICONS = {
  beds: Leaf,
  harvests: Wheat,
  tasks: Clock,
  schedules: Users,
  contacts: MessageCircle,
  plants: Sprout,
  materials: Package,
  transactions: RefreshCw,
  inspections: Bug,
  bedPlacement: Map
};

export function ArchivePanel({ currentState, onImportComplete }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedArchive, setParsedArchive] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [validation, setValidation] = useState(null);
  const [diff, setDiff] = useState(null);
  const [conflictResolution, setConflictResolution] = useState({});
  const [expandedEntities, setExpandedEntities] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = () => {
    const archive = buildArchive(currentState);
    downloadArchive(archive);
  };

  const processFile = async (file) => {
    setParseError(null);
    setParsedArchive(null);
    setValidation(null);
    setDiff(null);
    setConflictResolution({});
    setImportResult(null);

    try {
      const archive = await parseArchiveFile(file);
      setParsedArchive(archive);

      const val = validateArchiveData(archive);
      setValidation(val);

      const diffResult = computeDiff(currentState, archive.data);
      setDiff(diffResult);

      const initialResolution = { conflicts: {} };
      Object.keys(diffResult).forEach((key) => {
        if (diffResult[key]?.conflicts) {
          initialResolution.conflicts[key] = {};
          diffResult[key].conflicts.forEach((c) => {
            initialResolution.conflicts[key][c.id] = 'incoming';
          });
        }
      });
      setConflictResolution(initialResolution);
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleEntityExpand = (key) => {
    setExpandedEntities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resolveConflict = (entityKey, itemId, resolution) => {
    setConflictResolution((prev) => ({
      ...prev,
      conflicts: {
        ...prev.conflicts,
        [entityKey]: {
          ...(prev.conflicts?.[entityKey] || {}),
          [itemId]: resolution
        }
      }
    }));
  };

  const handleConfirmImport = async () => {
    if (!parsedArchive || !diff) return;
    setIsProcessing(true);

    try {
      const { mergedState, summary } = applyImport(
        currentState,
        parsedArchive.data,
        diff,
        conflictResolution
      );

      const savedKeys = persistToLocalStorage(mergedState);
      const importSummary = summarizeImport(summary);

      setImportResult({
        summary: importSummary,
        savedKeys,
        mergedState,
        rawSummary: summary
      });

      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete(mergedState);
        }, 300);
      }
    } catch (err) {
      setParseError(`导入失败：${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setParsedArchive(null);
    setParseError(null);
    setValidation(null);
    setDiff(null);
    setConflictResolution({});
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const diffStats = useMemo(() => {
    if (!diff) return null;
    const stats = {};
    Object.keys(ENTITY_LABELS).forEach((key) => {
      if (key === 'bedPlacement') return;
      const d = diff[key];
      if (!d) return;
      stats[key] = {
        added: d.added?.length || 0,
        updated: d.updated?.length || 0,
        conflicts: d.conflicts?.length || 0,
        unchanged: d.unchanged?.length || 0,
        localOnly: d.localOnly?.length || 0
      };
    });
    return stats;
  }, [diff]);

  return (
    <div className="archivePanel">
      <div className="archiveHeader">
        <h2><Archive size={20} />菜园运营档案</h2>
        <p className="archiveSubtitle">导出完整运营数据为JSON，或导入历史档案进行合并</p>
      </div>

      <div className="archiveActionsRow">
        <button type="button" className="btn btnPrimary archiveExportBtn" onClick={handleExport}>
          <Download size={16} />
          导出当前档案
        </button>
        <div className="archiveDivider">或</div>
        <div
          className={`archiveDropZone ${isDragOver ? 'dragOver' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          <span>点击选择JSON档案，或拖拽文件到此处</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
        {(parsedArchive || parseError) && (
          <button type="button" className="btn btnGhost" onClick={resetImport}>
            <X size={14} /> 清除
          </button>
        )}
      </div>

      {parseError && (
        <div className="archiveAlert archiveAlertError">
          <AlertCircle size={18} />
          <div>
            <strong>档案解析失败</strong>
            <p>{parseError}</p>
          </div>
        </div>
      )}

      {importResult && (
        <ImportResultSummary result={importResult} onClose={resetImport} />
      )}

      {parsedArchive && !importResult && (
        <>
          <div className="archiveInfoCard">
            <div className="archiveInfoHeader">
              <FileJson size={18} />
              <div>
                <strong>档案信息</strong>
                <p>
                  导出时间：{new Date(parsedArchive.exportedAt).toLocaleString('zh-CN')}
                  &nbsp;·&nbsp; 版本：v{parsedArchive.version}
                </p>
              </div>
            </div>
            <div className="archiveStatsGrid">
              {Object.entries(parsedArchive.stats || {}).map(([key, count]) => {
                const Icon = ENTITY_ICONS[key] || Info;
                return (
                  <div className="archiveStatItem" key={key}>
                    <Icon size={14} />
                    <span className="archiveStatLabel">{ENTITY_LABELS[key] || key}</span>
                    <span className="archiveStatValue">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {validation && (
            <ValidationDisplay validation={validation} />
          )}

          {diff && diffStats && (
            <DiffDisplay
              diff={diff}
              diffStats={diffStats}
              expandedEntities={expandedEntities}
              onToggleExpand={toggleEntityExpand}
              conflictResolution={conflictResolution}
              onResolveConflict={resolveConflict}
            />
          )}

          <div className="archiveConfirmRow">
            <p className="archiveConfirmHint">
              <Info size={14} />
              导入将保留本地未冲突的现有数据，冲突项按您选择的方式处理
            </p>
            <button
              type="button"
              className="btn btnPrimary archiveConfirmBtn"
              onClick={handleConfirmImport}
              disabled={isProcessing || (validation?.errors?.length ?? 0) > 0}
            >
              {isProcessing ? '导入中...' : '确认导入并合并'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ValidationDisplay({ validation }) {
  const { errors, warnings } = validation;
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="archiveAlert archiveAlertSuccess">
        <CheckCircle2 size={18} />
        <div>
          <strong>数据验证通过</strong>
          <p>未发现格式错误或引用异常</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archiveValidationSection">
      {errors.length > 0 && (
        <div className="archiveAlert archiveAlertError">
          <AlertCircle size={18} />
          <div>
            <strong>发现 {errors.length} 项错误（必须修复后才能导入）</strong>
            <ul className="archiveValidationList">
              {errors.slice(0, 20).map((e, i) => (
                <li key={`err-${i}`}>
                  <span className={`validationTag validationTagError`}>
                    {ENTITY_LABELS[e.type] || e.type}
                    {e.field ? `·${e.field}` : ''}
                  </span>
                  {e.message}
                </li>
              ))}
              {errors.length > 20 && <li>...以及 {errors.length - 20} 项</li>}
            </ul>
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="archiveAlert archiveAlertWarning">
          <Info size={18} />
          <div>
            <strong>发现 {warnings.length} 项警告（可继续导入，但可能丢失关联）</strong>
            <ul className="archiveValidationList">
              {warnings.slice(0, 30).map((w, i) => (
                <li key={`warn-${i}`}>
                  <span className={`validationTag validationTagWarning`}>
                    {ENTITY_LABELS[w.type] || w.type}
                    {w.field ? `·${w.field}` : ''}
                  </span>
                  {w.message}
                </li>
              ))}
              {warnings.length > 30 && <li>...以及 {warnings.length - 30} 项</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffDisplay({ diff, diffStats, expandedEntities, onToggleExpand, conflictResolution, onResolveConflict }) {
  const totalAdded = Object.values(diffStats).reduce((s, v) => s + v.added, 0);
  const totalUpdated = Object.values(diffStats).reduce((s, v) => s + v.updated, 0);
  const totalConflicts = Object.values(diffStats).reduce((s, v) => s + v.conflicts, 0);
  const totalUnchanged = Object.values(diffStats).reduce((s, v) => s + v.unchanged, 0);
  const totalLocalOnly = Object.values(diffStats).reduce((s, v) => s + v.localOnly, 0);

  return (
    <div className="archiveDiffSection">
      <div className="archiveDiffHeader">
        <h3><ArrowRight size={16} />差异预览</h3>
        <div className="archiveDiffSummary">
          <span className="diffBadge diffAdded">+{totalAdded} 新增</span>
          <span className="diffBadge diffUpdated">~{totalUpdated} 更新</span>
          <span className="diffBadge diffConflict">!{totalConflicts} 冲突</span>
          <span className="diffBadge diffUnchanged">={totalUnchanged} 相同</span>
          <span className="diffBadge diffLocalOnly">◈{totalLocalOnly} 保留</span>
        </div>
      </div>

      {Object.entries(diffStats).map(([key, stats]) => {
        const hasChanges = stats.added > 0 || stats.updated > 0 || stats.conflicts > 0 || stats.localOnly > 0;
        if (!hasChanges && stats.unchanged === 0) return null;
        const Icon = ENTITY_ICONS[key] || Info;
        const isExpanded = !!expandedEntities[key];
        const entityDiff = diff[key];

        return (
          <div key={key} className="archiveEntityBlock">
            <button
              type="button"
              className={`archiveEntityHeader ${hasChanges ? 'hasChanges' : ''}`}
              onClick={() => onToggleExpand(key)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Icon size={16} />
              <span className="archiveEntityLabel">{ENTITY_LABELS[key]}</span>
              <div className="archiveEntityCounts">
                {stats.added > 0 && <span className="diffBadge diffAdded">+{stats.added}</span>}
                {stats.updated > 0 && <span className="diffBadge diffUpdated">~{stats.updated}</span>}
                {stats.conflicts > 0 && <span className="diffBadge diffConflict">!{stats.conflicts}</span>}
                {stats.unchanged > 0 && <span className="diffBadge diffUnchanged">={stats.unchanged}</span>}
                {stats.localOnly > 0 && <span className="diffBadge diffLocalOnly">◈{stats.localOnly}</span>}
              </div>
            </button>

            {isExpanded && entityDiff && (
              <div className="archiveEntityDetails">
                {entityDiff.added && entityDiff.added.length > 0 && (
                  <div className="archiveDiffGroup">
                    <h4 className="diffGroupTitle diffGroupAdded">
                      <span className="diffMarker">+</span>新增 {entityDiff.added.length} 条
                    </h4>
                    <ul className="archiveItemList">
                      {entityDiff.added.slice(0, 10).map((a) => (
                        <li key={a.id} className="archiveItem archiveItemAdded">
                          <ItemPreview item={a.incoming} entityKey={key} />
                        </li>
                      ))}
                      {entityDiff.added.length > 10 && (
                        <li className="archiveMore">...以及 {entityDiff.added.length - 10} 条</li>
                      )}
                    </ul>
                  </div>
                )}

                {entityDiff.updated && entityDiff.updated.length > 0 && (
                  <div className="archiveDiffGroup">
                    <h4 className="diffGroupTitle diffGroupUpdated">
                      <span className="diffMarker">~</span>更新 {entityDiff.updated.length} 条
                    </h4>
                    <ul className="archiveItemList">
                      {entityDiff.updated.slice(0, 10).map((u) => (
                        <li key={u.id} className="archiveItem archiveItemUpdated">
                          <ItemDiffPreview
                            current={u.current}
                            incoming={u.incoming}
                            entityKey={key}
                          />
                        </li>
                      ))}
                      {entityDiff.updated.length > 10 && (
                        <li className="archiveMore">...以及 {entityDiff.updated.length - 10} 条</li>
                      )}
                    </ul>
                  </div>
                )}

                {entityDiff.conflicts && entityDiff.conflicts.length > 0 && (
                  <div className="archiveDiffGroup">
                    <h4 className="diffGroupTitle diffGroupConflict">
                      <span className="diffMarker">!</span>冲突 {entityDiff.conflicts.length} 条（请选择保留版本）
                    </h4>
                    <ul className="archiveItemList">
                      {entityDiff.conflicts.map((c) => {
                        const resolution = conflictResolution?.conflicts?.[key]?.[c.id] || 'incoming';
                        return (
                          <li key={c.id} className="archiveItem archiveItemConflict">
                            <ConflictResolver
                              current={c.current}
                              incoming={c.incoming}
                              entityKey={key}
                              fields={c.fields}
                              resolution={resolution}
                              onResolve={(r) => onResolveConflict(key, c.id, r)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {entityDiff.localOnly && entityDiff.localOnly.length > 0 && (
                  <div className="archiveDiffGroup">
                    <h4 className="diffGroupTitle diffGroupLocalOnly">
                      <span className="diffMarker">◈</span>本地独有 {entityDiff.localOnly.length} 条（将保留）
                    </h4>
                    <ul className="archiveItemList">
                      {entityDiff.localOnly.slice(0, 5).map((l) => (
                        <li key={l.id} className="archiveItem archiveItemLocal">
                          <ItemPreview item={l.item} entityKey={key} muted />
                        </li>
                      ))}
                      {entityDiff.localOnly.length > 5 && (
                        <li className="archiveMore">...以及 {entityDiff.localOnly.length - 5} 条</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemPreview({ item, entityKey, muted = false }) {
  const label = getItemLabel(item, entityKey);
  return (
    <div className={`itemPreview ${muted ? 'muted' : ''}`}>
      <span className="itemPreviewLabel">{label}</span>
      <span className="itemPreviewMeta">{getItemMeta(item, entityKey)}</span>
    </div>
  );
}

function ItemDiffPreview({ current, incoming, entityKey }) {
  const label = getItemLabel(incoming, entityKey);
  return (
    <div className="itemDiffPreview">
      <div className="itemDiffLabel">{label}</div>
      <div className="itemDiffFields">
        {getChangedFields(current, incoming).slice(0, 3).map((f) => (
          <div key={f.field} className="itemDiffField">
            <span className="diffFieldName">{f.field}</span>
            <span className="diffFieldCurrent">{formatValue(f.current)}</span>
            <ArrowRight size={12} />
            <span className="diffFieldIncoming">{formatValue(f.incoming)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictResolver({ current, incoming, entityKey, fields, resolution, onResolve }) {
  const label = getItemLabel(incoming, entityKey);
  return (
    <div className="conflictResolver">
      <div className="conflictHeader">
        <span className="conflictLabel">{label}</span>
        <div className="conflictResolveButtons">
          <button
            type="button"
            className={`miniResolveBtn ${resolution === 'incoming' ? 'active incoming' : ''}`}
            onClick={() => onResolve('incoming')}
          >
            ← 使用导入版本
          </button>
          <button
            type="button"
            className={`miniResolveBtn ${resolution === 'current' ? 'active current' : ''}`}
            onClick={() => onResolve('current')}
          >
            保留当前版本 →
          </button>
        </div>
      </div>
      <div className="conflictFields">
        {fields.map((f) => (
          <div key={f.field} className={`conflictField ${f.isHigh ? 'high' : ''}`}>
            <span className="conflictFieldName">
              {f.field}
              {f.isHigh && <span className="highSensitivityTag">关键字段</span>}
            </span>
            <div className="conflictFieldCompare">
              <div className={`conflictValue conflictValueCurrent ${resolution === 'current' ? 'selected' : ''}`}>
                <span className="conflictValueLabel">当前</span>
                <span className="conflictValueContent">{formatValue(f.current)}</span>
              </div>
              <div className={`conflictValue conflictValueIncoming ${resolution === 'incoming' ? 'selected' : ''}`}>
                <span className="conflictValueLabel">导入</span>
                <span className="conflictValueContent">{formatValue(f.incoming)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportResultSummary({ result, onClose }) {
  const { summary, savedKeys } = result;

  return (
    <div className="archiveAlert archiveAlertSuccess archiveImportResult">
      <div className="importResultHeader">
        <CheckCircle2 size={22} />
        <div>
          <strong>导入完成！</strong>
          <p>
            共处理 {summary.totalAdded + summary.totalUpdated + summary.totalIncoming + summary.totalCurrent + summary.totalUnchanged} 条数据
            ，写入 {savedKeys.length} 个 localStorage 键
          </p>
        </div>
        <button type="button" className="btn btnGhost btnSmall" onClick={onClose}>
          <X size={14} /> 关闭
        </button>
      </div>

      <div className="importResultTotals">
        <div className="resultStat resultStatAdded">
          <span className="resultStatNum">+{summary.totalAdded}</span>
          <span className="resultStatLabel">新增</span>
        </div>
        <div className="resultStat resultStatUpdated">
          <span className="resultStatNum">~{summary.totalUpdated}</span>
          <span className="resultStatLabel">更新</span>
        </div>
        <div className="resultStat resultStatIncoming">
          <span className="resultStatNum">↙{summary.totalIncoming}</span>
          <span className="resultStatLabel">冲突采纳导入</span>
        </div>
        <div className="resultStat resultStatCurrent">
          <span className="resultStatNum">↗{summary.totalCurrent}</span>
          <span className="resultStatLabel">冲突保留当前</span>
        </div>
        <div className="resultStat resultStatKept">
          <span className="resultStatNum">◈{summary.totalKept}</span>
          <span className="resultStatLabel">本地独有保留</span>
        </div>
      </div>

      <div className="importResultEntities">
        {summary.byEntity.filter((e) =>
          e.added > 0 || e.updated > 0 || e.conflictsIncoming > 0 || e.conflictsCurrent > 0
        ).map((e) => (
          <div key={e.key} className="resultEntityRow">
            <span className="resultEntityName">
              {ENTITY_ICONS[e.key] ? React.createElement(ENTITY_ICONS[e.key], { size: 14 }) : null}
              {e.label}
            </span>
            <div className="resultEntityCounts">
              {e.added > 0 && <span className="diffBadge diffAdded">+{e.added}</span>}
              {e.updated > 0 && <span className="diffBadge diffUpdated">~{e.updated}</span>}
              {e.conflictsIncoming > 0 && <span className="diffBadge diffConflict">↙{e.conflictsIncoming}</span>}
              {e.conflictsCurrent > 0 && <span className="diffBadge diffLocalOnly">↗{e.conflictsCurrent}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="importResultKeys">
        <p className="keysTitle">已同步到 localStorage：</p>
        <div className="keysList">
          {savedKeys.map((k) => (
            <span key={k} className="storageKeyTag">{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getItemLabel(item, entityKey) {
  if (!item) return '(空)';
  switch (entityKey) {
    case 'beds': return item.name || item.id;
    case 'harvests': return `${item.crop || '作物'} ${item.weight || ''}`.trim();
    case 'tasks': return item.title || item.id;
    case 'schedules': return `${item.volunteer || '志愿者'} · ${item.duty || ''} · ${item.date || ''}`;
    case 'contacts': return `${item.type || '联系'} · ${item.adopter || ''} · ${item.date || ''}`;
    case 'plants': return `${item.bedName || ''} ${item.crop || '种植'}`.trim();
    case 'materials': return item.name || item.id;
    case 'transactions': return `${item.type === 'inbound' ? '入库' : '消耗'} ${item.materialName || ''} ${item.quantity || ''}${item.unit || ''}`;
    case 'inspections': return `${item.bedName || ''} ${item.abnormalType || '巡检'}`.trim();
    default: return item.id || item.name || '(未知)';
  }
}

function getItemMeta(item, entityKey) {
  const parts = [];
  if (entityKey === 'beds') {
    if (item.adopter) parts.push(item.adopter);
    if (item.status) parts.push(item.status);
  } else if (entityKey === 'harvests') {
    if (item.bed) parts.push(item.bed);
    if (item.date) parts.push(item.date);
  } else if (entityKey === 'tasks') {
    if (item.due) parts.push(item.due);
    parts.push(item.done ? '已完成' : '待办');
  } else if (entityKey === 'inspections') {
    if (item.inspector) parts.push(item.inspector);
    if (item.date) parts.push(item.date);
  } else if (entityKey === 'materials') {
    if (item.category) parts.push(item.category);
  } else if (entityKey === 'transactions') {
    if (item.date) parts.push(item.date);
    if (item.relatedName) parts.push(item.relatedName);
  }
  return parts.join(' · ');
}

function getChangedFields(a, b) {
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const changes = [];
  allKeys.forEach((k) => {
    if (k === 'id') return;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      changes.push({ field: k, current: a[k], incoming: b[k] });
    }
  });
  return changes;
}

function formatValue(v) {
  if (v === null || v === undefined) return '(空)';
  if (typeof v === 'object') {
    try {
      const str = JSON.stringify(v);
      return str.length > 60 ? str.slice(0, 57) + '...' : str;
    } catch {
      return String(v);
    }
  }
  const str = String(v);
  return str.length > 60 ? str.slice(0, 57) + '...' : str;
}
