import React, { useMemo, useState } from 'react';
import { GripVertical, Droplets, User, TriangleAlert } from 'lucide-react';
import { ZONE_CONFIG, getWaterUrgency, STATUS_STYLES, generateGridCells } from '../config/floorPlan';

export function FloorGrid({
  beds, bedPlacement, onBedDrop, onBedClick,
  draggedBedId, setDraggedBedId, selectedCellId, setSelectedCellId
}) {
  const [dragOverCell, setDragOverCell] = useState(null);

  const bedByCell = useMemo(() => {
    const map = {};
    for (const [bedId, cellId] of Object.entries(bedPlacement)) {
      map[cellId] = beds.find(b => b.id === bedId);
    }
    return map;
  }, [beds, bedPlacement]);

  const handleDragStart = (e, bed) => {
    setDraggedBedId(bed.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bed.id);
  };

  const handleDragEnd = () => {
    setDraggedBedId(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e, cellId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, cellId) => {
    e.preventDefault();
    const bedId = e.dataTransfer.getData('text/plain') || draggedBedId;
    if (bedId) {
      onBedDrop(bedId, cellId);
    }
    setDragOverCell(null);
    setDraggedBedId(null);
  };

  const handleCellClick = (cellId) => {
    const bed = bedByCell[cellId];
    if (bed) {
      onBedClick(bed);
    } else {
      setSelectedCellId(selectedCellId === cellId ? null : cellId);
    }
  };

  return (
    <div className="floorMapContainer">
      {ZONE_CONFIG.map(zone => {
        const cells = generateGridCells(zone);
        const usedCells = cells.filter(c => bedByCell[c.id]).length;
        const totalCells = cells.length;

        return (
          <div key={zone.id} className="zoneSection">
            <div className="zoneHeader">
              <h2>{zone.name}</h2>
              <span className="zoneDescription">{zone.description}</span>
              <span className="zoneUsage">{usedCells}/{totalCells} 已使用</span>
            </div>
            <div
              className="gridContainer"
              style={{ gridTemplateColumns: `repeat(${zone.cols}, 1fr)` }}
            >
              {cells.map(cell => {
                const bed = bedByCell[cell.id];
                const isDragOver = dragOverCell === cell.id;
                const isSelected = selectedCellId === cell.id;
                const isDragging = bed && draggedBedId === bed.id;

                return (
                  <div
                    key={cell.id}
                    className={`gridCell ${bed ? 'hasBed' : 'empty'} ${isDragOver ? 'dragOver' : ''} ${isDragging ? 'dragging' : ''}`}
                    style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
                    onClick={() => handleCellClick(cell.id)}
                    onDragOver={(e) => handleDragOver(e, cell.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cell.id)}
                  >
                    {bed ? (
                      <div
                        className={`bedGridCard status-${bed.status} ${getWaterUrgency(bed.nextWater).key === 'overdue' || getWaterUrgency(bed.nextWater).key === 'urgent' ? 'water-urgent' : ''} ${bed.warning ? 'has-warning' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, bed)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBedClick(bed);
                        }}
                      >
                        <div className="bedGridHeader">
                          <span className="bedGridName">{bed.name}</span>
                          <GripVertical size={14} className="dragHandle" />
                        </div>
                        <span className="bedGridCrop">{bed.crop}</span>
                        <div className="bedGridFooter">
                          <span className={`bedGridAdopter ${bed.status !== '认养中' ? 'idle' : ''}`}>
                            <User size={10} />
                            {bed.adopter || '待认养'}
                          </span>
                          <span className={`bedGridWater ${getWaterUrgency(bed.nextWater).key}`}>
                            <Droplets size={10} />
                            {getWaterUrgencyLabel(bed.nextWater)}
                          </span>
                        </div>
                        {bed.warning && (
                          <div className="bedGridWarning" title={bed.warning}>
                            <TriangleAlert size={10} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="emptyCell">
                        <span className="cellCoordinate">{cell.id}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const getWaterUrgencyLabel = (nextWaterDate) => {
  const urgency = getWaterUrgency(nextWaterDate);
  if (urgency.key === 'overdue') return '逾期';
  if (urgency.key === 'urgent') return '今天';
  if (urgency.key === 'soon') return '3天内';
  return '正常';
};
