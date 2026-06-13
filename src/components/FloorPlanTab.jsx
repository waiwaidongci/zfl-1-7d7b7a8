import React, { useState, useMemo } from 'react';
import { Map, LayoutGrid, Filter, RotateCcw, Search, Trash2, BarChart3 } from 'lucide-react';
import { FloorGrid } from './FloorGrid';
import { UnplacedBeds } from './UnplacedBeds';
import { BedDetailModal } from './BedDetailModal';
import { ZoneOperationsView } from './ZoneOperationsView';
import { LEGEND_ITEMS, ZONE_CONFIG, getTotalCells } from '../config/floorPlan';
import { buildZoneStats, filterBedsByZone, filterBedPlacementByZone } from '../utils/zoneStats';

export function FloorPlanTab({
  beds, setBeds, bedPlacement, setBedPlacement,
  plants, contacts, harvests, transactions, tasks, inspections, materials,
  onAddInspection, onCreatePlantFromBed, onCreateTaskFromBed
}) {
  const [selectedBed, setSelectedBed] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [draggedBedId, setDraggedBedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [displayFilter, setDisplayFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState(null);

  const zoneStats = useMemo(() =>
    buildZoneStats({ beds, bedPlacement, inspections, plants }),
    [beds, bedPlacement, inspections, plants]);

  const handleBedDrop = (bedId, cellId) => {
    const existingBedId = Object.keys(bedPlacement).find(id => bedPlacement[id] === cellId);
    const currentCellId = bedPlacement[bedId];

    let newPlacement = { ...bedPlacement };

    if (existingBedId && existingBedId !== bedId) {
      if (currentCellId) {
        newPlacement[existingBedId] = currentCellId;
      } else {
        delete newPlacement[existingBedId];
      }
    }

    newPlacement[bedId] = cellId;
    setBedPlacement(newPlacement);
    setSelectedCellId(null);
  };

  const handleRemoveBed = (bedId) => {
    const newPlacement = { ...bedPlacement };
    delete newPlacement[bedId];
    setBedPlacement(newPlacement);
    setSelectedBed(null);
  };

  const handleQuickWater = (bedId) => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const nextWater = d.toISOString().slice(0, 10);
    setBeds(beds.map(b =>
      b.id === bedId ? { ...b, nextWater, warning: '' } : b
    ));
  };

  const zoneFilteredBeds = useMemo(() =>
    filterBedsByZone(beds, selectedZone, bedPlacement),
    [beds, selectedZone, bedPlacement]);

  const filteredBeds = useMemo(() => {
    return zoneFilteredBeds.filter(bed => {
      if (statusFilter && bed.status !== statusFilter) return false;
      return true;
    });
  }, [zoneFilteredBeds, statusFilter]);

  const displayFilteredBeds = useMemo(() => {
    if (displayFilter === 'all') return filteredBeds;
    if (displayFilter === 'placed') {
      const placedIds = Object.keys(bedPlacement);
      return filteredBeds.filter(b => placedIds.includes(b.id));
    }
    if (displayFilter === 'unplaced') {
      const placedIds = Object.keys(bedPlacement);
      return filteredBeds.filter(b => !placedIds.includes(b.id));
    }
    if (displayFilter === 'warning') {
      return filteredBeds.filter(b => b.warning);
    }
    return filteredBeds;
  }, [filteredBeds, bedPlacement, displayFilter]);

  const stats = useMemo(() => {
    const totalCells = getTotalCells();
    const usedCells = Object.keys(bedPlacement).length;
    const withWarning = beds.filter(b => b.warning).length;
    const adopted = beds.filter(b => b.status === '认养中').length;

    return {
      totalBeds: beds.length,
      placed: usedCells,
      unplaced: beds.length - usedCells,
      totalCells,
      availableCells: totalCells - usedCells,
      withWarning,
      adopted
    };
  }, [beds, bedPlacement]);

  const zoneFilteredBedPlacement = useMemo(() =>
    filterBedPlacementByZone(bedPlacement, selectedZone, beds),
    [bedPlacement, selectedZone, beds]);

  const filteredBedPlacement = useMemo(() => {
    if (displayFilter === 'all') return zoneFilteredBedPlacement;

    const placedIds = Object.keys(zoneFilteredBedPlacement).filter(id => {
      const bed = beds.find(b => b.id === id);
      if (!bed) return false;
      if (displayFilter === 'placed') return true;
      if (displayFilter === 'warning') return !!bed.warning;
      return false;
    });

    const filtered = {};
    placedIds.forEach(id => {
      filtered[id] = zoneFilteredBedPlacement[id];
    });
    return filtered;
  }, [zoneFilteredBedPlacement, beds, displayFilter]);

  const unplacedSourceBeds = displayFilter === 'unplaced' ? displayFilteredBeds : zoneFilteredBeds;

  const gridBeds = displayFilter === 'all' || displayFilter === 'placed' || displayFilter === 'warning'
    ? displayFilteredBeds
    : zoneFilteredBeds;

  const handleResetLayout = () => {
    if (confirm('确定要重置所有菜畦的位置吗？此操作不可撤销。')) {
      setBedPlacement({});
    }
  };

  return (
    <>
      <div className="inspectionHero" style={{ background: 'linear-gradient(135deg, #2c5f8a, #3d7a9c)' }}>
        <div>
          <h2><Map size={20} />屋顶平面图</h2>
          <p>可视化管理菜畦位置，直观了解各区域使用情况</p>
        </div>
        <div className="inspectionSyncBar">
          <div className="inspectionQuickStats">
            <span className="quickStat">
              <LayoutGrid size={12} /> {stats.placed}/{stats.totalBeds} 已放置
            </span>
            <span className="quickStat success">
              <LayoutGrid size={12} /> {stats.availableCells} 空闲网格
            </span>
            {stats.withWarning > 0 && (
              <span className="quickStat danger">
                <Filter size={12} /> {stats.withWarning} 异常
              </span>
            )}
          </div>
          <button
            className="syncAllBtn"
            onClick={handleResetLayout}
            style={{ background: '#fff', color: '#8b3f23' }}
          >
            <RotateCcw size={16} /> 重置布局
          </button>
        </div>
      </div>

      <div className="floorMapToolbar">
        <div className="legend">
          {LEGEND_ITEMS.map(item => (
            <div key={item.key} className="legendItem">
              <span
                className={`legendDot ${item.key}`}
                style={{
                  background: item.color,
                  border: item.border ? `2px solid ${item.border}` : 'none'
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
        <div className="toolbarActions">
          <select
            className="filterSelect"
            value={displayFilter}
            onChange={(e) => setDisplayFilter(e.target.value)}
          >
            <option value="all">全部显示</option>
            <option value="placed">仅显示已放置</option>
            <option value="unplaced">仅显示未放置</option>
            <option value="warning">仅显示异常</option>
          </select>
          <select
            className="filterSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="认养中">认养中</option>
            <option value="空闲">空闲</option>
            <option value="暂停维护">暂停维护</option>
          </select>
          {statusFilter && (
            <button className="clearBtn" onClick={() => setStatusFilter('')}>清除筛选</button>
          )}
        </div>
      </div>

      <ZoneOperationsView
        zoneStats={zoneStats}
        selectedZone={selectedZone}
        onZoneSelect={setSelectedZone}
      />

      <section className="workspace inspectionWorkspace">
        <UnplacedBeds
          beds={displayFilter === 'unplaced' ? displayFilteredBeds : zoneFilteredBeds}
          bedPlacement={bedPlacement}
          selectedCellId={selectedCellId}
          draggedBedId={draggedBedId}
          setDraggedBedId={setDraggedBedId}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onBedDrop={handleBedDrop}
          onBedClick={setSelectedBed}
          selectedZone={selectedZone}
        />

        <div className="panel wide">
          <div className="toolbar">
            <h2><LayoutGrid size={16} />网格布局</h2>
            {selectedZone && (
              <span style={{ fontSize: '13px', color: '#2f613a', background: '#e8f5e3', padding: '4px 10px', borderRadius: '6px' }}>
                区域筛选：{ZONE_CONFIG.find(z => z.id === selectedZone)?.name || selectedZone}区
              </span>
            )}
            {selectedCellId && (
              <span style={{ fontSize: '13px', color: '#2f613a', background: '#e8f5e3', padding: '4px 10px', borderRadius: '6px' }}>
                已选中：{selectedCellId} - 点击未放置菜畦快速放置，或直接拖拽
              </span>
            )}
          </div>

          <FloorGrid
            beds={gridBeds}
            bedPlacement={filteredBedPlacement}
            onBedDrop={handleBedDrop}
            onBedClick={setSelectedBed}
            draggedBedId={draggedBedId}
            setDraggedBedId={setDraggedBedId}
            selectedCellId={selectedCellId}
            setSelectedCellId={setSelectedCellId}
            selectedZone={selectedZone}
          />
        </div>
      </section>

      {selectedBed && (
        <BedDetailModal
          bed={selectedBed}
          plants={plants}
          contacts={contacts}
          harvests={harvests}
          transactions={transactions}
          tasks={tasks}
          inspections={inspections}
          onClose={() => setSelectedBed(null)}
          onQuickWater={handleQuickWater}
          onAddInspection={onAddInspection}
          bedPlacement={bedPlacement}
          materials={materials}
          beds={beds}
          onCreatePlant={onCreatePlantFromBed}
          onCreateTask={onCreateTaskFromBed}
        />
      )}

      {selectedBed && bedPlacement[selectedBed.id] && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000 }}>
          <button
            className="miniBtn"
            style={{
              background: '#fbe3e3',
              color: '#8a2c2c',
              borderColor: '#e8c9bc',
              padding: '10px 16px',
              fontSize: '13px'
            }}
            onClick={() => handleRemoveBed(selectedBed.id)}
          >
            <Trash2 size={14} /> 从平面图移除
          </button>
        </div>
      )}
    </>
  );
}
