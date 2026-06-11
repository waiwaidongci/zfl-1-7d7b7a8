export const ZONE_CONFIG = [
  {
    id: 'A',
    name: 'A区',
    description: '阳光充足区 · 喜阳作物',
    rows: 3,
    cols: 4,
    color: '#2f613a'
  },
  {
    id: 'B',
    name: 'B区',
    description: '半阴区 · 绿叶蔬菜',
    rows: 3,
    cols: 4,
    color: '#3d7a2c'
  },
  {
    id: 'C',
    name: 'C区',
    description: '轮作休耕区 · 育苗区',
    rows: 2,
    cols: 3,
    color: '#6c8b42'
  }
];

export const WATER_URGENCY = {
  OVERDUE: { key: 'overdue', label: '浇水逾期', days: -Infinity, threshold: 0 },
  URGENT: { key: 'urgent', label: '紧急浇水', days: 0, threshold: 1 },
  SOON: { key: 'soon', label: '即将浇水', days: 1, threshold: 3 },
  NORMAL: { key: 'normal', label: '正常', days: 3, threshold: Infinity }
};

export const getWaterUrgency = (nextWaterDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWater = new Date(nextWaterDate);
  nextWater.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((nextWater - today) / 86400000);

  if (daysUntil < WATER_URGENCY.OVERDUE.threshold) return WATER_URGENCY.OVERDUE;
  if (daysUntil <= WATER_URGENCY.URGENT.threshold) return WATER_URGENCY.URGENT;
  if (daysUntil <= WATER_URGENCY.SOON.threshold) return WATER_URGENCY.SOON;
  return WATER_URGENCY.NORMAL;
};

export const STATUS_STYLES = {
  '认养中': { gradient: 'linear-gradient(135deg, #3d7a2c, #6c8b42)', textColor: '#fff' },
  '空闲': { gradient: 'linear-gradient(135deg, #cdd8c3, #b8c4ac)', textColor: '#243222' },
  '暂停维护': { gradient: 'linear-gradient(135deg, #f0d6a0, #e6c77a)', textColor: '#5a4a1e' }
};

export const LEGEND_ITEMS = [
  { key: 'status-adopted', label: '认养中', type: 'status', color: 'linear-gradient(135deg, #3d7a2c, #6c8b42)' },
  { key: 'status-idle', label: '空闲', type: 'status', color: 'linear-gradient(135deg, #cdd8c3, #b8c4ac)' },
  { key: 'status-paused', label: '暂停维护', type: 'status', color: 'linear-gradient(135deg, #f0d6a0, #e6c77a)' },
  { key: 'water-urgent', label: '浇水紧急', type: 'water', color: 'linear-gradient(135deg, #8b3f23, #c9764d)' },
  { key: 'has-warning', label: '有异常', type: 'warning', color: 'linear-gradient(135deg, #e6c77a, #d4a017)', border: '#8b3f23' }
];

export const getCellCoordinate = (zoneId, row, col) => `${zoneId}${row + 1}-${col + 1}`;

export const parseCellCoordinate = (coord) => {
  const match = coord.match(/^([A-Z])(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    zoneId: match[1],
    row: parseInt(match[2]) - 1,
    col: parseInt(match[3]) - 1
  };
};

export const generateGridCells = (zone) => {
  const cells = [];
  for (let row = 0; row < zone.rows; row++) {
    for (let col = 0; col < zone.cols; col++) {
      cells.push({
        id: getCellCoordinate(zone.id, row, col),
        zoneId: zone.id,
        row,
        col
      });
    }
  }
  return cells;
};

export const getTotalCells = () => {
  return ZONE_CONFIG.reduce((sum, zone) => sum + zone.rows * zone.cols, 0);
};
