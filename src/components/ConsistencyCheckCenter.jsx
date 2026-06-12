import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, Info, RefreshCw, CheckCircle2,
  Bug, Leaf, Clock, Package, User, Sprout, Database,
  ChevronDown, ChevronRight, Wrench, X
} from 'lucide-react';
import {
  ISSUE_SEVERITY, ISSUE_CATEGORIES, CATEGORY_LABELS,
  getConsistencyStats
} from '../utils/consistencyCheck';

const SEVERITY_ICONS = {
  [ISSUE_SEVERITY.CRITICAL]: AlertCircle,
  [ISSUE_SEVERITY.WARNING]: AlertTriangle,
  [ISSUE_SEVERITY.INFO]: Info
};

const SEVERITY_COLORS = {
  [ISSUE_SEVERITY.CRITICAL]: { bg: '#fbe3e3', text: '#8a2c2c', border: '#e8c9bc' },
  [ISSUE_SEVERITY.WARNING]: { bg: '#fbf0e3', text: '#8a5a2c', border: '#e8d9bc' },
  [ISSUE_SEVERITY.INFO]: { bg: '#e3f0fb', text: '#2c5f8a', border: '#bcd8ef' }
};

const CATEGORY_ICONS = {
  [ISSUE_CATEGORIES.BED_WARNING]: Leaf,
  [ISSUE_CATEGORIES.INSPECTION_SYNC]: Bug,
  [ISSUE_CATEGORIES.TASK_DUPLICATE]: Clock,
  [ISSUE_CATEGORIES.HARVEST_DISTRIBUTION]: Package,
  [ISSUE_CATEGORIES.PICKUP_STATUS]: User,
  [ISSUE_CATEGORIES.PLANT_PLAN]: Sprout,
  [ISSUE_CATEGORIES.INVENTORY_REFERENCE]: Database
};

const AFFECTED_TYPE_LABELS = {
  bed: '菜畦',
  inspection: '巡检',
  task: '任务',
  harvest: '采收',
  plant: '种植计划',
  transaction: '库存流水',
  contact: '联系记录',
  material: '物资'
};

const FIX_TYPE_LABELS = {
  clear_bed_warning: '清除菜畦警告',
  remove_duplicate_tasks: '删除重复任务',
  adjust_distribution: '按比例调整分配',
  update_bed_status: '更新菜畦状态',
  clear_transaction_relation: '清除无效关联',
  retry_sync_inspection: '重试同步巡检',
  send_pickup_notice: '发送取菜通知',
  sync_pickup_confirmation: '同步取菜确认状态',
  review_inspection_status: '查看巡检详情',
  handle_missing_material: '无法自动修复'
};

export function ConsistencyCheckCenter({
  issues,
  onRefresh,
  onFixIssue,
  onBatchFix,
  isChecking,
  lastChecked,
  beds, tasks, inspections, harvests, plants, transactions, contacts
}) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [fixingIssueId, setFixingIssueId] = useState(null);
  const [isBatchFixing, setIsBatchFixing] = useState(false);
  const [batchFixProgress, setBatchFixProgress] = useState({ current: 0, total: 0 });

  const stats = useMemo(() => getConsistencyStats(issues), [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (selectedCategory && issue.category !== selectedCategory) return false;
      if (selectedSeverity && issue.severity !== selectedSeverity) return false;
      return true;
    });
  }, [issues, selectedCategory, selectedSeverity]);

  const issuesByCategory = useMemo(() => {
    const grouped = {};
    for (const category of Object.values(ISSUE_CATEGORIES)) {
      grouped[category] = filteredIssues.filter(i => i.category === category);
    }
    return grouped;
  }, [filteredIssues]);

  const handleFix = async (issue) => {
    setFixingIssueId(issue.id);
    try {
      await onFixIssue(issue);
    } finally {
      setTimeout(() => setFixingIssueId(null), 500);
    }
  };

  const handleFixAll = async (severity = null) => {
    const issuesToFix = severity
      ? filteredIssues.filter(i => i.severity === severity)
      : filteredIssues;
    const autoFixable = issuesToFix.filter(i => canAutoFix(i));
    
    if (autoFixable.length === 0) return;
    
    setIsBatchFixing(true);
    setBatchFixProgress({ current: 0, total: autoFixable.length });
    
    try {
      await onBatchFix(autoFixable);
    } finally {
      setBatchFixProgress({ current: autoFixable.length, total: autoFixable.length });
      setTimeout(() => {
        setIsBatchFixing(false);
        setBatchFixProgress({ current: 0, total: 0 });
      }, 500);
    }
  };

  const handleFixCategory = async (categoryIssues) => {
    const autoFixable = categoryIssues.filter(i => canAutoFix(i));
    
    if (autoFixable.length === 0) return;
    
    setIsBatchFixing(true);
    setBatchFixProgress({ current: 0, total: autoFixable.length });
    
    try {
      await onBatchFix(autoFixable);
    } finally {
      setBatchFixProgress({ current: autoFixable.length, total: autoFixable.length });
      setTimeout(() => {
        setIsBatchFixing(false);
        setBatchFixProgress({ current: 0, total: 0 });
      }, 500);
    }
  };

  const toggleExpand = (issueId) => {
    setExpandedIssueId(expandedIssueId === issueId ? null : issueId);
  };

  const getAffectedItemLink = (item) => {
    const labels = {
      bed: beds.find(b => b.id === item.id)?.name,
      inspection: inspections.find(i => i.id === item.id)?.bedName,
      task: tasks.find(t => t.id === item.id)?.title,
      harvest: (h => h ? `${h.crop} ${h.weight}` : null)(harvests.find(h => h.id === item.id)),
      plant: (p => p ? `${p.bedName}-${p.crop}` : null)(plants.find(p => p.id === item.id)),
      transaction: (t => t ? `${t.materialName} ${t.type === 'inbound' ? '入库' : '消耗'}` : null)(transactions.find(t => t.id === item.id)),
      contact: contacts.find(c => c.id === item.id)?.type,
      material: null
    };
    return labels[item.type] || item.name;
  };

  const canAutoFix = (issue) => {
    return ![
      'handle_missing_material',
      'review_inspection_status'
    ].includes(issue.fixType);
  };

  return (
    <div className="consistencyCheckCenter">
      <div className="consistencyHeader">
        <div className="consistencyTitle">
          <h2><Wrench size={20} />运营一致性检查中心</h2>
          {lastChecked && (
            <span className="lastChecked">
              上次检查：{lastChecked.toLocaleString('zh-CN')}
            </span>
          )}
        </div>
        <div className="consistencyActions">
          {isBatchFixing && (
            <span className="batchProgress">
              <RefreshCw size={14} className="spinning" />
              批量修复中 {batchFixProgress.current}/{batchFixProgress.total}
            </span>
          )}
          <button
            className="miniBtn"
            onClick={() => handleFixAll()}
            disabled={filteredIssues.length === 0 || isChecking || isBatchFixing}
          >
            <CheckCircle2 size={14} />一键修复全部
          </button>
          {stats.critical > 0 && (
            <button
              className="miniBtn"
              style={{ background: '#8a2c2c', color: '#fff', borderColor: '#8a2c2c' }}
              onClick={() => handleFixAll(ISSUE_SEVERITY.CRITICAL)}
              disabled={isChecking || isBatchFixing}
            >
              <AlertCircle size={14} />修复严重问题 ({stats.critical})
            </button>
          )}
          <button
            className="miniBtn"
            onClick={onRefresh}
            disabled={isChecking || isBatchFixing}
          >
            <RefreshCw size={14} className={isChecking || isBatchFixing ? 'spinning' : ''} />
            {isChecking ? '检查中...' : '重新检查'}
          </button>
        </div>
      </div>

      <section className="dashboard consistencyStats">
        <article>
          <h2>总问题数</h2>
          <p className="statNumber" style={{ color: stats.total > 0 ? '#8a5a2c' : '#2f613a' }}>
            {stats.total}<span>项</span>
          </p>
        </article>
        <article>
          <h2 style={{ color: '#8a2c2c' }}><AlertCircle size={16} />严重</h2>
          <p className="statNumber" style={{ color: '#8a2c2c' }}>{stats.critical}<span>项</span></p>
        </article>
        <article>
          <h2 style={{ color: '#8a5a2c' }}><AlertTriangle size={16} />警告</h2>
          <p className="statNumber" style={{ color: '#8a5a2c' }}>{stats.warning}<span>项</span></p>
        </article>
        <article>
          <h2 style={{ color: '#2c5f8a' }}><Info size={16} />提示</h2>
          <p className="statNumber" style={{ color: '#2c5f8a' }}>{stats.info}<span>项</span></p>
        </article>
      </section>

      <div className="categoryFilterBar">
        <div className="filterGroup">
          <span className="filterLabel">按类别：</span>
          <button
            className={`categoryChip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            全部 ({filteredIssues.length})
          </button>
          {Object.entries(ISSUE_CATEGORIES).map(([key, value]) => {
            const Icon = CATEGORY_ICONS[value];
            const count = stats.byCategory[value] || 0;
            return (
              <button
                key={key}
                className={`categoryChip ${selectedCategory === value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(value)}
                disabled={count === 0}
              >
                <Icon size={12} />
                {CATEGORY_LABELS[value]} ({count})
              </button>
            );
          })}
        </div>
        <div className="filterGroup">
          <span className="filterLabel">按级别：</span>
          <button
            className={`severityChip ${selectedSeverity === '' ? 'active' : ''}`}
            onClick={() => setSelectedSeverity('')}
          >
            全部
          </button>
          {Object.entries(ISSUE_SEVERITY).map(([key, value]) => {
            const Icon = SEVERITY_ICONS[value];
            const colors = SEVERITY_COLORS[value];
            const count = stats[value];
            return (
              <button
                key={key}
                className={`severityChip ${selectedSeverity === value ? 'active' : ''}`}
                style={{
                  background: selectedSeverity === value ? colors.bg : 'transparent',
                  color: colors.text,
                  borderColor: colors.border
                }}
                onClick={() => setSelectedSeverity(value)}
                disabled={count === 0}
              >
                <Icon size={12} />
                {key === 'CRITICAL' ? '严重' : key === 'WARNING' ? '警告' : '提示'}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategory ? (
        <div className="issuesList">
          {issuesByCategory[selectedCategory]?.length === 0 ? (
            <div className="emptyState">
              <CheckCircle2 size={36} />
              <p>该类别下暂无问题</p>
              <p className="muted">数据一致性良好</p>
            </div>
          ) : (
            issuesByCategory[selectedCategory]?.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssueId === issue.id}
                fixing={fixingIssueId === issue.id}
                onToggle={() => toggleExpand(issue.id)}
                onFix={() => handleFix(issue)}
                getAffectedItemLink={getAffectedItemLink}
                canAutoFix={canAutoFix(issue)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="issuesByCategory">
          {Object.entries(ISSUE_CATEGORIES).map(([key, category]) => {
            const categoryIssues = issuesByCategory[category];
            if (categoryIssues?.length === 0) return null;
            const Icon = CATEGORY_ICONS[category];
            return (
              <div key={key} className="categorySection">
                <div className="categorySectionHeader">
                  <h3>
                    <Icon size={18} />
                    {CATEGORY_LABELS[category]}
                    <span className="categoryCount">{categoryIssues.length}</span>
                  </h3>
                  <button
                    className="miniBtn"
                    onClick={() => handleFixCategory(categoryIssues)}
                    disabled={!categoryIssues.some(i => canAutoFix(i)) || isBatchFixing}
                  >
                    <CheckCircle2 size={12} />
                    修复此类 ({categoryIssues.filter(i => canAutoFix(i)).length})
                  </button>
                </div>
                <div className="issuesList">
                  {categoryIssues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      expanded={expandedIssueId === issue.id}
                      fixing={fixingIssueId === issue.id}
                      onToggle={() => toggleExpand(issue.id)}
                      onFix={() => handleFix(issue)}
                      getAffectedItemLink={getAffectedItemLink}
                      canAutoFix={canAutoFix(issue)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {filteredIssues.length === 0 && (
            <div className="emptyState">
              <CheckCircle2 size={48} style={{ color: '#2f613a' }} />
              <p style={{ fontSize: '18px', fontWeight: 500, color: '#2f613a' }}>
                所有检查项通过！
              </p>
              <p className="muted">各模块数据一致性良好</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, expanded, fixing, onToggle, onFix, getAffectedItemLink, canAutoFix }) {
  const SeverityIcon = SEVERITY_ICONS[issue.severity];
  const colors = SEVERITY_COLORS[issue.severity];
  const CategoryIcon = CATEGORY_ICONS[issue.category];

  return (
    <div
      className={`issueCard severity-${issue.severity}`}
      style={{ borderLeftColor: colors.border }}
    >
      <div className="issueHeader" onClick={onToggle}>
        <div className="issueSeverityIcon" style={{ background: colors.bg, color: colors.text }}>
          <SeverityIcon size={16} />
        </div>
        <div className="issueMainInfo">
          <div className="issueTitleRow">
            <span className="issueTitle">{issue.title}</span>
            <span className="issueCategoryTag">
              <CategoryIcon size={10} />
              {CATEGORY_LABELS[issue.category]}
            </span>
          </div>
          <p className="issueDescription">{issue.description}</p>
        </div>
        <div className="issueActions">
          {canAutoFix ? (
            <button
              className="miniBtn fixBtn"
              onClick={(e) => { e.stopPropagation(); onFix(); }}
              disabled={fixing}
              style={{
                background: colors.bg,
                color: colors.text,
                borderColor: colors.border
              }}
            >
              {fixing ? (
                <><RefreshCw size={12} className="spinning" />修复中</>
              ) : (
                <><Wrench size={12} />{FIX_TYPE_LABELS[issue.fixType] || '修复'}</>
              )}
            </button>
          ) : (
            <span className="manualFixHint">需手动处理</span>
          )}
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {expanded && (
        <div className="issueDetails">
          <div className="issueDetailSection">
            <h4>影响对象</h4>
            <div className="affectedItems">
              {issue.affectedItems.map((item, idx) => {
                const linkText = getAffectedItemLink(item);
                return (
                  <span key={idx} className={`affectedItem type-${item.type}`}>
                    {AFFECTED_TYPE_LABELS[item.type] || item.type}：
                    <strong>{linkText || item.name}</strong>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="issueDetailSection">
            <h4>问题说明</h4>
            <p className="issueExplanation">
              {getIssueExplanation(issue)}
            </p>
          </div>

          {!canAutoFix && (
            <div className="issueDetailSection manualFixSection">
              <h4><Info size={14} />手动修复建议</h4>
              <p className="manualFixHint">{getManualFixHint(issue)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getIssueExplanation(issue) {
  const explanations = {
    clear_bed_warning: '菜畦的异常提醒应该与巡检记录保持同步。当所有关联巡检都标记为已解决时，菜畦警告也应被清除，否则可能导致误判。',
    remove_duplicate_tasks: '同一巡检记录不应生成多条相同类型的任务。重复任务会增加管理负担，可能导致重复工作或遗漏。',
    adjust_distribution: '采收分配总量不能超过实际采摘重量。超量分配会导致数据矛盾，影响库存和分配统计的准确性。',
    update_bed_status: '菜畦状态应与实际使用情况一致。有活跃种植计划的菜畦不应标记为"空闲"，否则可能导致重复安排。',
    clear_transaction_relation: '库存流水关联的对象被删除后，关联信息应被清理，以保持数据的完整性和可追溯性。',
    retry_sync_inspection: '巡检记录处理后需要同步更新菜畦警告和生成任务。同步失败会导致各模块数据不一致。',
    send_pickup_notice: '认养人自取的采收记录应及时发送取菜通知，避免蔬菜存放过久或认养人错过取菜时间。',
    sync_pickup_confirmation: '取菜确认状态在采收记录和联系记录中应保持一致，确保数据准确性。',
    review_inspection_status: '任务完成后，请确认关联巡检的处理结果是否需要更新，确保问题已真正解决。',
    handle_missing_material: '物资目录中已删除的物资仍有库存流水记录。请根据实际情况决定是恢复物资记录还是清理相关流水。'
  };
  return explanations[issue.fixType] || '数据一致性问题需要及时处理，以确保各模块信息同步准确。';
}

function getManualFixHint(issue) {
  const hints = {
    review_inspection_status: '请跳转到"巡检记录"页签，检查该巡检的详细情况，确认是否需要更新处理结果。',
    handle_missing_material: '请跳转到"物资库存"页签，检查相关库存流水。您可以选择：1) 重新创建该物资记录；2) 删除或归档关联的库存流水。'
  };
  return hints[issue.fixType] || '请检查相关数据并手动调整。';
}
