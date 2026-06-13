import React, { useState, useMemo } from 'react';
import {
  Calendar, Leaf, Clock, CheckCircle2, Plus,
  Sprout, ListTodo, MapPin, TrendingUp, Info,
  RefreshCw, Filter, ChevronDown, ChevronUp, X
} from 'lucide-react';
import {
  generateRotationPlan,
  ROTATION_STATUS_LABELS,
  createPlantFromSuggestion,
  createTaskFromSuggestion,
  getCurrentSeason,
  getRotationStats
} from '../utils/cropRotation';
import { getZoneOfBed, ZONE_CONFIG } from '../config/floorPlan';

export function CropRotationPanel({
  beds, plants, harvests, bedPlacement,
  onAddPlant, onAddTask, onViewBedDetail,
  onSwitchToPlants, onSwitchToTasks
}) {
  const [periodDays, setPeriodDays] = useState(30);
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedBeds, setExpandedBeds] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  const currentSeason = useMemo(() => getCurrentSeason(), []);

  const rotationPlan = useMemo(() =>
    generateRotationPlan(beds, plants, harvests, bedPlacement, periodDays),
    [beds, plants, harvests, bedPlacement, periodDays]
  );

  const rotationStats = useMemo(() =>
    getRotationStats(beds, plants, bedPlacement),
    [beds, plants, bedPlacement]
  );

  const filteredBeds = useMemo(() => {
    let result = rotationPlan.beds;

    if (zoneFilter) {
      result = result.filter(b => b.zoneId === zoneFilter);
    }

    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter);
    }

    return result;
  }, [rotationPlan.beds, zoneFilter, statusFilter]);

  const toggleBedExpand = (bedId) => {
    setExpandedBeds(prev => ({
      ...prev,
      [bedId]: !prev[bedId]
    }));
  };

  const handleCreatePlant = (bedInfo, suggestion) => {
    const plantData = createPlantFromSuggestion(bedInfo.bed, suggestion, bedInfo.availableDate);
    setShowConfirmModal({
      type: 'plant',
      bed: bedInfo.bed,
      suggestion,
      plantData,
      availableDate: bedInfo.availableDate
    });
  };

  const handleCreateTask = (bedInfo, suggestion) => {
    const taskData = createTaskFromSuggestion(bedInfo.bed, suggestion, bedInfo.availableDate);
    setShowConfirmModal({
      type: 'task',
      bed: bedInfo.bed,
      suggestion,
      taskData,
      availableDate: bedInfo.availableDate
    });
  };

  const confirmCreate = () => {
    if (!showConfirmModal) return;

    if (showConfirmModal.type === 'plant' && onAddPlant) {
      const newPlant = {
        ...showConfirmModal.plantData,
        id: crypto.randomUUID()
      };
      onAddPlant(newPlant);
    } else if (showConfirmModal.type === 'task' && onAddTask) {
      const newTask = {
        ...showConfirmModal.taskData,
        id: crypto.randomUUID()
      };
      onAddTask(newTask);
    }

    setShowConfirmModal(null);
  };

  const statusLabel = ROTATION_STATUS_LABELS['idle'];

  const periodOptions = [
    { days: 30, label: '30天', desc: '近期轮作' },
    { days: 60, label: '60天', desc: '中期规划' },
    { days: 90, label: '90天', desc: '长期布局' }
  ];

  return (
    <div className="cropRotationPanel">
      <div className="rotationHero">
        <div>
          <h2><TrendingUp size={20} />季节轮作规划</h2>
          <p>基于菜畦状态、区域特性和历史数据，智能生成种植建议</p>
        </div>
        <div className="rotationSeasonBadge">
          <Leaf size={14} />
          当前季节：{currentSeason}
        </div>
      </div>

      <div className="periodSelector">
        {periodOptions.map(opt => (
          <button
            key={opt.days}
            className={`periodBtn ${periodDays === opt.days ? 'active' : ''}`}
            onClick={() => setPeriodDays(opt.days)}
          >
            <strong>{opt.label}</strong>
            <span>{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="rotationStatsCards">
        <div className="rotationStatCard idle">
          <div className="statIcon"><Leaf size={24} /></div>
          <div>
            <div className="statNumber">{rotationStats.idle}</div>
            <div className="statLabel">空闲可种</div>
          </div>
        </div>
        <div className="rotationStatCard soon">
          <div className="statIcon"><Clock size={24} /></div>
          <div>
            <div className="statNumber">{rotationStats.soonHarvest + rotationStats.harvestReady}</div>
            <div className="statLabel">即将采收</div>
          </div>
        </div>
        <div className="rotationStatCard growing">
          <div className="statIcon"><Sprout size={24} /></div>
          <div>
            <div className="statNumber">{rotationStats.growing}</div>
            <div className="statLabel">生长中</div>
          </div>
        </div>
        <div className="rotationStatCard paused">
          <div className="statIcon"><Clock size={24} /></div>
          <div>
            <div className="statNumber">{rotationStats.paused}</div>
            <div className="statLabel">暂停维护</div>
          </div>
        </div>
      </div>

      <div className="zoneStatsRow">
        {ZONE_CONFIG.map(zone => {
          const zoneStats = rotationStats.byZone[zone.id] || { total: 0, idle: 0 };
          const idleRate = zoneStats.total > 0 ? ((zoneStats.idle / zoneStats.total) * 100).toFixed(0) : 0;
          return (
            <div
              key={zone.id}
              className={`zoneStatChip ${zoneFilter === zone.id ? 'active' : ''}`}
              onClick={() => setZoneFilter(zoneFilter === zone.id ? '' : zone.id)}
              style={{ borderColor: zone.color }}
            >
              <span className="zoneDot" style={{ background: zone.color }}></span>
              <strong>{zone.name}</strong>
              <span className="zoneStatInfo">
                {zoneStats.total}块 · {idleRate}%空闲
              </span>
            </div>
          );
        })}
      </div>

      <div className="rotationFilters">
        <div className="filterGroup">
          <Filter size={14} />
          <select
            className="filterSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="idle">空闲可种</option>
            <option value="soon_harvest">即将采收</option>
            <option value="harvest_ready">待采收</option>
            <option value="paused">暂停维护</option>
          </select>
          {(zoneFilter || statusFilter) && (
            <button className="clearBtn small" onClick={() => { setZoneFilter(''); setStatusFilter(''); }}>
              清除筛选
            </button>
          )}
        </div>
        <div className="resultCount">
          共 <strong>{filteredBeds.length}</strong> 块菜畦可规划
        </div>
      </div>

      <div className="rotationBedList">
        {filteredBeds.length === 0 ? (
          <div className="emptyState">
            <Info size={32} />
            <p>暂无符合条件的菜畦</p>
            <span>调整筛选条件或扩大规划周期</span>
          </div>
        ) : (
          filteredBeds.map(bedInfo => {
            const statusInfo = ROTATION_STATUS_LABELS[bedInfo.status];
            const zone = bedInfo.zoneId ? ZONE_CONFIG.find(z => z.id === bedInfo.zoneId) : null;
            const isExpanded = expandedBeds[bedInfo.bed.id];

            return (
              <div
                key={bedInfo.bed.id}
                className={`rotationBedCard ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="rotationBedHeader" onClick={() => toggleBedExpand(bedInfo.bed.id)}>
                  <div className="bedInfo">
                    <div className="bedNameRow">
                      <h4>{bedInfo.bed.name}</h4>
                      <span
                        className="statusBadge"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="bedMeta">
                      {zone && (
                        <span className="bedZone" style={{ color: zone.color }}>
                          <MapPin size={12} /> {zone.name} · {zone.description.split(' · ')[1]}
                        </span>
                      )}
                      <span className="bedAvailable">
                        <Calendar size={12} />
                        {bedInfo.status === 'idle' ? '可立即播种' : `${bedInfo.daysUntilAvailable}天后可种 · ${bedInfo.availableDate}`}
                      </span>
                    </div>
                    {bedInfo.currentCrop && (
                      <div className="currentCrop">
                        <Sprout size={12} />
                        当前：{bedInfo.currentCrop}
                      </div>
                    )}
                  </div>
                  <div className="expandIcon">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="rotationBedBody">
                    {bedInfo.history.length > 0 && (
                      <div className="historySection">
                        <span className="sectionLabel">历史种植</span>
                        <div className="historyChips">
                          {bedInfo.history.slice(0, 4).map((h, idx) => (
                            <span key={idx} className="historyChip">
                              {h.crop}
                              <span className="historyDate">{h.date}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="suggestionsSection">
                      <span className="sectionLabel">推荐作物</span>
                      <div className="suggestionList">
                        {bedInfo.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="suggestionItem">
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
                                <button
                                  className="actionBtn primary"
                                  onClick={() => handleCreatePlant(bedInfo, { ...suggestion, action: 'sow' })}
                                >
                                  <Plus size={14} /> 转种植计划
                                </button>
                                <button
                                  className="actionBtn secondary"
                                  onClick={() => handleCreateTask(bedInfo, { ...suggestion, action: 'sow' })}
                                >
                                  <ListTodo size={14} /> 转待办任务
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="quickActions">
                      <button
                        className="miniBtn"
                        onClick={() => onViewBedDetail && onViewBedDetail(bedInfo.bed)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showConfirmModal && (
        <div className="modalOverlay" onClick={() => setShowConfirmModal(null)}>
          <div className="modalContent confirmModal" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>
                {showConfirmModal.type === 'plant' ? '创建种植计划' : '创建待办任务'}
              </h3>
              <button className="closeBtn" onClick={() => setShowConfirmModal(null)}>×</button>
            </div>
            <div className="modalBody">
              <div className="confirmInfo">
                <p>
                  <strong>菜畦：</strong> {showConfirmModal.bed.name}
                </p>
                <p>
                  <strong>作物：</strong> {showConfirmModal.suggestion.crop}
                </p>
                <p>
                  <strong>日期：</strong> {showConfirmModal.availableDate}
                </p>
                <p>
                  <strong>说明：</strong> {showConfirmModal.suggestion.reason}
                </p>
              </div>
              <div className="confirmActions">
                <button
                  className="cancelBtn"
                  onClick={() => setShowConfirmModal(null)}
                >
                  取消
                </button>
                <button
                  className="confirmBtn"
                  onClick={confirmCreate}
                >
                  <CheckCircle2 size={16} /> 确认创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
