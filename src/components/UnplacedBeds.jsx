import React from 'react';
import { Sprout, Filter } from 'lucide-react';

export function UnplacedBeds({
  beds, bedPlacement, selectedCellId,
  draggedBedId, setDraggedBedId,
  statusFilter, setStatusFilter,
  onBedDrop, onBedClick
}) {
  const placedBedIds = Object.keys(bedPlacement);
  const unplacedBeds = beds.filter(bed => !placedBedIds.includes(bed.id));

  const filteredBeds = unplacedBeds.filter(bed => {
    if (!statusFilter) return true;
    return bed.status === statusFilter;
  });

  const handleDragStart = (e, bed) => {
    setDraggedBedId(bed.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bed.id);
  };

  const handleDragEnd = () => {
    setDraggedBedId(null);
  };

  const handleClick = (bed) => {
    if (selectedCellId) {
      onBedDrop(bed.id, selectedCellId);
    } else {
      onBedClick(bed);
    }
  };

  return (
    <div className="panel">
      <div className="toolbar">
        <h2><Sprout size={16} />未放置菜畦</h2>
        <div className="toolbarActions">
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
        </div>
      </div>

      {unplacedBeds.length > 0 && selectedCellId && (
        <p style={{ fontSize: '13px', color: '#2f613a', background: '#e8f5e3', padding: '8px 12px', borderRadius: '6px', margin: '0 0 12px' }}>
          💡 已选中网格 {selectedCellId}，点击下方菜畦快速放置
        </p>
      )}

      {filteredBeds.length === 0 ? (
        <div className="emptyState">
          <Sprout size={36} />
          <p>{statusFilter ? '没有符合筛选条件的菜畦' : '所有菜畦都已放置'}</p>
          <p className="muted">
            {unplacedBeds.length === 0
              ? '从"菜园总览"新增菜畦后会出现在这里'
              : '请调整筛选条件查看其他菜畦'
            }
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '12px', color: '#71806a', margin: '0 0 8px' }}>
            共 {filteredBeds.length} 块菜畦待放置，支持拖拽到网格或点击放置
          </p>
          <div className="unplacedBedsList">
            {filteredBeds.map(bed => (
              <div
                key={bed.id}
                className={`unplacedBedItem ${draggedBedId === bed.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, bed)}
                onDragEnd={handleDragEnd}
                onClick={() => handleClick(bed)}
              >
                <span style={{ fontWeight: '500' }}>{bed.name}</span>
                <span className="unplacedBedCrop">{bed.crop}</span>
                <span className={`contactTypeTag ${
                  bed.status === '认养中' ? '取菜通知' :
                  bed.status === '空闲' ? '微信' : '现场沟通'
                }`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                  {bed.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
