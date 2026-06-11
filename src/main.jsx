import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Clock, Droplets, Leaf, MessageCircle, Phone, MapPin, Bell, Plus, Search, Trash2, TriangleAlert, Users, Wheat, Sprout, CalendarCheck, Package, AlertCircle, ArrowDownCircle, ArrowUpCircle, Archive, History, Wallet, Heart, CircleDollarSign, Timer, CheckCircle2, XCircle, AlertTriangle, Thermometer, Sun, Gauge, Settings, TrendingUp, TrendingDown, Grid3X3, Move, Info, Layers } from 'lucide-react';
import './styles.css';

const ZONE_CONFIG = {
  A: { name: 'A区', rows: 4, cols: 6, description: '叶菜种植区' },
  B: { name: 'B区', rows: 4, cols: 6, description: '果蔬种植区' },
  C: { name: 'C区', rows: 3, cols: 6, description: '轮作育苗区' }
};

const migrateBedPositions = (beds) => {
  const bedPositionsKey = 'zfl-1-bed-positions';
  const dataVersionKey = 'zfl-1-data-version';
  
  try {
    const currentVersion = localStorage.getItem(dataVersionKey);
    if (currentVersion === '2.0') {
      return beds;
    }

    const rawPositions = localStorage.getItem(bedPositionsKey);
    let positions = rawPositions ? JSON.parse(rawPositions) : {};
    
    let needsMigration = false;
    const migratedBeds = beds.map((bed, index) => {
      if (bed.zone && typeof bed.row === 'number' && typeof bed.col === 'number') {
        return bed;
      }
      
      needsMigration = true;
      
      let zone = 'A';
      let row = 0;
      let col = index % 6;
      
      if (bed.name) {
        const zoneMatch = bed.name.match(/^([A-C])/);
        if (zoneMatch) {
          zone = zoneMatch[1];
        }
        const numMatch = bed.name.match(/(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          row = Math.floor((num - 1) / 6) % 4;
          col = (num - 1) % 6;
        }
      }
      
      if (positions[bed.id]) {
        zone = positions[bed.id].zone;
        row = positions[bed.id].row;
        col = positions[bed.id].col;
      }
      
      return { ...bed, zone, row, col };
    });
    
    if (needsMigration) {
      localStorage.setItem(dataVersionKey, '2.0');
      localStorage.removeItem(bedPositionsKey);
      console.log('[数据迁移] 已完成菜畦位置信息迁移，共迁移', migratedBeds.filter(b => b.zone).length, '块菜畦');
    }
    
    return migratedBeds;
  } catch (err) {
    console.error('[数据迁移] 迁移失败，返回原始数据', err);
    return beds;
  }
};

const today = new Date();
const iso = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const seedBeds = [
  { id: crypto.randomUUID(), name: 'A03薄荷香草畦', crop: '薄荷/迷迭香', adopter: '林小满', phone: '13800001234', area: '6㎡', status: '认养中', nextWater: iso(1), warning: '水箱余量偏低' },
  { id: crypto.randomUUID(), name: 'B07番茄试验畦', crop: '樱桃番茄', adopter: '周原', phone: '13900004567', area: '8㎡', status: '认养中', nextWater: iso(3), warning: '' },
  { id: crypto.randomUUID(), name: 'C02轮作空畦', crop: '待播种', adopter: '', phone: '', area: '5㎡', status: '空闲', nextWater: iso(6), warning: '等待补土' }
];

const seedHarvests = [
  { id: crypto.randomUUID(), bed: 'A03薄荷香草畦', crop: '薄荷', weight: '1.4kg', date: iso(-1), note: '已通知认养人自取' },
  { id: crypto.randomUUID(), bed: 'B07番茄试验畦', crop: '樱桃番茄', weight: '2.1kg', date: iso(-3), note: '甜度记录7.8' }
];

const seedTasks = [
  { id: crypto.randomUUID(), title: '检查A区滴灌头', owner: '值班志愿者', due: iso(1), done: false },
  { id: crypto.randomUUID(), title: 'C02补土并翻松', owner: '园艺管家', due: iso(4), done: false }
];

const seedSchedules = [
  { id: crypto.randomUUID(), date: iso(0), weekday: '周四', volunteer: '李雨晴', phone: '13800007777', duty: '浇水', time: '09:00-11:00', note: '重点关注A区薄荷' },
  { id: crypto.randomUUID(), date: iso(1), weekday: '周五', volunteer: '张明远', phone: '13900008888', duty: '巡检', time: '16:00-18:00', note: '检查虫害情况' },
  { id: crypto.randomUUID(), date: iso(2), weekday: '周六', volunteer: '王建国', phone: '13700009999', duty: '补土', time: '08:00-10:00', note: 'C02区需要补土约5袋' },
  { id: crypto.randomUUID(), date: iso(3), weekday: '周日', volunteer: '刘芳', phone: '13600001111', duty: '浇水', time: '09:00-11:00', note: '' },
  { id: crypto.randomUUID(), date: iso(5), weekday: '周二', volunteer: '陈志豪', phone: '13500002222', duty: '巡检', time: '17:00-19:00', note: '检查滴灌系统' }
];

const seedContacts = [
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', adopter: '林小满', phone: '13800001234', type: '电话', date: iso(-2), time: '15:30', content: '确认本周薄荷长势良好，邀请周末可采摘约300g，通知认养人周末自取', note: '已确认周六上午自取' },
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', adopter: '林小满', phone: '13800001234', type: '微信', date: iso(-5), time: '09:15', content: '发送薄荷生长照片，回复很满意', note: '' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', phone: '13900004567', type: '现场沟通', date: iso(-1), time: '10:00', content: '认养人来菜园参观，介绍番茄养护要点', note: '赠送番茄苗2株' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', phone: '13900004567', type: '取菜通知', date: iso(-7), time: '16:45', content: '樱桃番茄成熟约500g，通知自取', note: '次日下午已取' }
];

const seedPlants = [
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', crop: '薄荷', sowDate: iso(-30), harvestDate: iso(10), growthStage: '生长期', note: '薄荷长势良好，注意浇水' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', crop: '樱桃番茄', sowDate: iso(-45), harvestDate: iso(20), growthStage: '结果期', note: '已开始挂果，注意追肥' }
];

const seedMaterials = [
  { id: crypto.randomUUID(), name: '薄荷种子', category: '种子', unit: '包', lowStockThreshold: 5, note: '进口品种' },
  { id: crypto.randomUUID(), name: '樱桃番茄种子', category: '种子', unit: '包', lowStockThreshold: 3, note: '' },
  { id: crypto.randomUUID(), name: '通用营养土', category: '营养土', unit: '袋', lowStockThreshold: 10, note: '40L装' },
  { id: crypto.randomUUID(), name: '有机堆肥', category: '肥料', unit: '袋', lowStockThreshold: 5, note: '5kg装' },
  { id: crypto.randomUUID(), name: '水溶肥', category: '肥料', unit: '瓶', lowStockThreshold: 3, note: '500ml' },
  { id: crypto.randomUUID(), name: '修枝剪', category: '工具', unit: '把', lowStockThreshold: 2, note: '' },
  { id: crypto.randomUUID(), name: '浇水壶', category: '工具', unit: '把', lowStockThreshold: 3, note: '5L容量' },
  { id: crypto.randomUUID(), name: '绑藤绳', category: '耗材', unit: '卷', lowStockThreshold: 5, note: '50m/卷' },
  { id: crypto.randomUUID(), name: '防虫网', category: '耗材', unit: '张', lowStockThreshold: 3, note: '2m×5m' }
];

const seedHarvestDistributions = [
  { id: crypto.randomUUID(), harvestId: seedHarvests[0].id, selfPickup: 0.8, communityShare: 0.4, volunteerSample: 0.1, loss: 0.1, note: '认养人周六上午自取，社区分享给3户邻居' },
  { id: crypto.randomUUID(), harvestId: seedHarvests[1].id, selfPickup: 1.2, communityShare: 0.5, volunteerSample: 0.2, loss: 0.2, note: '认养人下周自取，志愿者留样用于品种品鉴' }
];

const seedTransactions = [
  { id: crypto.randomUUID(), materialId: seedMaterials[0].id, materialName: '薄荷种子', category: '种子', type: 'inbound', quantity: 20, unit: '包', date: iso(-15), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[1].id, materialName: '樱桃番茄种子', category: '种子', type: 'inbound', quantity: 10, unit: '包', date: iso(-12), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[2].id, materialName: '通用营养土', category: '营养土', type: 'inbound', quantity: 30, unit: '袋', date: iso(-10), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[2].id, materialName: '通用营养土', category: '营养土', type: 'consume', quantity: 5, unit: '袋', date: iso(-3), relatedType: 'task', relatedId: seedTasks[1].id, relatedName: 'C02补土并翻松', note: 'C02补土5袋' },
  { id: crypto.randomUUID(), materialId: seedMaterials[3].id, materialName: '有机堆肥', category: '肥料', type: 'inbound', quantity: 15, unit: '袋', date: iso(-8), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[4].id, materialName: '水溶肥', category: '肥料', type: 'inbound', quantity: 6, unit: '瓶', date: iso(-7), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[5].id, materialName: '修枝剪', category: '工具', type: 'inbound', quantity: 4, unit: '把', date: iso(-5), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[6].id, materialName: '浇水壶', category: '工具', type: 'inbound', quantity: 5, unit: '把', date: iso(-5), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[7].id, materialName: '绑藤绳', category: '耗材', type: 'inbound', quantity: 10, unit: '卷', date: iso(-6), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[8].id, materialName: '防虫网', category: '耗材', type: 'inbound', quantity: 8, unit: '张', date: iso(-6), relatedType: '', relatedId: '', relatedName: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[1].id, materialName: '樱桃番茄种子', category: '种子', type: 'consume', quantity: 2, unit: '包', date: iso(-2), relatedType: 'task', relatedId: seedTasks[0].id, relatedName: '检查A区滴灌头', note: 'B07播种用' },
  { id: crypto.randomUUID(), materialId: seedMaterials[3].id, materialName: '有机堆肥', category: '肥料', type: 'consume', quantity: 3, unit: '袋', date: iso(-1), relatedType: 'harvest', relatedId: seedHarvests[1].id, relatedName: '樱桃番茄 2.1kg', note: '采摘后追肥' }
];

const seedFees = [
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', adopter: '林小满', startDate: iso(-60), endDate: iso(30), amount: 600, paymentStatus: '已缴费', donationNote: '认养人额外捐赠200元用于购买滴灌设备' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', startDate: iso(-90), endDate: iso(5), amount: 800, paymentStatus: '待缴费', donationNote: '' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', startDate: iso(-180), endDate: iso(-90), amount: 800, paymentStatus: '欠费', donationNote: '上一周期欠费，需催缴' }
];

const seedEnvThresholds = {
  temperature: { min: 15, max: 32, unit: '°C' },
  humidity: { min: 45, max: 80, unit: '%' },
  light: { min: 3000, max: 45000, unit: 'lux' },
  water: { min: 50, max: 100, unit: '%' }
};

const seedEnvHistory = [
  { date: iso(-6), temperature: 20.5, humidity: 68.2, light: 28500, water: 78.5 },
  { date: iso(-5), temperature: 22.3, humidity: 65.8, light: 32000, water: 74.2 },
  { date: iso(-4), temperature: 24.1, humidity: 62.4, light: 35800, water: 68.7 },
  { date: iso(-3), temperature: 23.7, humidity: 70.1, light: 22400, water: 62.3 },
  { date: iso(-2), temperature: 21.9, humidity: 73.5, light: 18600, water: 55.8 },
  { date: iso(-1), temperature: 20.8, humidity: 71.2, light: 26300, water: 48.4 },
  { date: iso(0),  temperature: 22.6, humidity: 66.9, light: 30200, water: 41.6 }
];

const getCurrentEnvData = (history) => {
  if (!history || history.length === 0) return null;
  const latest = history[history.length - 1];
  return {
    temperature: latest.temperature,
    humidity: latest.humidity,
    light: latest.light,
    water: latest.water
  };
};

function useStoredState(key, initialValue, validator, migrator) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      let parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[useStoredState] 数据校验失败，回退到默认值: ${key}`);
        return initialValue;
      }
      if (migrator && typeof migrator === 'function') {
        const migrated = migrator(parsed);
        if (migrated !== parsed) {
          localStorage.setItem(key, JSON.stringify(migrated));
          return migrated;
        }
      }
      return parsed;
    } catch (err) {
      console.error(`[useStoredState] 读取失败，回退到默认值: ${key}`, err);
      return initialValue;
    }
  });
  const update = (next) => {
    try {
      const resolved = typeof next === 'function' ? next(value) : next;
      setValue(resolved);
      localStorage.setItem(key, JSON.stringify(resolved));
    } catch (err) {
      console.error(`[useStoredState] 写入失败: ${key}`, err);
    }
  };
  return [value, update];
}

const validateEnvHistory = (data) => {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.date === 'string' &&
    typeof item.temperature === 'number' &&
    typeof item.humidity === 'number' &&
    typeof item.light === 'number' &&
    typeof item.water === 'number'
  );
};

const validateEnvThresholds = (data) => {
  if (typeof data !== 'object' || data === null) return false;
  const keys = ['temperature', 'humidity', 'light', 'water'];
  return keys.every((k) =>
    data[k] &&
    typeof data[k].min === 'number' &&
    typeof data[k].max === 'number' &&
    typeof data[k].unit === 'string'
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [beds, setBeds] = useStoredState('zfl-1-beds', seedBeds, null, migrateBedPositions);
  const [harvests, setHarvests] = useStoredState('zfl-1-harvests', seedHarvests);
  const [tasks, setTasks] = useStoredState('zfl-1-tasks', seedTasks);
  const [schedules, setSchedules] = useStoredState('zfl-1-schedules', seedSchedules);
  const [contacts, setContacts] = useStoredState('zfl-1-contacts', seedContacts);
  const [plants, setPlants] = useStoredState('zfl-1-plants', seedPlants);
  const [materials, setMaterials] = useStoredState('zfl-1-materials', seedMaterials);
  const [transactions, setTransactions] = useStoredState('zfl-1-transactions', seedTransactions);
  const [fees, setFees] = useStoredState('zfl-1-fees', seedFees);
  const [query, setQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('');
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');
  const [plantQuery, setPlantQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [bedForm, setBedForm] = useState({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '', zone: 'A', row: 0, col: 0 });
  const [harvestForm, setHarvestForm] = useState({ bed: '', crop: '', weight: '', date: iso(0), note: '' });
  const [scheduleForm, setScheduleForm] = useState({ date: iso(0), weekday: '', volunteer: '', phone: '', duty: '浇水', time: '09:00-11:00', note: '' });
  const [contactForm, setContactForm] = useState({ bedId: '', bedName: '', adopter: '', phone: '', type: '电话', date: iso(0), time: '09:00', content: '', note: '' });
  const [plantForm, setPlantForm] = useState({ bedId: '', bedName: '', crop: '', sowDate: iso(0), harvestDate: iso(30), growthStage: '播种期', note: '' });
  const [materialForm, setMaterialForm] = useState({ name: '', category: '种子', unit: '', lowStockThreshold: 5, note: '' });
  const [transactionForm, setTransactionForm] = useState({ materialId: '', type: 'inbound', quantity: '', date: iso(0), relatedType: '', relatedId: '', relatedName: '', note: '' });
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
  const [transactionMaterialFilter, setTransactionMaterialFilter] = useState('');
  const [editingMaterialId, setEditingMaterialId] = useState('');
  const [editingMaterialForm, setEditingMaterialForm] = useState({ name: '', category: '种子', unit: '', lowStockThreshold: 5, note: '' });
  const [feeForm, setFeeForm] = useState({ bedId: '', bedName: '', adopter: '', startDate: iso(-30), endDate: iso(335), amount: '', paymentStatus: '待缴费', donationNote: '' });
  const [feeQuery, setFeeQuery] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState('');
  const [envThresholds, setEnvThresholds] = useStoredState('zfl-1-env-thresholds', seedEnvThresholds, validateEnvThresholds);
  const [envHistory, setEnvHistory] = useStoredState('zfl-1-env-history', seedEnvHistory, validateEnvHistory);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [thresholdForm, setThresholdForm] = useState(seedEnvThresholds);
  const [harvestDistributions, setHarvestDistributions] = useStoredState('zfl-1-harvest-distributions', seedHarvestDistributions);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributingHarvestId, setDistributingHarvestId] = useState(null);
  const [distributionForm, setDistributionForm] = useState({ selfPickup: '', communityShare: '', volunteerSample: '', loss: '', note: '' });
  const [distributionError, setDistributionError] = useState('');
  
  const [draggedBed, setDraggedBed] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [showBedDetail, setShowBedDetail] = useState(false);
  const [floorMapZoneFilter, setFloorMapZoneFilter] = useState('');

  const weekWater = beds.filter((bed) => {
    const days = (new Date(bed.nextWater) - today) / 86400000;
    return days <= 7 && days >= -1;
  });
  const filteredBeds = beds.filter((bed) => `${bed.name}${bed.crop}${bed.adopter}${bed.phone}`.includes(query.trim()));
  const activeCount = beds.filter((bed) => bed.status === '认养中').length;
  const warnings = beds.filter((bed) => bed.warning);

  const currentEnv = useMemo(() => getCurrentEnvData(envHistory), [envHistory]);

  const envAlerts = useMemo(() => {
    if (!currentEnv) return [];
    const alerts = [];
    const sensorNames = {
      temperature: '温度',
      humidity: '湿度',
      light: '光照强度',
      water: '水箱余量'
    };
    Object.keys(envThresholds).forEach((key) => {
      const threshold = envThresholds[key];
      const value = currentEnv[key];
      if (value < threshold.min) {
        alerts.push({
          id: `env-${key}-low`,
          type: 'env',
          sensor: key,
          sensorName: sensorNames[key],
          level: key === 'water' ? 'critical' : 'warning',
          message: `${sensorNames[key]}过低：${value}${threshold.unit}（最低阈值：${threshold.min}${threshold.unit}）`
        });
      } else if (value > threshold.max) {
        alerts.push({
          id: `env-${key}-high`,
          type: 'env',
          sensor: key,
          sensorName: sensorNames[key],
          level: 'warning',
          message: `${sensorNames[key]}过高：${value}${threshold.unit}（最高阈值：${threshold.max}${threshold.unit}）`
        });
      }
    });
    return alerts;
  }, [currentEnv, envThresholds]);

  const allWarnings = useMemo(() => {
    const bedWarnings = warnings.map((bed) => ({
      id: `bed-${bed.id}`,
      type: 'bed',
      name: bed.name,
      message: bed.warning
    }));
    return [...bedWarnings, ...envAlerts];
  }, [warnings, envAlerts]);

  const bedsByZone = useMemo(() => {
    const map = {};
    Object.keys(ZONE_CONFIG).forEach(zone => {
      map[zone] = beds.filter(bed => bed.zone === zone);
    });
    return map;
  }, [beds]);

  const unplacedBeds = useMemo(() => {
    return beds.filter(bed => !bed.zone || typeof bed.row !== 'number' || typeof bed.col !== 'number');
  }, [beds]);

  const floorMapStats = useMemo(() => {
    const total = Object.values(ZONE_CONFIG).reduce((sum, z) => sum + z.rows * z.cols, 0);
    const placed = beds.filter(bed => bed.zone && typeof bed.row === 'number' && typeof bed.col === 'number').length;
    const adopted = beds.filter(bed => bed.status === '认养中').length;
    const idle = beds.filter(bed => bed.status === '空闲').length;
    const hasWarning = beds.filter(bed => bed.warning).length;
    const needWater = beds.filter(bed => {
      const days = (new Date(bed.nextWater) - today) / 86400000;
      return days <= 2;
    }).length;
    return { total, placed, adopted, idle, hasWarning, needWater, unplaced: unplacedBeds.length };
  }, [beds, unplacedBeds]);

  const getBedAtPosition = useCallback((zone, row, col) => {
    return beds.find(bed => bed.zone === zone && bed.row === row && bed.col === col) || null;
  }, [beds]);

  const isPositionOccupied = useCallback((zone, row, col, excludeBedId = null) => {
    return beds.some(bed => 
      bed.zone === zone && 
      bed.row === row && 
      bed.col === col && 
      bed.id !== excludeBedId
    );
  }, [beds]);

  const findEmptyPosition = useCallback((zone) => {
    const config = ZONE_CONFIG[zone];
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (!isPositionOccupied(zone, row, col)) {
          return { zone, row, col };
        }
      }
    }
    return null;
  }, [isPositionOccupied]);

  const moveBedToPosition = useCallback((bedId, zone, row, col) => {
    const targetBed = getBedAtPosition(zone, row, col);
    const sourceBed = beds.find(b => b.id === bedId);
    
    if (!sourceBed) return;

    if (targetBed && sourceBed) {
      setBeds(beds.map(bed => {
        if (bed.id === bedId) {
          return { ...bed, zone, row, col };
        }
        if (bed.id === targetBed.id) {
          return { ...bed, zone: sourceBed.zone, row: sourceBed.row, col: sourceBed.col };
        }
        return bed;
      }));
    } else {
      setBeds(beds.map(bed => 
        bed.id === bedId ? { ...bed, zone, row, col } : bed
      ));
    }
  }, [beds, getBedAtPosition]);

  const handleDragStart = useCallback((e, bed) => {
    setDraggedBed(bed);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bed.id);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, zone, row, col) => {
    e.preventDefault();
    if (draggedBed) {
      moveBedToPosition(draggedBed.id, zone, row, col);
    }
    setDraggedBed(null);
  }, [draggedBed, moveBedToPosition]);

  const handleDragEnd = useCallback(() => {
    setDraggedBed(null);
  }, []);

  const getWaterStatus = useCallback((nextWaterDate) => {
    const days = (new Date(nextWaterDate) - today) / 86400000;
    if (days < 0) return { status: 'overdue', label: '已逾期', days };
    if (days <= 1) return { status: 'urgent', label: '今天', days };
    if (days <= 3) return { status: 'soon', label: `${Math.ceil(days)}天后`, days };
    return { status: 'normal', label: `${Math.ceil(days)}天后`, days };
  }, []);

  const openBedDetail = useCallback((bed) => {
    setSelectedBed(bed);
    setShowBedDetail(true);
  }, []);

  const closeBedDetail = useCallback(() => {
    setShowBedDetail(false);
    setSelectedBed(null);
  }, []);

  const autoAssignUnplacedBeds = useCallback(() => {
    const updatedBeds = [...beds];
    let hasChanges = false;
    
    unplacedBeds.forEach(bed => {
      let assigned = false;
      for (const zone of ['A', 'B', 'C']) {
        const pos = findEmptyPosition(zone);
        if (pos) {
          const idx = updatedBeds.findIndex(b => b.id === bed.id);
          if (idx !== -1) {
            updatedBeds[idx] = { ...updatedBeds[idx], ...pos };
            hasChanges = true;
            assigned = true;
          }
          break;
        }
      }
      if (!assigned) {
        console.warn(`无法为菜畦 ${bed.name} 找到空闲位置`);
      }
    });
    
    if (hasChanges) {
      setBeds(updatedBeds);
    }
  }, [beds, unplacedBeds, findEmptyPosition]);

  const addBed = (event) => {
    event.preventDefault();
    if (!bedForm.name.trim()) return;
    
    const position = findEmptyPosition(bedForm.zone) || findEmptyPosition('A') || { zone: 'A', row: 0, col: 0 };
    
    setBeds([{ 
      id: crypto.randomUUID(), 
      ...bedForm, 
      zone: position.zone,
      row: position.row,
      col: position.col
    }, ...beds]);
    setBedForm({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '', zone: 'A', row: 0, col: 0 });
  };

  const addHarvest = (event) => {
    event.preventDefault();
    if (!harvestForm.bed.trim() || !harvestForm.crop.trim()) return;
    setHarvests([{ id: crypto.randomUUID(), ...harvestForm }, ...harvests]);
    setHarvestForm({ bed: '', crop: '', weight: '', date: iso(0), note: '' });
  };

  const toggleTask = (id) => setTasks(tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const advanceWater = (id) => setBeds(beds.map((bed) => bed.id === id ? { ...bed, nextWater: iso(3), warning: '' } : bed));

  const harvestOptions = useMemo(() => beds.map((bed) => bed.name), [beds]);
  const contactBedOptions = useMemo(() => beds.filter((bed) => bed.adopter).map((bed) => ({ id: bed.id, name: bed.name, adopter: bed.adopter, phone: bed.phone })), [beds]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];
    if (contactQuery.trim()) {
      const q = contactQuery.trim();
      result = result.filter((c) => `${c.bedName}${c.adopter}${c.phone}${c.content}${c.note}`.includes(q));
    }
    if (contactTypeFilter) {
      result = result.filter((c) => c.type === contactTypeFilter);
    }
    return result.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
  }, [contacts, contactQuery, contactTypeFilter]);

  const getLastContactByBed = useMemo(() => {
    const map = {};
    const sorted = [...contacts].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    sorted.forEach((c) => {
      if (!map[c.bedId]) {
        map[c.bedId] = c;
      }
    });
    return map;
  }, [contacts]);

  const contactStats = useMemo(() => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const thisWeek = contacts.filter((c) => new Date(c.date) >= weekStart);
    const byType = thisWeek.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {});
    return { total: thisWeek.length, byType };
  }, [contacts]);

  const getWeekday = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[d.getDay()];
  };

  const filteredSchedules = useMemo(() => {
    let result = [...schedules];
    if (scheduleDateFilter) {
      result = result.filter((s) => s.date === scheduleDateFilter);
    }
    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [schedules, scheduleDateFilter]);

  const addSchedule = (event) => {
    event.preventDefault();
    if (!scheduleForm.volunteer.trim() || !scheduleForm.date) return;
    const weekday = getWeekday(scheduleForm.date);
    setSchedules([{ id: crypto.randomUUID(), ...scheduleForm, weekday }, ...schedules]);
    setScheduleForm({ date: iso(0), weekday: '', volunteer: '', phone: '', duty: '浇水', time: '09:00-11:00', note: '' });
  };

  const deleteSchedule = (id) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const selectContactBed = (bedId) => {
    const bed = beds.find((b) => b.id === bedId);
    if (bed) {
      setContactForm({ ...contactForm, bedId: bed.id, bedName: bed.name, adopter: bed.adopter, phone: bed.phone });
    } else {
      setContactForm({ ...contactForm, bedId: '', bedName: '', adopter: '', phone: '' });
    }
  };

  const addContact = (event) => {
    event.preventDefault();
    if (!contactForm.bedId || !contactForm.content.trim()) return;
    setContacts([{ id: crypto.randomUUID(), ...contactForm }, ...contacts]);
    setContactForm({ bedId: '', bedName: '', adopter: '', phone: '', type: '电话', date: iso(0), time: '09:00', content: '', note: '' });
  };

  const deleteContact = (id) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const updateScheduleDate = (dateStr) => {
    setScheduleForm({ ...scheduleForm, date: dateStr, weekday: getWeekday(dateStr) });
  };

  const scheduleStats = useMemo(() => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const thisWeek = schedules.filter((s) => {
      const d = new Date(s.date);
      return d >= weekStart && d <= weekEnd;
    });
    const byDuty = thisWeek.reduce((acc, s) => {
      acc[s.duty] = (acc[s.duty] || 0) + 1;
      return acc;
    }, {});
    return { total: thisWeek.length, byDuty };
  }, [schedules]);

  const calculateGrowthStage = (sowDate, harvestDate) => {
    const sow = new Date(sowDate);
    const harvest = new Date(harvestDate);
    const now = new Date();
    const totalDays = (harvest - sow) / 86400000;
    const elapsedDays = (now - sow) / 86400000;
    const progress = Math.max(0, Math.min(1, elapsedDays / totalDays));

    if (progress < 0.15) return '播种期';
    if (progress < 0.35) return '发芽期';
    if (progress < 0.65) return '生长期';
    if (progress < 0.9) return '结果期';
    return '成熟期';
  };

  const plantBedOptions = useMemo(() => {
    const usedBedIds = plants.map((p) => p.bedId);
    return beds.filter((bed) => !usedBedIds.includes(bed.id)).map((bed) => ({ id: bed.id, name: bed.name, status: bed.status }));
  }, [beds, plants]);

  const upcomingHarvests = useMemo(() => {
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    return plants.filter((p) => {
      const harvest = new Date(p.harvestDate);
      return harvest >= today && harvest <= thirtyDaysLater;
    }).sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate));
  }, [plants]);

  const idleBeds = useMemo(() => {
    const usedBedIds = plants.map((p) => p.bedId);
    return beds.filter((bed) => !usedBedIds.includes(bed.id));
  }, [beds, plants]);

  const filteredPlants = useMemo(() => {
    let result = [...plants];
    if (plantQuery.trim()) {
      const q = plantQuery.trim();
      result = result.filter((p) => `${p.bedName}${p.crop}${p.growthStage}${p.note}`.includes(q));
    }
    if (plantFilter) {
      result = result.filter((p) => p.growthStage === plantFilter);
    }
    return result.sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate));
  }, [plants, plantQuery, plantFilter]);

  const plantStats = useMemo(() => {
    const byStage = plants.reduce((acc, p) => {
      acc[p.growthStage] = (acc[p.growthStage] || 0) + 1;
      return acc;
    }, {});
    return { total: plants.length, upcoming: upcomingHarvests.length, idle: idleBeds.length, byStage };
  }, [plants, upcomingHarvests, idleBeds]);

  const selectPlantBed = (bedId) => {
    const bed = beds.find((b) => b.id === bedId);
    if (bed) {
      setPlantForm({ ...plantForm, bedId: bed.id, bedName: bed.name, crop: bed.crop === '待播种' ? '' : bed.crop });
    } else {
      setPlantForm({ ...plantForm, bedId: '', bedName: '', crop: '' });
    }
  };

  const addPlant = (event) => {
    event.preventDefault();
    if (!plantForm.bedId || !plantForm.crop.trim()) return;
    const stage = plantForm.growthStage === '自动计算'
      ? calculateGrowthStage(plantForm.sowDate, plantForm.harvestDate)
      : plantForm.growthStage;
    setPlants([{ id: crypto.randomUUID(), ...plantForm, growthStage: stage }, ...plants]);
    setPlantForm({ bedId: '', bedName: '', crop: '', sowDate: iso(0), harvestDate: iso(30), growthStage: '播种期', note: '' });
  };

  const deletePlant = (id) => {
    setPlants(plants.filter((p) => p.id !== id));
  };

  const updatePlantGrowthStage = (id) => {
    setPlants(plants.map((p) => {
      if (p.id === id) {
        const newStage = calculateGrowthStage(p.sowDate, p.harvestDate);
        return { ...p, growthStage: newStage };
      }
      return p;
    }));
  };

  const getDaysUntilHarvest = (harvestDate) => {
    const harvest = new Date(harvestDate);
    const now = new Date();
    const diff = Math.ceil((harvest - now) / 86400000);
    if (diff < 0) return `已过${Math.abs(diff)}天`;
    if (diff === 0) return '今天';
    return `还有${diff}天`;
  };

  const stockByMaterial = useMemo(() => {
    const map = {};
    materials.forEach((m) => {
      map[m.id] = { ...m, stock: 0, inboundTotal: 0, consumeTotal: 0 };
    });
    transactions.forEach((t) => {
      if (!map[t.materialId]) return;
      if (t.type === 'inbound') {
        map[t.materialId].stock += t.quantity;
        map[t.materialId].inboundTotal += t.quantity;
      } else {
        map[t.materialId].stock -= t.quantity;
        map[t.materialId].consumeTotal += t.quantity;
      }
    });
    return Object.values(map);
  }, [materials, transactions]);

  const lowStockItems = useMemo(() => {
    return stockByMaterial.filter((m) => m.stock <= m.lowStockThreshold);
  }, [stockByMaterial]);

  const inventoryStats = useMemo(() => {
    const categories = new Set(materials.map((m) => m.category));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyInbound = transactions.filter(
      (t) => t.type === 'inbound' && new Date(t.date) >= monthStart
    ).length;
    const monthlyConsume = transactions.filter(
      (t) => t.type === 'consume' && new Date(t.date) >= monthStart
    ).length;
    return {
      categoryCount: categories.size,
      materialCount: materials.length,
      lowStockCount: lowStockItems.length,
      monthlyInbound,
      monthlyConsume
    };
  }, [materials, transactions, lowStockItems]);

  const filteredStockByMaterial = useMemo(() => {
    let result = [...stockByMaterial];
    if (inventoryQuery.trim()) {
      const q = inventoryQuery.trim();
      result = result.filter((m) => `${m.name}${m.category}${m.note}`.includes(q));
    }
    if (inventoryCategoryFilter) {
      result = result.filter((m) => m.category === inventoryCategoryFilter);
    }
    return result.sort((a, b) => {
      const aLow = a.stock <= a.lowStockThreshold ? 0 : 1;
      const bLow = b.stock <= b.lowStockThreshold ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.category.localeCompare(b.category);
    });
  }, [stockByMaterial, inventoryQuery, inventoryCategoryFilter]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (transactionTypeFilter) {
      result = result.filter((t) => t.type === transactionTypeFilter);
    }
    if (transactionMaterialFilter) {
      result = result.filter((t) => t.materialId === transactionMaterialFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, transactionTypeFilter, transactionMaterialFilter]);

  const transactionRelatedOptions = useMemo(() => {
    const taskOpts = tasks.map((t) => ({ id: t.id, name: t.title, type: 'task' }));
    const harvestOpts = harvests.map((h) => ({ id: h.id, name: `${h.crop} ${h.weight}`, type: 'harvest' }));
    return { task: taskOpts, harvest: harvestOpts };
  }, [tasks, harvests]);

  const consumptionsByTaskId = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'consume' && t.relatedType === 'task').forEach((t) => {
      if (!map[t.relatedId]) map[t.relatedId] = [];
      map[t.relatedId].push(t);
    });
    return map;
  }, [transactions]);

  const consumptionsByHarvestId = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'consume' && t.relatedType === 'harvest').forEach((t) => {
      if (!map[t.relatedId]) map[t.relatedId] = [];
      map[t.relatedId].push(t);
    });
    return map;
  }, [transactions]);

  const consumptionsByBedName = useMemo(() => {
    const map = {};
    const taskBedMap = {};
    tasks.forEach((t) => {
      const matchedBed = beds.find((b) => t.title.includes(b.name.slice(0, 3)));
      if (matchedBed) taskBedMap[t.id] = matchedBed.name;
    });
    transactions.filter((t) => t.type === 'consume').forEach((t) => {
      let bedName = '';
      if (t.relatedType === 'harvest') {
        const h = harvests.find((h) => h.id === t.relatedId);
        if (h) bedName = h.bed;
      } else if (t.relatedType === 'task') {
        bedName = taskBedMap[t.relatedId] || '';
      }
      if (bedName) {
        if (!map[bedName]) map[bedName] = [];
        map[bedName].push(t);
      }
    });
    return map;
  }, [transactions, tasks, harvests, beds]);

  const addMaterial = (event) => {
    event.preventDefault();
    if (!materialForm.name.trim() || !materialForm.unit.trim()) return;
    setMaterials([{ id: crypto.randomUUID(), ...materialForm }, ...materials]);
    setMaterialForm({ name: '', category: '种子', unit: '', lowStockThreshold: 5, note: '' });
  };

  const deleteMaterial = (id) => {
    setMaterials(materials.filter((m) => m.id !== id));
    setTransactions(transactions.filter((t) => t.materialId !== id));
  };

  const addTransaction = (event) => {
    event.preventDefault();
    if (!transactionForm.materialId || !transactionForm.quantity) return;
    const material = materials.find((m) => m.id === transactionForm.materialId);
    if (!material) return;
    const entry = {
      id: crypto.randomUUID(),
      materialId: transactionForm.materialId,
      materialName: material.name,
      category: material.category,
      type: transactionForm.type,
      quantity: Number(transactionForm.quantity),
      unit: material.unit,
      date: transactionForm.date,
      relatedType: transactionForm.relatedType,
      relatedId: transactionForm.relatedId,
      relatedName: transactionForm.relatedName,
      note: transactionForm.note
    };
    setTransactions([entry, ...transactions]);
    setTransactionForm({ materialId: '', type: 'inbound', quantity: '', date: iso(0), relatedType: '', relatedId: '', relatedName: '', note: '' });
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const selectTransactionRelated = (type, id) => {
    if (!type || !id) {
      setTransactionForm({ ...transactionForm, relatedType: '', relatedId: '', relatedName: '' });
      return;
    }
    const opts = transactionRelatedOptions[type] || [];
    const found = opts.find((o) => o.id === id);
    if (found) {
      setTransactionForm({ ...transactionForm, relatedType: type, relatedId: found.id, relatedName: found.name });
    }
  };

  const startEditMaterial = (id) => {
    const m = materials.find((x) => x.id === id);
    if (m) {
      setEditingMaterialId(id);
      setEditingMaterialForm({ name: m.name, category: m.category, unit: m.unit, lowStockThreshold: m.lowStockThreshold, note: m.note });
    }
  };

  const saveEditMaterial = (event) => {
    event.preventDefault();
    if (!editingMaterialForm.name.trim() || !editingMaterialForm.unit.trim()) return;
    setMaterials(materials.map((m) => m.id === editingMaterialId ? { ...m, ...editingMaterialForm } : m));
    setTransactions(transactions.map((t) => {
      if (t.materialId !== editingMaterialId) return t;
      return {
        ...t,
        materialName: editingMaterialForm.name,
        category: editingMaterialForm.category,
        unit: editingMaterialForm.unit
      };
    }));
    setEditingMaterialId('');
  };

  const cancelEditMaterial = () => {
    setEditingMaterialId('');
  };

  const quickInbound = (materialId) => {
    const m = materials.find((x) => x.id === materialId);
    if (!m) return;
    setTransactionForm({
      materialId: m.id,
      type: 'inbound',
      quantity: String(Math.max(m.lowStockThreshold, 5)),
      date: iso(0),
      relatedType: '',
      relatedId: '',
      relatedName: '',
      note: '快速补货'
    });
    setActiveTab('inventory');
  };

  const quickConsumeForTask = (taskId, taskTitle) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'task',
      relatedId: taskId,
      relatedName: taskTitle,
      note: ''
    });
    setActiveTab('inventory');
  };

  const quickConsumeForHarvest = (harvestId, harvestName) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'harvest',
      relatedId: harvestId,
      relatedName: harvestName,
      note: ''
    });
    setActiveTab('inventory');
  };

  const getMaterialInfo = (materialId) => {
    const m = materials.find((x) => x.id === materialId);
    return m ? { name: m.name, category: m.category, unit: m.unit } : null;
  };

  const feeBedOptions = useMemo(() => {
    return beds.filter((bed) => bed.status !== '空闲' && bed.adopter).map((bed) => ({ id: bed.id, name: bed.name, adopter: bed.adopter }));
  }, [beds]);

  const selectFeeBed = (bedId) => {
    const bed = beds.find((b) => b.id === bedId);
    if (bed) {
      setFeeForm({ ...feeForm, bedId: bed.id, bedName: bed.name, adopter: bed.adopter });
    } else {
      setFeeForm({ ...feeForm, bedId: '', bedName: '', adopter: '' });
    }
  };

  const addFee = (event) => {
    event.preventDefault();
    if (!feeForm.bedId || !feeForm.amount) return;
    setFees([{ id: crypto.randomUUID(), ...feeForm, amount: Number(feeForm.amount) }, ...fees]);
    setFeeForm({ bedId: '', bedName: '', adopter: '', startDate: iso(-30), endDate: iso(335), amount: '', paymentStatus: '待缴费', donationNote: '' });
  };

  const deleteFee = (id) => {
    setFees(fees.filter((f) => f.id !== id));
  };

  const updateFeeStatus = (id, status) => {
    setFees(fees.map((f) => f.id === id ? { ...f, paymentStatus: status } : f));
  };

  const feeStats = useMemo(() => {
    const idleBedIds = new Set(beds.filter((b) => b.status === '空闲').map((b) => b.id));
    const activeFees = fees.filter((f) => !idleBedIds.has(f.bedId));
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const expiring = activeFees.filter((f) => {
      const end = new Date(f.endDate);
      return end >= today && end <= sevenDaysLater;
    });
    const overdue = activeFees.filter((f) => f.paymentStatus === '欠费');
    const pending = activeFees.filter((f) => f.paymentStatus === '待缴费');
    const paid = activeFees.filter((f) => f.paymentStatus === '已缴费');
    const totalAmount = activeFees.reduce((sum, f) => sum + f.amount, 0);
    const paidAmount = paid.reduce((sum, f) => sum + f.amount, 0);
    const overdueAmount = overdue.reduce((sum, f) => sum + f.amount, 0);
    return { expiringCount: expiring.length, overdueCount: overdue.length, pendingCount: pending.length, paidCount: paid.length, totalAmount, paidAmount, overdueAmount, expiring };
  }, [fees, beds]);

  const filteredFees = useMemo(() => {
    const idleBedIds = new Set(beds.filter((b) => b.status === '空闲').map((b) => b.id));
    let result = fees.filter((f) => !idleBedIds.has(f.bedId));
    if (feeQuery.trim()) {
      const q = feeQuery.trim();
      result = result.filter((f) => `${f.bedName}${f.adopter}${f.donationNote}`.includes(q));
    }
    if (feeStatusFilter) {
      result = result.filter((f) => f.paymentStatus === feeStatusFilter);
    }
    return result.sort((a, b) => {
      const statusOrder = { '欠费': 0, '待缴费': 1, '已缴费': 2 };
      if (statusOrder[a.paymentStatus] !== statusOrder[b.paymentStatus]) {
        return statusOrder[a.paymentStatus] - statusOrder[b.paymentStatus];
      }
      return new Date(a.endDate) - new Date(b.endDate);
    });
  }, [fees, beds, feeQuery, feeStatusFilter]);

  const getFeeByBed = useMemo(() => {
    const map = {};
    const idleBedIds = new Set(beds.filter((b) => b.status === '空闲').map((b) => b.id));
    fees.filter((f) => !idleBedIds.has(f.bedId)).forEach((f) => {
      if (!map[f.bedId]) {
        map[f.bedId] = [];
      }
      map[f.bedId].push(f);
    });
    return map;
  }, [fees, beds]);

  const getDaysUntilExpiry = (endDate) => {
    const end = new Date(endDate);
    const diff = Math.ceil((end - today) / 86400000);
    if (diff < 0) return `已过期${Math.abs(diff)}天`;
    if (diff === 0) return '今天到期';
    return `还剩${diff}天`;
  };

  const openThresholdConfig = () => {
    setThresholdForm(JSON.parse(JSON.stringify(envThresholds)));
    setShowThresholdConfig(true);
  };

  const saveThresholds = (event) => {
    event.preventDefault();
    setEnvThresholds(thresholdForm);
    setShowThresholdConfig(false);
  };

  const updateThreshold = (sensor, field, value) => {
    setThresholdForm({
      ...thresholdForm,
      [sensor]: {
        ...thresholdForm[sensor],
        [field]: Number(value)
      }
    });
  };

  const isEnvNormal = (sensor) => {
    if (!currentEnv) return true;
    const threshold = envThresholds[sensor];
    const value = currentEnv[sensor];
    return value >= threshold.min && value <= threshold.max;
  };

  const getEnvTrend = (sensor) => {
    if (!envHistory || envHistory.length < 2) return 'stable';
    const recent = envHistory.slice(-3);
    const first = recent[0][sensor];
    const last = recent[recent.length - 1][sensor];
    const diff = last - first;
    if (Math.abs(diff) < 0.01 * Math.abs(first)) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChartData = (sensor) => {
    if (!envHistory || envHistory.length === 0) return [];
    const values = envHistory.map((h) => h[sensor]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return envHistory.map((h) => ({
      date: h.date,
      value: h[sensor],
      percent: ((h[sensor] - min) / range) * 100
    }));
  };

  const parseWeight = (weightStr) => {
    if (!weightStr) return 0;
    const num = parseFloat(String(weightStr).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const formatWeight = (num, unit = 'kg') => {
    if (num === 0 || !num) return `0${unit}`;
    return `${Number(num).toFixed(2).replace(/\.?0+$/, '')}${unit}`;
  };

  const getDistributionByHarvestId = useMemo(() => {
    const map = {};
    harvestDistributions.forEach((d) => {
      map[d.harvestId] = d;
    });
    return map;
  }, [harvestDistributions]);

  const getDistributionStatus = useMemo(() => {
    const map = {};
    harvests.forEach((h) => {
      const totalHarvest = parseWeight(h.weight);
      const dist = getDistributionByHarvestId[h.id];
      if (!dist) {
        map[h.id] = { status: 'unassigned', allocated: 0, total: totalHarvest, remaining: totalHarvest, percentage: 0 };
        return;
      }
      const allocated = (Number(dist.selfPickup) || 0) + (Number(dist.communityShare) || 0) + (Number(dist.volunteerSample) || 0) + (Number(dist.loss) || 0);
      const remaining = Math.max(0, totalHarvest - allocated);
      const percentage = totalHarvest > 0 ? Math.min(100, (allocated / totalHarvest) * 100) : 0;
      let status = 'partial';
      if (allocated === 0) status = 'unassigned';
      else if (percentage >= 99.99) status = 'completed';
      map[h.id] = { status, allocated, total: totalHarvest, remaining, percentage };
    });
    return map;
  }, [harvests, getDistributionByHarvestId]);

  const harvestUnassignedWarnings = useMemo(() => {
    return harvests
      .filter((h) => getDistributionStatus[h.id]?.status === 'unassigned')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((h) => ({
        id: `harvest-unassigned-${h.id}`,
        type: 'harvest-unassigned',
        name: `${h.crop}（${h.bed}）`,
        message: `采摘重量 ${h.weight} 尚未分配去向`
      }));
  }, [harvests, getDistributionStatus]);

  const harvestPartialWarnings = useMemo(() => {
    return harvests
      .filter((h) => getDistributionStatus[h.id]?.status === 'partial')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((h) => ({
        id: `harvest-partial-${h.id}`,
        type: 'harvest-partial',
        name: `${h.crop}（${h.bed}）`,
        message: `还剩 ${formatWeight(getDistributionStatus[h.id].remaining)} 未分配（已分配 ${Math.round(getDistributionStatus[h.id].percentage)}%）`
      }));
  }, [harvests, getDistributionStatus]);

  const allWarningsWithDistribution = useMemo(() => {
    const distWarnings = [...harvestUnassignedWarnings, ...harvestPartialWarnings];
    return [...allWarnings, ...distWarnings];
  }, [allWarnings, harvestUnassignedWarnings, harvestPartialWarnings]);

  const openDistributionModal = (harvestId) => {
    const harvest = harvests.find((h) => h.id === harvestId);
    if (!harvest) return;
    const existing = getDistributionByHarvestId[harvestId];
    if (existing) {
      setDistributionForm({
        selfPickup: existing.selfPickup || '',
        communityShare: existing.communityShare || '',
        volunteerSample: existing.volunteerSample || '',
        loss: existing.loss || '',
        note: existing.note || ''
      });
    } else {
      setDistributionForm({ selfPickup: '', communityShare: '', volunteerSample: '', loss: '', note: '' });
    }
    setDistributingHarvestId(harvestId);
    setDistributionError('');
    setShowDistributionModal(true);
  };

  const closeDistributionModal = () => {
    setShowDistributionModal(false);
    setDistributingHarvestId(null);
    setDistributionForm({ selfPickup: '', communityShare: '', volunteerSample: '', loss: '', note: '' });
    setDistributionError('');
  };

  const validateDistribution = () => {
    if (!distributingHarvestId) return { valid: false, message: '采摘记录不存在' };
    const harvest = harvests.find((h) => h.id === distributingHarvestId);
    if (!harvest) return { valid: false, message: '采摘记录不存在' };
    const totalHarvest = parseWeight(harvest.weight);
    const selfPickup = Number(distributionForm.selfPickup) || 0;
    const communityShare = Number(distributionForm.communityShare) || 0;
    const volunteerSample = Number(distributionForm.volunteerSample) || 0;
    const loss = Number(distributionForm.loss) || 0;
    const totalAllocated = selfPickup + communityShare + volunteerSample + loss;
    if (selfPickup < 0 || communityShare < 0 || volunteerSample < 0 || loss < 0) {
      return { valid: false, message: '分配重量不能为负数' };
    }
    if (totalAllocated > totalHarvest + 0.001) {
      return {
        valid: false,
        message: `分配总量（${formatWeight(totalAllocated)}）不能超过采摘重量（${harvest.weight}），还可分配 ${formatWeight(Math.max(0, totalHarvest - totalAllocated + (totalAllocated > totalHarvest ? 0 : 0)))}`
      };
    }
    return { valid: true, totalHarvest, totalAllocated };
  };

  const saveDistribution = (event) => {
    event.preventDefault();
    const validation = validateDistribution();
    if (!validation.valid) {
      setDistributionError(validation.message);
      return;
    }
    const existing = getDistributionByHarvestId[distributingHarvestId];
    const selfPickup = Number(distributionForm.selfPickup) || 0;
    const communityShare = Number(distributionForm.communityShare) || 0;
    const volunteerSample = Number(distributionForm.volunteerSample) || 0;
    const loss = Number(distributionForm.loss) || 0;
    const entry = {
      id: existing ? existing.id : crypto.randomUUID(),
      harvestId: distributingHarvestId,
      selfPickup,
      communityShare,
      volunteerSample,
      loss,
      note: distributionForm.note
    };
    if (existing) {
      setHarvestDistributions(harvestDistributions.map((d) => (d.id === existing.id ? entry : d)));
    } else {
      setHarvestDistributions([entry, ...harvestDistributions]);
    }
    closeDistributionModal();
  };

  const currentDistributingHarvest = useMemo(() => {
    if (!distributingHarvestId) return null;
    return harvests.find((h) => h.id === distributingHarvestId) || null;
  }, [distributingHarvestId, harvests]);

  const distributionFormTotal = useMemo(() => {
    const selfPickup = Number(distributionForm.selfPickup) || 0;
    const communityShare = Number(distributionForm.communityShare) || 0;
    const volunteerSample = Number(distributionForm.volunteerSample) || 0;
    const loss = Number(distributionForm.loss) || 0;
    return selfPickup + communityShare + volunteerSample + loss;
  }, [distributionForm]);

  const distributionHarvestTotal = useMemo(() => {
    if (!currentDistributingHarvest) return 0;
    return parseWeight(currentDistributingHarvest.weight);
  }, [currentDistributingHarvest]);

  return (
    <main>
      <header className="hero">
        <div>
          <p>社区屋顶菜园</p>
          <h1>认养管理台</h1>
        </div>
        <div className="heroStats">
          <span><Leaf size={18} />{activeCount}块认养中</span>
          <span><Droplets size={18} />{weekWater.length}块本周浇水</span>
          <span><Timer size={18} />{feeStats.expiringCount}笔即将到期</span>
          <span><XCircle size={18} />{feeStats.overdueCount}笔欠费</span>
          <span><TriangleAlert size={18} />{allWarningsWithDistribution.length}条异常</span>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setActiveTab('dashboard')}>
          <Leaf size={16} />菜园总览
        </button>
        <button className={activeTab === 'floorMap' ? 'tab active' : 'tab'} onClick={() => setActiveTab('floorMap')}>
          <Grid3X3 size={16} />菜畦平面图
        </button>
        <button className={activeTab === 'plants' ? 'tab active' : 'tab'} onClick={() => setActiveTab('plants')}>
          <Sprout size={16} />种植计划
        </button>
        <button className={activeTab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setActiveTab('contacts')}>
          <MessageCircle size={16} />联系记录
        </button>
        <button className={activeTab === 'schedules' ? 'tab active' : 'tab'} onClick={() => setActiveTab('schedules')}>
          <Users size={16} />志愿者排班
        </button>
        <button className={activeTab === 'inventory' ? 'tab active' : 'tab'} onClick={() => setActiveTab('inventory')}>
          <Archive size={16} />物资库存
        </button>
        <button className={activeTab === 'fees' ? 'tab active' : 'tab'} onClick={() => setActiveTab('fees')}>
          <Wallet size={16} />费用管理
        </button>
        <button className={activeTab === 'environment' ? 'tab active' : 'tab'} onClick={() => setActiveTab('environment')}>
          <Gauge size={16} />环境监测
        </button>
      </nav>

      {activeTab === 'dashboard' && (
        <>
          <section className="dashboard">
            <article>
              <h2>本周浇水</h2>
              {weekWater.map((bed) => <button className="listButton" key={bed.id} onClick={() => advanceWater(bed.id)}>{bed.name}<span>{bed.nextWater}</span></button>)}
            </article>
            <article>
              <h2>最近采摘</h2>
              {harvests.slice(0, 4).map((item) => {
                const distStatus = getDistributionStatus[item.id];
                const statusTag = distStatus?.status;
                return (
                <div key={item.id} className="harvestMiniCard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <p className="row" style={{ margin: 0, flex: 1 }}><Wheat size={16} />{item.crop}{item.weight}<span>{item.date}</span></p>
                    {statusTag && (
                      <span className={`distributionStatusTag ${statusTag}`} title={`已分配 ${Math.round(distStatus.percentage)}%`}>
                        {statusTag === 'unassigned' && <AlertCircle size={12} />}
                        {statusTag === 'partial' && <Timer size={12} />}
                        {statusTag === 'completed' && <CheckCircle2 size={12} />}
                        {statusTag === 'unassigned' ? '未分配' : statusTag === 'partial' ? `部分分配 ${Math.round(distStatus.percentage)}%` : '已分配'}
                      </span>
                    )}
                  </div>
                  {distStatus && distStatus.status !== 'unassigned' && getDistributionByHarvestId[item.id] && (
                    <div className="distributionMiniSummary">
                      {getDistributionByHarvestId[item.id].selfPickup > 0 && <span><Users size={11} />自取{formatWeight(getDistributionByHarvestId[item.id].selfPickup)}</span>}
                      {getDistributionByHarvestId[item.id].communityShare > 0 && <span><Heart size={11} />分享{formatWeight(getDistributionByHarvestId[item.id].communityShare)}</span>}
                      {getDistributionByHarvestId[item.id].volunteerSample > 0 && <span><Sprout size={11} />留样{formatWeight(getDistributionByHarvestId[item.id].volunteerSample)}</span>}
                      {getDistributionByHarvestId[item.id].loss > 0 && <span><XCircle size={11} />损耗{formatWeight(getDistributionByHarvestId[item.id].loss)}</span>}
                    </div>
                  )}
                  {consumptionsByHarvestId[item.id] && consumptionsByHarvestId[item.id].length > 0 && (
                    <div className="taskConsumptions">
                      {consumptionsByHarvestId[item.id].map((c) => {
                        const info = getMaterialInfo(c.materialId);
                        return (
                        <span key={c.id} className="miniConsumeTag">
                          <Package size={12} />{info ? info.name : c.materialName} -{c.quantity}{info ? info.unit : c.unit}
                        </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="harvestMiniActions">
                    <button type="button" className="miniBtn distributionBtn" onClick={() => openDistributionModal(item.id)}>
                      {statusTag === 'unassigned' ? <AlertCircle size={12} /> : statusTag === 'completed' ? <CheckCircle2 size={12} /> : <Timer size={12} />}
                      {statusTag === 'unassigned' ? '分配去向' : statusTag === 'completed' ? '编辑分配' : '继续分配'}
                    </button>
                    <button type="button" className="miniBtn" onClick={() => quickConsumeForHarvest(item.id, `${item.crop} ${item.weight}`)}>
                      <ArrowUpCircle size={12} />登记追肥/耗材
                    </button>
                  </div>
                </div>
              );
              })}
            </article>
            <article>
              <h2>异常提醒</h2>
              {allWarningsWithDistribution.length ? allWarningsWithDistribution.map((w) => (
                <p className={`row alert ${w.level === 'critical' ? 'critical' : ''} ${w.type?.startsWith('harvest-') ? 'harvestWarning' : ''}`} key={w.id}>
                  {w.type?.startsWith('harvest-') ? <AlertCircle size={16} /> : <TriangleAlert size={16} />}
                  {w.type === 'bed' ? w.name : w.type?.startsWith('harvest-') ? w.name : w.sensorName}
                  <span onClick={() => {
                    if (w.type === 'harvest-unassigned' || w.type === 'harvest-partial') {
                      const harvestId = w.id.replace('harvest-unassigned-', '').replace('harvest-partial-', '');
                      openDistributionModal(harvestId);
                    }
                  }} style={{ cursor: w.type?.startsWith('harvest-') ? 'pointer' : 'default' }}>
                    {w.type === 'bed' ? w.message : w.type?.startsWith('harvest-') ? `${w.message}（点击分配）` : w.message}
                  </span>
                </p>
              )) : <p className="muted">暂无异常</p>}
            </article>
          </section>

          {feeStats.expiring.length > 0 && (
            <section className="feeExpiryWarning">
              <h2><Timer size={18} />认养即将到期</h2>
              <div className="feeExpiryCards">
                {feeStats.expiring.map((fee) => (
                  <div className="feeExpiryCard" key={fee.id}>
                    <div className="feeExpiryInfo">
                      <strong>{fee.bedName}</strong>
                      <span className="feeExpiryAdopter">{fee.adopter}</span>
                    </div>
                    <div className="feeExpiryMeta">
                      <span className="feeExpiryCountdown">{getDaysUntilExpiry(fee.endDate)}</span>
                      <span className="feeExpiryAmount">¥{fee.amount}</span>
                      <span className={`feeStatusTag ${fee.paymentStatus}`}>{fee.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="workspace">
            <form onSubmit={addBed} className="panel">
              <h2><Plus size={18} />新增菜畦</h2>
              <input placeholder="菜畦名称" value={bedForm.name} onChange={(e) => setBedForm({ ...bedForm, name: e.target.value })} />
              <input placeholder="作物" value={bedForm.crop} onChange={(e) => setBedForm({ ...bedForm, crop: e.target.value })} />
              <div className="grid2">
                <input placeholder="认养人" value={bedForm.adopter} onChange={(e) => setBedForm({ ...bedForm, adopter: e.target.value })} />
                <input placeholder="手机号" value={bedForm.phone} onChange={(e) => setBedForm({ ...bedForm, phone: e.target.value })} />
                <input placeholder="面积" value={bedForm.area} onChange={(e) => setBedForm({ ...bedForm, area: e.target.value })} />
                <input type="date" value={bedForm.nextWater} onChange={(e) => setBedForm({ ...bedForm, nextWater: e.target.value })} />
              </div>
              <select value={bedForm.status} onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}>
                <option>认养中</option>
                <option>空闲</option>
                <option>暂停维护</option>
              </select>
              <input placeholder="异常提醒" value={bedForm.warning} onChange={(e) => setBedForm({ ...bedForm, warning: e.target.value })} />
              <button>保存菜畦</button>
            </form>

            <div className="panel wide">
              <div className="toolbar">
                <h2>菜畦档案</h2>
                <label><Search size={16} /><input placeholder="搜索名称/认养人/手机" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
              </div>
              <div className="cards">
                {filteredBeds.map((bed) => (
                  <article className="bedCard" key={bed.id}>
                    <strong>{bed.name}</strong>
                    <span>{bed.crop}</span>
                    <p>{bed.adopter || '待认养'} · {bed.area} · {bed.status}</p>
                    <p><CalendarDays size={15} />下次浇水 {bed.nextWater}</p>
                    {consumptionsByBedName[bed.name] && consumptionsByBedName[bed.name].length > 0 && (
                      <div className="bedMaterials">
                        <span className="bedMaterialsLabel"><Package size={12} />近期用资：</span>
                        <div className="bedMaterialTags">
                          {consumptionsByBedName[bed.name].slice(0, 3).map((c) => {
                            const info = getMaterialInfo(c.materialId);
                            return (
                            <span key={c.id} className="miniConsumeTag">
                              {info ? info.name : c.materialName} -{c.quantity}{info ? info.unit : c.unit}
                            </span>
                            );
                          })}
                          {consumptionsByBedName[bed.name].length > 3 && (
                            <span className="miniConsumeTag more">+{consumptionsByBedName[bed.name].length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {getLastContactByBed[bed.id] && (
                      <p className="lastContact">
                        <MessageCircle size={15} />
                        <span className="lastContactType">{getLastContactByBed[bed.id].type}</span>
                        <span className="lastContactText">{getLastContactByBed[bed.id].content.slice(0, 20)}...</span>
                        <span className="lastContactDate">{getLastContactByBed[bed.id].date}</span>
                      </p>
                    )}
                    {getFeeByBed[bed.id] && (
                      <div className="bedFeeInfo">
                        <span className="bedFeeLabel"><Wallet size={12} />费用：</span>
                        <div className="bedFeeTags">
                          {getFeeByBed[bed.id].map((f) => (
                            <span key={f.id} className={`bedFeeTag ${f.paymentStatus}`}>
                              ¥{f.amount} {f.paymentStatus}
                              <small>{getDaysUntilExpiry(f.endDate)}</small>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="workspace bottom">
            <form onSubmit={addHarvest} className="panel">
              <h2>新增采摘记录</h2>
              <select value={harvestForm.bed} onChange={(e) => setHarvestForm({ ...harvestForm, bed: e.target.value })}>
                <option value="">选择菜畦</option>
                {harvestOptions.map((name) => <option key={name}>{name}</option>)}
              </select>
              <input placeholder="采摘作物" value={harvestForm.crop} onChange={(e) => setHarvestForm({ ...harvestForm, crop: e.target.value })} />
              <input placeholder="重量" value={harvestForm.weight} onChange={(e) => setHarvestForm({ ...harvestForm, weight: e.target.value })} />
              <input type="date" value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} />
              <input placeholder="备注" value={harvestForm.note} onChange={(e) => setHarvestForm({ ...harvestForm, note: e.target.value })} />
              <button>保存采摘</button>
            </form>
            <div className="panel">
              <h2>待处理事项</h2>
              {tasks.map((task) => (
                <div className="taskCard" key={task.id}>
                  <label className="task">
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                    <span className={task.done ? 'done' : ''}>{task.title}</span>
                    <small>{task.owner} · {task.due}</small>
                  </label>
                  {consumptionsByTaskId[task.id] && consumptionsByTaskId[task.id].length > 0 && (
                    <div className="taskConsumptions">
                      {consumptionsByTaskId[task.id].map((c) => {
                        const info = getMaterialInfo(c.materialId);
                        return (
                        <span key={c.id} className="miniConsumeTag">
                          <Package size={12} />{info ? info.name : c.materialName} -{c.quantity}{info ? info.unit : c.unit}
                        </span>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" className="miniBtn" onClick={() => quickConsumeForTask(task.id, task.title)}>
                    <ArrowUpCircle size={12} />登记消耗
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'floorMap' && (
        <>
          <section className="dashboard">
            <article>
              <h2>总格子数</h2>
              <p className="statNumber">{floorMapStats.total}<span>个</span></p>
            </article>
            <article>
              <h2>已使用</h2>
              <p className="statNumber">{floorMapStats.placed}<span>个</span></p>
            </article>
            <article>
              <h2>认养中</h2>
              <p className="statNumber" style={{ color: '#3d7a2c' }}>{floorMapStats.adopted}<span>块</span></p>
            </article>
            <article>
              <h2>需浇水</h2>
              <p className="statNumber" style={{ color: floorMapStats.needWater > 0 ? '#8b3f23' : '#3d7a2c' }}>{floorMapStats.needWater}<span>块</span></p>
            </article>
            <article>
              <h2>异常提醒</h2>
              <p className="statNumber" style={{ color: floorMapStats.hasWarning > 0 ? '#8b3f23' : '#3d7a2c' }}>{floorMapStats.hasWarning}<span>条</span></p>
            </article>
          </section>

          {floorMapStats.unplaced > 0 && (
            <section className="inventoryWarning">
              <h2><AlertTriangle size={18} />未定位菜畦</h2>
              <p className="muted">有 {floorMapStats.unplaced} 块菜畦尚未分配位置，请点击下方按钮自动分配或拖拽到网格中。</p>
              <button className="miniBtn" onClick={autoAssignUnplacedBeds} style={{ marginTop: '12px' }}>
                <Layers size={14} /> 自动分配所有未定位菜畦
              </button>
              <div className="unplacedBedsList">
                {unplacedBeds.map(bed => (
                  <div
                    key={bed.id}
                    className="unplacedBedItem"
                    draggable
                    onDragStart={(e) => handleDragStart(e, bed)}
                    onDragEnd={handleDragEnd}
                  >
                    <Move size={14} />
                    <span>{bed.name}</span>
                    <span className="unplacedBedCrop">{bed.crop}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="floorMapToolbar">
            <div className="toolbarActions">
              <select
                className="filterSelect"
                value={floorMapZoneFilter}
                onChange={(e) => setFloorMapZoneFilter(e.target.value)}
              >
                <option value="">全部区域</option>
                {Object.entries(ZONE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.name} - {config.description}</option>
                ))}
              </select>
            </div>
            <div className="legend">
              <span className="legendItem"><span className="legendDot status-adopted"></span>认养中</span>
              <span className="legendItem"><span className="legendDot status-idle"></span>空闲</span>
              <span className="legendItem"><span className="legendDot status-paused"></span>暂停维护</span>
              <span className="legendItem"><span className="legendDot water-urgent"></span>需紧急浇水</span>
              <span className="legendItem"><span className="legendDot has-warning"></span>有异常</span>
            </div>
          </div>

          <div className="floorMapContainer">
            {Object.entries(ZONE_CONFIG).map(([zone, config]) => {
              if (floorMapZoneFilter && floorMapZoneFilter !== zone) return null;
              return (
                <div key={zone} className="zoneSection">
                  <div className="zoneHeader">
                    <h2>{config.name}</h2>
                    <span className="zoneDescription">{config.description}</span>
                    <span className="zoneUsage">{bedsByZone[zone]?.length || 0}/{config.rows * config.cols}</span>
                  </div>
                  <div
                    className="gridContainer"
                    style={{
                      gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${config.rows}, 1fr)`
                    }}
                  >
                    {Array.from({ length: config.rows }).map((_, row) =>
                      Array.from({ length: config.cols }).map((_, col) => {
                        const bed = getBedAtPosition(zone, row, col);
                        const waterStatus = bed ? getWaterStatus(bed.nextWater) : null;
                        const isDraggingOver = draggedBed && !bed;
                        
                        return (
                          <div
                            key={`${zone}-${row}-${col}`}
                            className={`gridCell ${bed ? 'hasBed' : 'empty'} ${isDraggingOver ? 'dragOver' : ''} ${bed && draggedBed?.id === bed.id ? 'dragging' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, zone, row, col)}
                            onClick={() => bed && openBedDetail(bed)}
                          >
                            {bed ? (
                              <div
                                className={`bedGridCard status-${bed.status} ${waterStatus?.status === 'overdue' || waterStatus?.status === 'urgent' ? 'water-urgent' : ''} ${bed.warning ? 'has-warning' : ''}`}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, bed);
                                }}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="bedGridHeader">
                                  <span className="bedGridName">{bed.name}</span>
                                  <Move size={12} className="dragHandle" />
                                </div>
                                <div className="bedGridCrop">{bed.crop}</div>
                                <div className="bedGridFooter">
                                  {bed.adopter ? (
                                    <span className="bedGridAdopter"><Users size={10} />{bed.adopter.slice(0, 3)}</span>
                                  ) : (
                                    <span className="bedGridAdopter idle">待认养</span>
                                  )}
                                  <span className={`bedGridWater water-${waterStatus?.status}`}>
                                    <Droplets size={10} />{waterStatus?.label}
                                  </span>
                                </div>
                                {bed.warning && (
                                  <div className="bedGridWarning">
                                    <AlertTriangle size={10} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="emptyCell">
                                <span className="cellCoordinate">{zone}{row * config.cols + col + 1}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'plants' && (
        <>
          <section className="dashboard">
            <article>
              <h2>总种植计划</h2>
              <p className="statNumber">{plantStats.total}<span>块</span></p>
            </article>
            <article>
              <h2>30天内采摘</h2>
              <p className="statNumber">{plantStats.upcoming}<span>批</span></p>
            </article>
            <article>
              <h2>空闲菜畦</h2>
              <p className="statNumber">{plantStats.idle}<span>块</span></p>
            </article>
          </section>

          <section className="workspace">
            <form onSubmit={addPlant} className="panel">
              <h2><Plus size={18} />新增种植计划</h2>
              <select value={plantForm.bedId} onChange={(e) => selectPlantBed(e.target.value)}>
                <option value="">选择目标菜畦</option>
                {plantBedOptions.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.name} {bed.status === '空闲' ? '（空闲）' : ''}
                  </option>
                ))}
              </select>
              {plantBedOptions.length === 0 && (
                <p className="muted" style={{ fontSize: '13px', marginTop: '-4px' }}>所有菜畦都已安排种植计划</p>
              )}
              <input placeholder="种植作物" value={plantForm.crop} onChange={(e) => setPlantForm({ ...plantForm, crop: e.target.value })} />
              <div className="grid2">
                <div>
                  <label style={{ fontSize: '13px', color: '#71806a', marginBottom: '4px', display: 'block' }}>播种日期</label>
                  <input type="date" value={plantForm.sowDate} onChange={(e) => setPlantForm({ ...plantForm, sowDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#71806a', marginBottom: '4px', display: 'block' }}>预计采摘</label>
                  <input type="date" value={plantForm.harvestDate} onChange={(e) => setPlantForm({ ...plantForm, harvestDate: e.target.value })} />
                </div>
              </div>
              <select value={plantForm.growthStage} onChange={(e) => setPlantForm({ ...plantForm, growthStage: e.target.value })}>
                <option value="自动计算">自动计算生长期</option>
                <option>播种期</option>
                <option>发芽期</option>
                <option>生长期</option>
                <option>结果期</option>
                <option>成熟期</option>
              </select>
              <textarea placeholder="备注（种植密度、品种特性等）" rows="3" value={plantForm.note} onChange={(e) => setPlantForm({ ...plantForm, note: e.target.value })} />
              <button type="submit">保存计划</button>
            </form>

            <div className="panel wide">
              <div className="toolbar">
                <h2>未来30天采摘计划</h2>
              </div>
              {upcomingHarvests.length === 0 ? (
                <div className="emptyState">
                  <CalendarCheck size={36} />
                  <p>未来30天暂无待采摘作物</p>
                  <p className="muted">添加种植计划后将在此展示</p>
                </div>
              ) : (
                <div className="harvestList">
                  {upcomingHarvests.map((plant) => {
                    const days = getDaysUntilHarvest(plant.harvestDate);
                    const isUrgent = days.includes('今天') || (days.includes('还有') && parseInt(days.replace(/\D/g, '')) <= 7);
                    return (
                      <article className="harvestCard" key={plant.id}>
                        <div className="harvestHeader">
                          <div className="harvestInfo">
                            <strong>{plant.crop}</strong>
                            <span className="harvestBed">{plant.bedName}</span>
                          </div>
                          <div className={`harvestCountdown ${isUrgent ? 'urgent' : ''}`}>
                            {days}
                          </div>
                        </div>
                        <div className="harvestBody">
                          <p className="row"><CalendarDays size={15} />预计采摘：{plant.harvestDate}<span>{getWeekday(plant.harvestDate)}</span></p>
                          <p className="row"><Sprout size={15} />当前阶段：<span className={`stageTag ${plant.growthStage}`}>{plant.growthStage}</span></p>
                          {plant.note && <p className="harvestNote">📝 {plant.note}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="workspace bottom">
            <div className="panel wide">
              <div className="toolbar">
                <h2>全部种植计划</h2>
                <div className="toolbarActions">
                  <select className="filterSelect" value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
                    <option value="">全部阶段</option>
                    <option>播种期</option>
                    <option>发芽期</option>
                    <option>生长期</option>
                    <option>结果期</option>
                    <option>成熟期</option>
                  </select>
                  <label><Search size={16} /><input placeholder="搜索菜畦/作物/阶段" value={plantQuery} onChange={(e) => setPlantQuery(e.target.value)} /></label>
                  {plantFilter && (
                    <button className="clearBtn" onClick={() => setPlantFilter('')}>清除筛选</button>
                  )}
                </div>
              </div>
              <div className="plantList">
                {filteredPlants.length === 0 ? (
                  <div className="emptyState">
                    <Sprout size={36} />
                    <p>暂无种植计划{plantQuery || plantFilter ? '（请调整筛选条件）' : ''}</p>
                    <p className="muted">空闲菜畦请先添加种植计划</p>
                  </div>
                ) : (
                  filteredPlants.map((plant) => (
                    <article className="plantCard" key={plant.id}>
                      <div className="plantHeader">
                        <div className="plantInfo">
                          <strong>{plant.bedName}</strong>
                          <span className="plantCrop">{plant.crop}</span>
                        </div>
                        <div className="plantActions">
                          <button className="clearBtn" onClick={() => updatePlantGrowthStage(plant.id)} title="重新计算生长期">
                            <CalendarDays size={14} />
                          </button>
                          <button className="deleteBtn" onClick={() => deletePlant(plant.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="plantBody">
                        <div className="plantDates">
                          <div className="plantDateItem">
                            <span className="plantDateLabel">播种</span>
                            <span className="plantDateValue">{plant.sowDate}</span>
                          </div>
                          <div className="plantDateDivider">→</div>
                          <div className="plantDateItem">
                            <span className="plantDateLabel">预计采摘</span>
                            <span className="plantDateValue">{plant.harvestDate}</span>
                          </div>
                        </div>
                        <div className="plantStageRow">
                          <span className={`stageTag ${plant.growthStage}`}>{plant.growthStage}</span>
                          <span className="harvestCountdown">{getDaysUntilHarvest(plant.harvestDate)}</span>
                        </div>
                        {plant.note && <p className="plantNote">📝 {plant.note}</p>}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          {idleBeds.length > 0 && (
            <section className="workspace">
              <div className="panel wide">
                <div className="toolbar">
                  <h2><AlertCircle size={18} />空闲菜畦（待安排种植）</h2>
                </div>
                <div className="cards">
                  {idleBeds.map((bed) => (
                    <article className="bedCard idleBedCard" key={bed.id}>
                      <strong>{bed.name}</strong>
                      <span>{bed.crop}</span>
                      <p>{bed.area} · {bed.status}</p>
                      {bed.warning && <p className="row alert"><TriangleAlert size={15} />{bed.warning}</p>}
                      <button className="listButton" onClick={() => {
                        setActiveTab('plants');
                        selectPlantBed(bed.id);
                      }}>
                        <Plus size={16} /> 添加种植计划
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'contacts' && (
        <>
          <section className="dashboard">
            <article>
              <h2>本周联系</h2>
              <p className="statNumber">{contactStats.total}<span>次</span></p>
            </article>
            <article>
              <h2>电话沟通</h2>
              <p className="statNumber">{contactStats.byType['电话'] || 0}<span>次</span></p>
            </article>
            <article>
              <h2>取菜通知</h2>
              <p className="statNumber">{contactStats.byType['取菜通知'] || 0}<span>次</span></p>
            </article>
          </section>

          <section className="workspace">
            <form onSubmit={addContact} className="panel">
              <h2><Plus size={18} />新增联系记录</h2>
              <select value={contactForm.bedId} onChange={(e) => selectContactBed(e.target.value)}>
                <option value="">选择菜畦（仅显示已认养）</option>
                {contactBedOptions.map((bed) => <option key={bed.id} value={bed.id}>{bed.name} - {bed.adopter}</option>)}
              </select>
              <input placeholder="认养人" value={contactForm.adopter} onChange={(e) => setContactForm({ ...contactForm, adopter: e.target.value })} />
              <input placeholder="联系电话" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              <select value={contactForm.type} onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}>
                <option>电话</option>
                <option>微信</option>
                <option>现场沟通</option>
                <option>取菜通知</option>
              </select>
              <div className="grid2">
                <input type="date" value={contactForm.date} onChange={(e) => setContactForm({ ...contactForm, date: e.target.value })} />
                <input type="time" value={contactForm.time} onChange={(e) => setContactForm({ ...contactForm, time: e.target.value })} />
              </div>
              <textarea placeholder="沟通内容" rows="4" value={contactForm.content} onChange={(e) => setContactForm({ ...contactForm, content: e.target.value })} />
              <input placeholder="备注" value={contactForm.note} onChange={(e) => setContactForm({ ...contactForm, note: e.target.value })} />
              <button>保存记录</button>
            </form>

            <div className="panel wide">
              <div className="toolbar">
                <h2>联系记录</h2>
                <div className="toolbarActions">
                  <select className="filterSelect" value={contactTypeFilter} onChange={(e) => setContactTypeFilter(e.target.value)}>
                    <option value="">全部类型</option>
                    <option>电话</option>
                    <option>微信</option>
                    <option>现场沟通</option>
                    <option>取菜通知</option>
                  </select>
                  <label><Search size={16} /><input placeholder="搜索菜畦/认养人/内容" value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} /></label>
                </div>
              </div>
              <div className="contactList">
                {filteredContacts.length === 0 ? (
                  <p className="muted">暂无联系记录{contactQuery || contactTypeFilter ? '（请调整筛选条件）' : ''}</p>
                ) : (
                  filteredContacts.map((contact) => (
                    <article className="contactCard" key={contact.id}>
                      <div className="contactHeader">
                        <div className="contactMeta">
                          <span className={`contactTypeTag ${contact.type}`}>
                            {contact.type === '电话' && <Phone size={12} />}
                            {contact.type === '微信' && <MessageCircle size={12} />}
                            {contact.type === '现场沟通' && <MapPin size={12} />}
                            {contact.type === '取菜通知' && <Bell size={12} />}
                            {contact.type}
                          </span>
                          <strong className="contactBed">{contact.bedName}</strong>
                        </div>
                        <div className="contactActions">
                          <span className="contactDateTime">{contact.date} {contact.time}</span>
                          <button className="deleteBtn" onClick={() => deleteContact(contact.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="contactBody">
                        <p className="contactAdopter"><Users size={14} />{contact.adopter} <span>{contact.phone}</span></p>
                        <p className="contactContent">{contact.content}</p>
                        {contact.note && <p className="contactNote">📝 {contact.note}</p>}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'schedules' && (
        <>
          <section className="dashboard">
            <article>
              <h2>本周排班</h2>
              <p className="statNumber">{scheduleStats.total}<span>人次</span></p>
            </article>
            <article>
              <h2>浇水值班</h2>
              <p className="statNumber">{scheduleStats.byDuty['浇水'] || 0}<span>人次</span></p>
            </article>
            <article>
              <h2>巡检安排</h2>
              <p className="statNumber">{scheduleStats.byDuty['巡检'] || 0}<span>人次</span></p>
            </article>
          </section>

          <section className="workspace">
            <form onSubmit={addSchedule} className="panel">
              <h2><Plus size={18} />新增排班</h2>
              <input type="date" value={scheduleForm.date} onChange={(e) => updateScheduleDate(e.target.value)} />
              <input placeholder="星期（自动填充）" value={scheduleForm.weekday} disabled style={{ background: '#f4f7f1' }} />
              <div className="grid2">
                <input placeholder="志愿者姓名" value={scheduleForm.volunteer} onChange={(e) => setScheduleForm({ ...scheduleForm, volunteer: e.target.value })} />
                <input placeholder="联系电话" value={scheduleForm.phone} onChange={(e) => setScheduleForm({ ...scheduleForm, phone: e.target.value })} />
              </div>
              <select value={scheduleForm.duty} onChange={(e) => setScheduleForm({ ...scheduleForm, duty: e.target.value })}>
                <option>浇水</option>
                <option>补土</option>
                <option>巡检</option>
              </select>
              <select value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}>
                <option>08:00-10:00</option>
                <option>09:00-11:00</option>
                <option>10:00-12:00</option>
                <option>14:00-16:00</option>
                <option>16:00-18:00</option>
                <option>17:00-19:00</option>
              </select>
              <input placeholder="工作备注" value={scheduleForm.note} onChange={(e) => setScheduleForm({ ...scheduleForm, note: e.target.value })} />
              <button>保存排班</button>
            </form>

            <div className="panel wide">
              <div className="toolbar">
                <h2>排班列表</h2>
                <label><CalendarDays size={16} /><input type="date" value={scheduleDateFilter} onChange={(e) => setScheduleDateFilter(e.target.value)} /></label>
                {scheduleDateFilter && (
                  <button className="clearBtn" onClick={() => setScheduleDateFilter('')}>清除筛选</button>
                )}
              </div>
              <div className="scheduleList">
                {filteredSchedules.length === 0 ? (
                  <p className="muted">暂无排班记录{scheduleDateFilter ? '（请调整筛选条件）' : ''}</p>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <article className="scheduleCard" key={schedule.id}>
                      <div className="scheduleHeader">
                        <div className="scheduleDate">
                          <strong>{schedule.date}</strong>
                          <span className="weekdayTag">{schedule.weekday}</span>
                        </div>
                        <button className="deleteBtn" onClick={() => deleteSchedule(schedule.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="scheduleBody">
                        <span className={`dutyTag ${schedule.duty}`}>{schedule.duty}</span>
                        <p className="row"><Users size={15} />{schedule.volunteer}<span>{schedule.phone}</span></p>
                        <p className="row"><Clock size={15} />{schedule.time}</p>
                        {schedule.note && <p className="scheduleNote">📝 {schedule.note}</p>}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'inventory' && (
        <>
          <section className="dashboard">
            <article>
              <h2>物资种类</h2>
              <p className="statNumber">{inventoryStats.materialCount}<span>项</span></p>
            </article>
            <article>
              <h2>低库存预警</h2>
              <p className="statNumber invAlert">{inventoryStats.lowStockCount}<span>项</span></p>
            </article>
            <article>
              <h2>本月入库</h2>
              <p className="statNumber">{inventoryStats.monthlyInbound}<span>次</span></p>
            </article>
          </section>

          {lowStockItems.length > 0 && (
            <section className="inventoryWarning">
              <h2><TriangleAlert size={18} />低库存预警</h2>
              <div className="warningCards">
                {lowStockItems.map((item) => (
                  <div className="warningCard" key={item.id}>
                    <div className="warningInfo">
                      <strong>{item.name}</strong>
                      <span className={`categoryTag ${item.category}`}>{item.category}</span>
                    </div>
                    <div className="warningStock">
                      <span className="warningCurrent">{item.stock} {item.unit}</span>
                      <span className="warningThreshold">预警线：{item.lowStockThreshold} {item.unit}</span>
                      <button type="button" className="quickInboundBtn" onClick={() => quickInbound(item.id)}>
                        <ArrowDownCircle size={12} />快速补货
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="workspace">
            <div className="panel inventoryForms">
              <form onSubmit={addMaterial} className="inventorySubForm">
                <h2><Plus size={18} />新增物资</h2>
                <input placeholder="物资名称" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
                <select value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}>
                  <option>种子</option>
                  <option>营养土</option>
                  <option>肥料</option>
                  <option>工具</option>
                  <option>耗材</option>
                </select>
                <div className="grid2">
                  <input placeholder="单位（包/袋/瓶）" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
                  <input type="number" min="0" placeholder="低库存预警线" value={materialForm.lowStockThreshold} onChange={(e) => setMaterialForm({ ...materialForm, lowStockThreshold: Number(e.target.value) })} />
                </div>
                <input placeholder="备注" value={materialForm.note} onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })} />
                <button type="submit">保存物资</button>
              </form>

              <form onSubmit={addTransaction} className="inventorySubForm">
                <h2><Plus size={18} />新增流水</h2>
                <div className="transactionTypeToggle">
                  <button type="button" className={transactionForm.type === 'inbound' ? 'toggleBtn active inbound' : 'toggleBtn'} onClick={() => setTransactionForm({ ...transactionForm, type: 'inbound', relatedType: '', relatedId: '', relatedName: '' })}>
                    <ArrowDownCircle size={16} />入库
                  </button>
                  <button type="button" className={transactionForm.type === 'consume' ? 'toggleBtn active consume' : 'toggleBtn'} onClick={() => setTransactionForm({ ...transactionForm, type: 'consume' })}>
                    <ArrowUpCircle size={16} />消耗
                  </button>
                </div>
                <select value={transactionForm.materialId} onChange={(e) => setTransactionForm({ ...transactionForm, materialId: e.target.value })}>
                  <option value="">选择物资</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.category}）</option>)}
                </select>
                <div className="grid2">
                  <input type="number" min="1" placeholder="数量" value={transactionForm.quantity} onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })} />
                  <input type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} />
                </div>
                {transactionForm.type === 'consume' && (
                  <>
                    <select value={transactionForm.relatedType} onChange={(e) => {
                      const type = e.target.value;
                      setTransactionForm({ ...transactionForm, relatedType: type, relatedId: '', relatedName: '' });
                    }}>
                      <option value="">关联类型（可选）</option>
                      <option value="task">维护任务</option>
                      <option value="harvest">采摘记录</option>
                    </select>
                    {transactionForm.relatedType && (
                      <select value={transactionForm.relatedId} onChange={(e) => selectTransactionRelated(transactionForm.relatedType, e.target.value)}>
                        <option value="">选择{transactionForm.relatedType === 'task' ? '维护任务' : '采摘记录'}</option>
                        {(transactionRelatedOptions[transactionForm.relatedType] || []).map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
                <input placeholder="备注" value={transactionForm.note} onChange={(e) => setTransactionForm({ ...transactionForm, note: e.target.value })} />
                <button type="submit">保存流水</button>
              </form>
            </div>

            <div className="panel wide">
              <div className="toolbar">
                <h2>物资库存</h2>
                <div className="toolbarActions">
                  <select className="filterSelect" value={inventoryCategoryFilter} onChange={(e) => setInventoryCategoryFilter(e.target.value)}>
                    <option value="">全部类别</option>
                    <option>种子</option>
                    <option>营养土</option>
                    <option>肥料</option>
                    <option>工具</option>
                    <option>耗材</option>
                  </select>
                  <label><Search size={16} /><input placeholder="搜索物资名称/备注" value={inventoryQuery} onChange={(e) => setInventoryQuery(e.target.value)} /></label>
                  {inventoryCategoryFilter && (
                    <button className="clearBtn" onClick={() => setInventoryCategoryFilter('')}>清除筛选</button>
                  )}
                </div>
              </div>
              <div className="inventoryList">
                {filteredStockByMaterial.length === 0 ? (
                  <div className="emptyState">
                    <Archive size={36} />
                    <p>暂无物资{inventoryQuery || inventoryCategoryFilter ? '（请调整筛选条件）' : ''}</p>
                    <p className="muted">请先添加物资目录</p>
                  </div>
                ) : (
                  filteredStockByMaterial.map((item) => (
                    <article className={`inventoryCard ${item.stock <= item.lowStockThreshold ? 'lowStock' : ''}`} key={item.id}>
                      <div className="inventoryHeader">
                        <div className="inventoryInfo">
                          <strong>{item.name}</strong>
                          <span className={`categoryTag ${item.category}`}>{item.category}</span>
                        </div>
                        <div className="inventoryActions">
                          <button type="button" className="miniBtn" onClick={() => quickInbound(item.id)} title="快速入库">
                            <ArrowDownCircle size={12} />入库
                          </button>
                          <button type="button" className="editBtn" onClick={() => startEditMaterial(item.id)} title="编辑物资">
                            编辑
                          </button>
                          <button className="deleteBtn" onClick={() => deleteMaterial(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editingMaterialId === item.id ? (
                        <form onSubmit={saveEditMaterial} className="editMaterialForm">
                          <input placeholder="物资名称" value={editingMaterialForm.name} onChange={(e) => setEditingMaterialForm({ ...editingMaterialForm, name: e.target.value })} />
                          <select value={editingMaterialForm.category} onChange={(e) => setEditingMaterialForm({ ...editingMaterialForm, category: e.target.value })}>
                            <option>种子</option>
                            <option>营养土</option>
                            <option>肥料</option>
                            <option>工具</option>
                            <option>耗材</option>
                          </select>
                          <div className="grid2">
                            <input placeholder="单位" value={editingMaterialForm.unit} onChange={(e) => setEditingMaterialForm({ ...editingMaterialForm, unit: e.target.value })} />
                            <input type="number" min="0" placeholder="预警线" value={editingMaterialForm.lowStockThreshold} onChange={(e) => setEditingMaterialForm({ ...editingMaterialForm, lowStockThreshold: Number(e.target.value) })} />
                          </div>
                          <input placeholder="备注" value={editingMaterialForm.note} onChange={(e) => setEditingMaterialForm({ ...editingMaterialForm, note: e.target.value })} />
                          <div className="editFormActions">
                            <button type="submit">保存修改</button>
                            <button type="button" className="clearBtn" onClick={cancelEditMaterial}>取消</button>
                          </div>
                        </form>
                      ) : (
                        <div className="inventoryBody">
                          <div className="stockRow">
                            <div className="stockItem">
                              <span className="stockLabel">当前库存</span>
                              <span className={`stockValue ${item.stock <= item.lowStockThreshold ? 'lowStockValue' : ''}`}>{item.stock} <small>{item.unit}</small></span>
                            </div>
                            <div className="stockItem">
                              <span className="stockLabel">预警线</span>
                              <span className="stockValue threshold">{item.lowStockThreshold} <small>{item.unit}</small></span>
                            </div>
                            <div className="stockItem">
                              <span className="stockLabel">累计入库</span>
                              <span className="stockValue inbound">{item.inboundTotal} <small>{item.unit}</small></span>
                            </div>
                            <div className="stockItem">
                              <span className="stockLabel">累计消耗</span>
                              <span className="stockValue consume">{item.consumeTotal} <small>{item.unit}</small></span>
                            </div>
                          </div>
                          <div className="stockBarWrap">
                            <div className="stockBar" style={{ width: `${Math.min(100, (item.stock / Math.max(item.lowStockThreshold * 2, 1)) * 100)}%` }} />
                          </div>
                          {item.note && <p className="inventoryNote">📝 {item.note}</p>}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="workspace bottom">
            <div className="panel wide">
              <div className="toolbar">
                <h2><History size={18} />流水记录</h2>
                <div className="toolbarActions">
                  <select className="filterSelect" value={transactionTypeFilter} onChange={(e) => setTransactionTypeFilter(e.target.value)}>
                    <option value="">全部类型</option>
                    <option value="inbound">入库</option>
                    <option value="consume">消耗</option>
                  </select>
                  <select className="filterSelect" value={transactionMaterialFilter} onChange={(e) => setTransactionMaterialFilter(e.target.value)}>
                    <option value="">全部物资</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.category}）</option>)}
                  </select>
                  {(transactionTypeFilter || transactionMaterialFilter) && (
                    <button className="clearBtn" onClick={() => { setTransactionTypeFilter(''); setTransactionMaterialFilter(''); }}>清除筛选</button>
                  )}
                </div>
              </div>
              <div className="transactionList">
                {filteredTransactions.length === 0 ? (
                  <div className="emptyState">
                    <History size={36} />
                    <p>暂无流水记录{transactionTypeFilter ? '（请调整筛选条件）' : ''}</p>
                    <p className="muted">入库或消耗后将在此展示</p>
                  </div>
                ) : (
                  filteredTransactions.map((t) => {
                    const info = getMaterialInfo(t.materialId);
                    const displayName = info ? info.name : t.materialName;
                    const displayCategory = info ? info.category : t.category;
                    const displayUnit = info ? info.unit : t.unit;
                    return (
                    <article className="transactionCard" key={t.id}>
                      <div className="transactionHeader">
                        <div className="transactionMeta">
                          <span className={`transactionTypeTag ${t.type}`}>
                            {t.type === 'inbound' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                            {t.type === 'inbound' ? '入库' : '消耗'}
                          </span>
                          <strong className="transactionMaterial">{displayName}</strong>
                          <span className={`categoryTag ${displayCategory}`}>{displayCategory}</span>
                        </div>
                        <div className="transactionActions">
                          <span className="transactionDate">{t.date}</span>
                          <button className="deleteBtn" onClick={() => deleteTransaction(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="transactionBody">
                        <div className="transactionDetail">
                          <span className={`transactionQty ${t.type}`}>
                            {t.type === 'inbound' ? '+' : '-'}{t.quantity} {displayUnit}
                          </span>
                          {t.relatedType && (
                            <span className="transactionRelated">
                              {t.relatedType === 'task' ? '🔧' : '🌾'}{t.relatedName}
                            </span>
                          )}
                        </div>
                        {t.note && <p className="transactionNote">📝 {t.note}</p>}
                      </div>
                    </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'fees' && (
        <>
          <section className="dashboard">
            <article>
              <h2>即将到期</h2>
              <p className="statNumber feeExpiringStat">{feeStats.expiringCount}<span>笔</span></p>
            </article>
            <article>
              <h2>欠费</h2>
              <p className="statNumber feeOverdueStat">{feeStats.overdueCount}<span>笔</span></p>
            </article>
            <article>
              <h2>待缴费</h2>
              <p className="statNumber">{feeStats.pendingCount}<span>笔</span></p>
            </article>
          </section>

          <section className="workspace">
            <form onSubmit={addFee} className="panel">
              <h2><Plus size={18} />新增认养费用</h2>
              <select value={feeForm.bedId} onChange={(e) => selectFeeBed(e.target.value)}>
                <option value="">选择菜畦（仅已认养）</option>
                {feeBedOptions.map((bed) => <option key={bed.id} value={bed.id}>{bed.name} - {bed.adopter}</option>)}
              </select>
              <input placeholder="认养人" value={feeForm.adopter} onChange={(e) => setFeeForm({ ...feeForm, adopter: e.target.value })} />
              <div className="grid2">
                <div>
                  <label style={{ fontSize: '13px', color: '#71806a', marginBottom: '4px', display: 'block' }}>认养开始</label>
                  <input type="date" value={feeForm.startDate} onChange={(e) => setFeeForm({ ...feeForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#71806a', marginBottom: '4px', display: 'block' }}>认养到期</label>
                  <input type="date" value={feeForm.endDate} onChange={(e) => setFeeForm({ ...feeForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid2">
                <input type="number" min="0" placeholder="认养金额（元）" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
                <select value={feeForm.paymentStatus} onChange={(e) => setFeeForm({ ...feeForm, paymentStatus: e.target.value })}>
                  <option>待缴费</option>
                  <option>已缴费</option>
                  <option>欠费</option>
                </select>
              </div>
              <textarea placeholder="捐赠备注（如额外捐赠用途等）" rows="3" value={feeForm.donationNote} onChange={(e) => setFeeForm({ ...feeForm, donationNote: e.target.value })} />
              <button type="submit">保存费用</button>
            </form>

            <div className="panel wide">
              <div className="toolbar">
                <h2>认养费用记录</h2>
                <div className="toolbarActions">
                  <select className="filterSelect" value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)}>
                    <option value="">全部状态</option>
                    <option>已缴费</option>
                    <option>待缴费</option>
                    <option>欠费</option>
                  </select>
                  <label><Search size={16} /><input placeholder="搜索菜畦/认养人/备注" value={feeQuery} onChange={(e) => setFeeQuery(e.target.value)} /></label>
                  {feeStatusFilter && (
                    <button className="clearBtn" onClick={() => setFeeStatusFilter('')}>清除筛选</button>
                  )}
                </div>
              </div>

              {feeStats.overdueAmount > 0 && (
                <div className="feeSummaryBar">
                  <span><CircleDollarSign size={16} />应收总额：<strong>¥{feeStats.totalAmount}</strong></span>
                  <span><CheckCircle2 size={16} />已收：<strong className="feePaidColor">¥{feeStats.paidAmount}</strong></span>
                  <span><XCircle size={16} />欠费：<strong className="feeOverdueColor">¥{feeStats.overdueAmount}</strong></span>
                </div>
              )}

              <div className="feeList">
                {filteredFees.length === 0 ? (
                  <div className="emptyState">
                    <Wallet size={36} />
                    <p>暂无费用记录{feeQuery || feeStatusFilter ? '（请调整筛选条件）' : ''}</p>
                    <p className="muted">空闲菜畦不计入费用管理</p>
                  </div>
                ) : (
                  filteredFees.map((fee) => {
                    const daysLeft = getDaysUntilExpiry(fee.endDate);
                    const isExpiring = daysLeft.includes('还剩') && parseInt(daysLeft.replace(/\D/g, '')) <= 7;
                    const isOverdue = fee.paymentStatus === '欠费';
                    const isExpired = daysLeft.includes('已过期');
                    return (
                      <article className={`feeCard ${isOverdue ? 'feeOverdue' : ''} ${isExpiring ? 'feeExpiring' : ''}`} key={fee.id}>
                        <div className="feeHeader">
                          <div className="feeInfo">
                            <strong>{fee.bedName}</strong>
                            <span className="feeAdopter"><Users size={14} />{fee.adopter}</span>
                          </div>
                          <div className="feeActions">
                            <span className={`feeStatusTag ${fee.paymentStatus}`}>
                              {fee.paymentStatus === '已缴费' && <CheckCircle2 size={14} />}
                              {fee.paymentStatus === '待缴费' && <Timer size={14} />}
                              {fee.paymentStatus === '欠费' && <XCircle size={14} />}
                              {fee.paymentStatus}
                            </span>
                            {fee.paymentStatus !== '已缴费' && (
                              <button type="button" className="miniBtn feeMarkPaidBtn" onClick={() => updateFeeStatus(fee.id, '已缴费')}>
                                <CheckCircle2 size={12} />确认缴费
                              </button>
                            )}
                            <button className="deleteBtn" onClick={() => deleteFee(fee.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="feeBody">
                          <div className="feeDetailRow">
                            <div className="feeDetailItem">
                              <span className="feeDetailLabel">认养周期</span>
                              <span className="feeDetailValue">{fee.startDate} ~ {fee.endDate}</span>
                            </div>
                            <div className="feeDetailItem">
                              <span className="feeDetailLabel">到期倒计时</span>
                              <span className={`feeDetailValue ${(isExpiring || isExpired) ? 'feeExpiringText' : ''}`}>{daysLeft}</span>
                            </div>
                            <div className="feeDetailItem">
                              <span className="feeDetailLabel">认养金额</span>
                              <span className="feeDetailValue feeAmountValue">¥{fee.amount}</span>
                            </div>
                          </div>
                          {fee.donationNote && (
                            <div className="feeDonation">
                              <Heart size={14} />
                              <span>{fee.donationNote}</span>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'environment' && (
        <>
          <section className="dashboard">
            <article className="envSensorCard">
              <div className="envSensorHeader">
                <div className="envSensorIcon temp">
                  <Thermometer size={24} />
                </div>
                <div className="envSensorInfo">
                  <h2>温度</h2>
                  <div className="envSensorValue">
                    {currentEnv?.temperature}<span className="envUnit">°C</span>
                  </div>
                </div>
                <div className={`envTrend ${getEnvTrend('temperature')}`}>
                  {getEnvTrend('temperature') === 'up' && <TrendingUp size={16} />}
                  {getEnvTrend('temperature') === 'down' && <TrendingDown size={16} />}
                  {getEnvTrend('temperature') === 'stable' && <span className="stableDot">•</span>}
                </div>
              </div>
              <div className="envSensorStatus">
                <span className={`statusTag ${isEnvNormal('temperature') ? 'normal' : 'warning'}`}>
                  {isEnvNormal('temperature') ? '正常' : '异常'}
                </span>
                <span className="envRange">范围：{envThresholds.temperature.min}~{envThresholds.temperature.max}°C</span>
              </div>
            </article>

            <article className="envSensorCard">
              <div className="envSensorHeader">
                <div className="envSensorIcon humidity">
                  <Droplets size={24} />
                </div>
                <div className="envSensorInfo">
                  <h2>湿度</h2>
                  <div className="envSensorValue">
                    {currentEnv?.humidity}<span className="envUnit">%</span>
                  </div>
                </div>
                <div className={`envTrend ${getEnvTrend('humidity')}`}>
                  {getEnvTrend('humidity') === 'up' && <TrendingUp size={16} />}
                  {getEnvTrend('humidity') === 'down' && <TrendingDown size={16} />}
                  {getEnvTrend('humidity') === 'stable' && <span className="stableDot">•</span>}
                </div>
              </div>
              <div className="envSensorStatus">
                <span className={`statusTag ${isEnvNormal('humidity') ? 'normal' : 'warning'}`}>
                  {isEnvNormal('humidity') ? '正常' : '异常'}
                </span>
                <span className="envRange">范围：{envThresholds.humidity.min}~{envThresholds.humidity.max}%</span>
              </div>
            </article>

            <article className="envSensorCard">
              <div className="envSensorHeader">
                <div className="envSensorIcon light">
                  <Sun size={24} />
                </div>
                <div className="envSensorInfo">
                  <h2>光照强度</h2>
                  <div className="envSensorValue">
                    {currentEnv?.light}<span className="envUnit">lux</span>
                  </div>
                </div>
                <div className={`envTrend ${getEnvTrend('light')}`}>
                  {getEnvTrend('light') === 'up' && <TrendingUp size={16} />}
                  {getEnvTrend('light') === 'down' && <TrendingDown size={16} />}
                  {getEnvTrend('light') === 'stable' && <span className="stableDot">•</span>}
                </div>
              </div>
              <div className="envSensorStatus">
                <span className={`statusTag ${isEnvNormal('light') ? 'normal' : 'warning'}`}>
                  {isEnvNormal('light') ? '正常' : '异常'}
                </span>
                <span className="envRange">范围：{envThresholds.light.min}~{envThresholds.light.max} lux</span>
              </div>
            </article>
          </section>

          <section className="envWaterSection">
            <article className="envWaterCard">
              <div className="envWaterHeader">
                <div className="envSensorIcon water">
                  <Droplets size={28} />
                </div>
                <div className="envWaterInfo">
                  <h2>水箱余量</h2>
                  <div className="envWaterValue">
                    {currentEnv?.water}<span className="envUnit">%</span>
                  </div>
                </div>
                <div className={`envTrend ${getEnvTrend('water')}`}>
                  {getEnvTrend('water') === 'up' && <TrendingUp size={18} />}
                  {getEnvTrend('water') === 'down' && <TrendingDown size={18} />}
                  {getEnvTrend('water') === 'stable' && <span className="stableDot">•</span>}
                </div>
              </div>
              <div className="envWaterBarWrap">
                <div className={`envWaterBar ${isEnvNormal('water') ? '' : 'low'}`} style={{ width: `${currentEnv?.water || 0}%` }} />
              </div>
              <div className="envWaterStatus">
                <span className={`statusTag ${isEnvNormal('water') ? 'normal' : 'critical'}`}>
                  {isEnvNormal('water') ? '充足' : '水量不足'}
                </span>
                <span className="envRange">警戒线：{envThresholds.water.min}%</span>
              </div>
            </article>
          </section>

          <section className="workspace">
            <div className="panel">
              <div className="toolbar">
                <h2><Settings size={18} />阈值配置</h2>
                <button type="button" className="miniBtn" onClick={openThresholdConfig}>
                  <Settings size={12} />编辑阈值
                </button>
              </div>
              <div className="thresholdList">
                <div className="thresholdItem">
                  <div className="thresholdIcon temp"><Thermometer size={16} /></div>
                  <div className="thresholdInfo">
                    <strong>温度</strong>
                    <span>{envThresholds.temperature.min} ~ {envThresholds.temperature.max} °C</span>
                  </div>
                </div>
                <div className="thresholdItem">
                  <div className="thresholdIcon humidity"><Droplets size={16} /></div>
                  <div className="thresholdInfo">
                    <strong>湿度</strong>
                    <span>{envThresholds.humidity.min} ~ {envThresholds.humidity.max} %</span>
                  </div>
                </div>
                <div className="thresholdItem">
                  <div className="thresholdIcon light"><Sun size={16} /></div>
                  <div className="thresholdInfo">
                    <strong>光照强度</strong>
                    <span>{envThresholds.light.min} ~ {envThresholds.light.max} lux</span>
                  </div>
                </div>
                <div className="thresholdItem">
                  <div className="thresholdIcon water"><Gauge size={16} /></div>
                  <div className="thresholdInfo">
                    <strong>水箱余量</strong>
                    <span>{envThresholds.water.min} ~ {envThresholds.water.max} %</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel wide">
              <div className="toolbar">
                <h2>近7天趋势</h2>
              </div>
              <div className="trendCharts">
                <div className="trendChart">
                  <div className="trendChartHeader">
                    <Thermometer size={16} />
                    <span>温度趋势 (°C)</span>
                  </div>
                  <div className="chartBars">
                    {getChartData('temperature').map((d, i) => (
                      <div className="chartBarWrap" key={i}>
                        <div className="chartBar temp" style={{ height: `${d.percent}%` }} title={`${d.date}: ${d.value}°C`}>
                          <span className="chartBarValue">{d.value}</span>
                        </div>
                        <span className="chartBarLabel">{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trendChart">
                  <div className="trendChartHeader">
                    <Droplets size={16} />
                    <span>湿度趋势 (%)</span>
                  </div>
                  <div className="chartBars">
                    {getChartData('humidity').map((d, i) => (
                      <div className="chartBarWrap" key={i}>
                        <div className="chartBar humidity" style={{ height: `${d.percent}%` }} title={`${d.date}: ${d.value}%`}>
                          <span className="chartBarValue">{d.value}</span>
                        </div>
                        <span className="chartBarLabel">{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trendChart">
                  <div className="trendChartHeader">
                    <Sun size={16} />
                    <span>光照趋势 (klux)</span>
                  </div>
                  <div className="chartBars">
                    {getChartData('light').map((d, i) => (
                      <div className="chartBarWrap" key={i}>
                        <div className="chartBar light" style={{ height: `${d.percent}%` }} title={`${d.date}: ${d.value} lux`}>
                          <span className="chartBarValue">{Math.round(d.value / 1000)}k</span>
                        </div>
                        <span className="chartBarLabel">{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trendChart">
                  <div className="trendChartHeader">
                    <Gauge size={16} />
                    <span>水箱余量趋势 (%)</span>
                  </div>
                  <div className="chartBars">
                    {getChartData('water').map((d, i) => (
                      <div className="chartBarWrap" key={i}>
                        <div className={`chartBar water ${d.value < envThresholds.water.min ? 'low' : ''}`} style={{ height: `${d.percent}%` }} title={`${d.date}: ${d.value}%`}>
                          <span className="chartBarValue">{d.value}</span>
                        </div>
                        <span className="chartBarLabel">{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {envAlerts.length > 0 && (
            <section className="envAlertSection">
              <h2><TriangleAlert size={18} />环境异常提醒</h2>
              <div className="envAlertCards">
                {envAlerts.map((alert) => (
                  <div className={`envAlertCard ${alert.level}`} key={alert.id}>
                    <div className="envAlertIcon">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="envAlertContent">
                      <strong>{alert.sensorName}{alert.level === 'critical' ? '严重' : ''}异常</strong>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showThresholdConfig && (
        <div className="modalOverlay" onClick={() => setShowThresholdConfig(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2><Settings size={18} />编辑异常阈值</h2>
              <button className="closeBtn" onClick={() => setShowThresholdConfig(false)}>×</button>
            </div>
            <form onSubmit={saveThresholds} className="modalBody">
              <div className="thresholdFormGroup">
                <label><Thermometer size={16} /> 温度阈值 (°C)</label>
                <div className="grid2">
                  <div>
                    <span className="fieldLabel">最低值</span>
                    <input type="number" value={thresholdForm.temperature.min} onChange={(e) => updateThreshold('temperature', 'min', e.target.value)} />
                  </div>
                  <div>
                    <span className="fieldLabel">最高值</span>
                    <input type="number" value={thresholdForm.temperature.max} onChange={(e) => updateThreshold('temperature', 'max', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="thresholdFormGroup">
                <label><Droplets size={16} /> 湿度阈值 (%)</label>
                <div className="grid2">
                  <div>
                    <span className="fieldLabel">最低值</span>
                    <input type="number" value={thresholdForm.humidity.min} onChange={(e) => updateThreshold('humidity', 'min', e.target.value)} />
                  </div>
                  <div>
                    <span className="fieldLabel">最高值</span>
                    <input type="number" value={thresholdForm.humidity.max} onChange={(e) => updateThreshold('humidity', 'max', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="thresholdFormGroup">
                <label><Sun size={16} /> 光照阈值 (lux)</label>
                <div className="grid2">
                  <div>
                    <span className="fieldLabel">最低值</span>
                    <input type="number" value={thresholdForm.light.min} onChange={(e) => updateThreshold('light', 'min', e.target.value)} />
                  </div>
                  <div>
                    <span className="fieldLabel">最高值</span>
                    <input type="number" value={thresholdForm.light.max} onChange={(e) => updateThreshold('light', 'max', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="thresholdFormGroup">
                <label><Gauge size={16} /> 水箱余量阈值 (%)</label>
                <div className="grid2">
                  <div>
                    <span className="fieldLabel">最低值</span>
                    <input type="number" value={thresholdForm.water.min} onChange={(e) => updateThreshold('water', 'min', e.target.value)} />
                  </div>
                  <div>
                    <span className="fieldLabel">最高值</span>
                    <input type="number" value={thresholdForm.water.max} onChange={(e) => updateThreshold('water', 'max', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="modalActions">
                <button type="button" className="clearBtn" onClick={() => setShowThresholdConfig(false)}>取消</button>
                <button type="submit">保存阈值</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDistributionModal && currentDistributingHarvest && (
        <div className="modalOverlay" onClick={closeDistributionModal}>
          <div className="modalContent distributionModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2><Wheat size={18} />采摘分配 · {currentDistributingHarvest.crop}</h2>
              <button className="closeBtn" onClick={closeDistributionModal}>×</button>
            </div>
            <form onSubmit={saveDistribution} className="modalBody">
              <div className="distributionHarvestInfo">
                <div className="distributionInfoItem">
                  <span className="distributionInfoLabel">菜畦</span>
                  <span className="distributionInfoValue">{currentDistributingHarvest.bed}</span>
                </div>
                <div className="distributionInfoItem">
                  <span className="distributionInfoLabel">采摘日期</span>
                  <span className="distributionInfoValue">{currentDistributingHarvest.date}</span>
                </div>
                <div className="distributionInfoItem">
                  <span className="distributionInfoLabel">采摘重量</span>
                  <span className="distributionInfoValue highlight">{currentDistributingHarvest.weight}</span>
                </div>
              </div>

              <div className="distributionProgressWrap">
                <div className="distributionProgressHeader">
                  <span>分配进度</span>
                  <span className={`distributionProgressText ${distributionFormTotal > distributionHarvestTotal + 0.001 ? 'over' : distributionFormTotal >= distributionHarvestTotal - 0.001 ? 'done' : ''}`}>
                    {formatWeight(distributionFormTotal)} / {currentDistributingHarvest.weight}
                    （{distributionHarvestTotal > 0 ? Math.round((distributionFormTotal / distributionHarvestTotal) * 100) : 0}%）
                  </span>
                </div>
                <div className="distributionProgressBarWrap">
                  <div
                    className={`distributionProgressBar ${distributionFormTotal > distributionHarvestTotal + 0.001 ? 'over' : ''}`}
                    style={{ width: `${distributionHarvestTotal > 0 ? Math.min(100, (distributionFormTotal / distributionHarvestTotal) * 100) : 0}%` }}
                  />
                </div>
                {distributionHarvestTotal > 0 && distributionFormTotal <= distributionHarvestTotal + 0.001 && (
                  <p className="distributionRemaining">
                    剩余可分配：<strong>{formatWeight(Math.max(0, distributionHarvestTotal - distributionFormTotal))}</strong>
                  </p>
                )}
              </div>

              <div className="distributionFields">
                <div className="distributionFieldGroup selfPickup">
                  <label className="distributionFieldLabel"><Users size={16} /> 认养人自取 (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={distributionForm.selfPickup}
                    onChange={(e) => {
                      setDistributionForm({ ...distributionForm, selfPickup: e.target.value });
                      setDistributionError('');
                    }}
                  />
                  {distributionForm.selfPickup && Number(distributionForm.selfPickup) > 0 && (
                    <span className="distributionFieldHint">约 {distributionHarvestTotal > 0 ? Math.round((Number(distributionForm.selfPickup) / distributionHarvestTotal) * 100) : 0}%</span>
                  )}
                </div>

                <div className="distributionFieldGroup communityShare">
                  <label className="distributionFieldLabel"><Heart size={16} /> 社区分享 (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={distributionForm.communityShare}
                    onChange={(e) => {
                      setDistributionForm({ ...distributionForm, communityShare: e.target.value });
                      setDistributionError('');
                    }}
                  />
                  {distributionForm.communityShare && Number(distributionForm.communityShare) > 0 && (
                    <span className="distributionFieldHint">约 {distributionHarvestTotal > 0 ? Math.round((Number(distributionForm.communityShare) / distributionHarvestTotal) * 100) : 0}%</span>
                  )}
                </div>

                <div className="distributionFieldGroup volunteerSample">
                  <label className="distributionFieldLabel"><Sprout size={16} /> 志愿者留样 (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={distributionForm.volunteerSample}
                    onChange={(e) => {
                      setDistributionForm({ ...distributionForm, volunteerSample: e.target.value });
                      setDistributionError('');
                    }}
                  />
                  {distributionForm.volunteerSample && Number(distributionForm.volunteerSample) > 0 && (
                    <span className="distributionFieldHint">约 {distributionHarvestTotal > 0 ? Math.round((Number(distributionForm.volunteerSample) / distributionHarvestTotal) * 100) : 0}%</span>
                  )}
                </div>

                <div className="distributionFieldGroup loss">
                  <label className="distributionFieldLabel"><XCircle size={16} /> 损耗 (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={distributionForm.loss}
                    onChange={(e) => {
                      setDistributionForm({ ...distributionForm, loss: e.target.value });
                      setDistributionError('');
                    }}
                  />
                  {distributionForm.loss && Number(distributionForm.loss) > 0 && (
                    <span className="distributionFieldHint">约 {distributionHarvestTotal > 0 ? Math.round((Number(distributionForm.loss) / distributionHarvestTotal) * 100) : 0}%</span>
                  )}
                </div>
              </div>

              <textarea
                placeholder="分配备注（认养人自取时间、分享对象、损耗原因等）"
                rows="3"
                value={distributionForm.note}
                onChange={(e) => setDistributionForm({ ...distributionForm, note: e.target.value })}
              />

              {distributionError && (
                <div className="distributionError">
                  <AlertTriangle size={16} />
                  <span>{distributionError}</span>
                </div>
              )}

              <div className="modalActions">
                <button type="button" className="clearBtn" onClick={closeDistributionModal}>取消</button>
                <button
                  type="submit"
                  disabled={distributionFormTotal > distributionHarvestTotal + 0.001}
                  style={distributionFormTotal > distributionHarvestTotal + 0.001 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <CheckCircle2 size={14} /> 保存分配
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBedDetail && selectedBed && (
        <div className="modalOverlay" onClick={closeBedDetail}>
          <div className="modalContent bedDetailModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2><Info size={18} />菜畦详情</h2>
              <button className="closeBtn" onClick={closeBedDetail}>×</button>
            </div>
            <div className="modalBody">
              <div className="bedDetailHeader">
                <div className="bedDetailTitle">
                  <h3>{selectedBed.name}</h3>
                  <span className={`stageTag ${selectedBed.status === '认养中' ? '生长期' : selectedBed.status === '空闲' ? '播种期' : '成熟期'}`}>
                    {selectedBed.status}
                  </span>
                </div>
                <p className="bedDetailCrop">{selectedBed.crop}</p>
              </div>

              <div className="bedDetailGrid">
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><MapPin size={14} /> 位置</span>
                  <span className="bedDetailValue">{selectedBed.zone}区 第{selectedBed.row + 1}行 第{selectedBed.col + 1}列</span>
                </div>
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><Leaf size={14} /> 面积</span>
                  <span className="bedDetailValue">{selectedBed.area}</span>
                </div>
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><Users size={14} /> 认养人</span>
                  <span className="bedDetailValue">{selectedBed.adopter || '待认养'}</span>
                </div>
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><Phone size={14} /> 联系电话</span>
                  <span className="bedDetailValue">{selectedBed.phone || '-'}</span>
                </div>
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><Droplets size={14} /> 下次浇水</span>
                  <span className={`bedDetailValue water-${getWaterStatus(selectedBed.nextWater).status}`}>
                    {selectedBed.nextWater} ({getWaterStatus(selectedBed.nextWater).label})
                  </span>
                </div>
                <div className="bedDetailItem">
                  <span className="bedDetailLabel"><CalendarDays size={14} /> 当前位置</span>
                  <span className="bedDetailValue">{selectedBed.zone}{selectedBed.row * 6 + selectedBed.col + 1}</span>
                </div>
              </div>

              {selectedBed.warning && (
                <div className="bedDetailWarning">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>异常提醒</strong>
                    <p>{selectedBed.warning}</p>
                  </div>
                </div>
              )}

              {getLastContactByBed[selectedBed.id] && (
                <div className="bedDetailSection">
                  <h4><MessageCircle size={16} /> 最近联系</h4>
                  <div className="contactCard" style={{ margin: 0 }}>
                    <div className="contactHeader">
                      <div className="contactMeta">
                        <span className={`contactTypeTag ${getLastContactByBed[selectedBed.id].type}`}>
                          {getLastContactByBed[selectedBed.id].type === '电话' && <Phone size={12} />}
                          {getLastContactByBed[selectedBed.id].type === '微信' && <MessageCircle size={12} />}
                          {getLastContactByBed[selectedBed.id].type === '现场沟通' && <MapPin size={12} />}
                          {getLastContactByBed[selectedBed.id].type === '取菜通知' && <Bell size={12} />}
                          {getLastContactByBed[selectedBed.id].type}
                        </span>
                      </div>
                      <span className="contactDateTime">{getLastContactByBed[selectedBed.id].date} {getLastContactByBed[selectedBed.id].time}</span>
                    </div>
                    <div className="contactBody">
                      <p className="contactContent">{getLastContactByBed[selectedBed.id].content}</p>
                      {getLastContactByBed[selectedBed.id].note && <p className="contactNote">📝 {getLastContactByBed[selectedBed.id].note}</p>}
                    </div>
                  </div>
                </div>
              )}

              {getFeeByBed[selectedBed.id] && getFeeByBed[selectedBed.id].length > 0 && (
                <div className="bedDetailSection">
                  <h4><Wallet size={16} /> 费用记录</h4>
                  {getFeeByBed[selectedBed.id].slice(0, 2).map(fee => (
                    <div key={fee.id} className="bedDetailFee">
                      <div className="bedDetailFeeHeader">
                        <span>{fee.startDate} 至 {fee.endDate}</span>
                        <span className={`feeStatusTag ${fee.paymentStatus}`}>{fee.paymentStatus}</span>
                      </div>
                      <div className="bedDetailFeeAmount">¥{fee.amount}</div>
                      {fee.donationNote && <p className="feeDonation"><Heart size={12} /> {fee.donationNote}</p>}
                    </div>
                  ))}
                </div>
              )}

              {plants.filter(p => p.bedId === selectedBed.id).length > 0 && (
                <div className="bedDetailSection">
                  <h4><Sprout size={16} /> 种植计划</h4>
                  {plants.filter(p => p.bedId === selectedBed.id).map(plant => (
                    <div key={plant.id} className="bedDetailPlant">
                      <div className="bedDetailPlantHeader">
                        <strong>{plant.crop}</strong>
                        <span className={`stageTag ${plant.growthStage}`}>{plant.growthStage}</span>
                      </div>
                      <p className="row"><CalendarDays size={14} /> 播种：{plant.sowDate} <span>预计采摘：{plant.harvestDate}</span></p>
                      <p className="row"><Timer size={14} /> {getDaysUntilHarvest(plant.harvestDate)}</p>
                      {plant.note && <p className="plantNote">📝 {plant.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {harvests.filter(h => h.bed === selectedBed.name).length > 0 && (
                <div className="bedDetailSection">
                  <h4><Wheat size={16} /> 最近采摘</h4>
                  {harvests.filter(h => h.bed === selectedBed.name).slice(0, 3).map(h => (
                    <div key={h.id} className="bedDetailHarvest">
                      <div className="bedDetailHarvestHeader">
                        <strong>{h.crop}</strong>
                        <span>{h.weight}</span>
                      </div>
                      <p className="row"><CalendarDays size={14} /> {h.date}</p>
                      {h.note && <p className="harvestNote">📝 {h.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="modalActions">
                <button type="button" className="clearBtn" onClick={closeBedDetail}>关闭</button>
                <button
                  type="button"
                  onClick={() => {
                    advanceWater(selectedBed.id);
                    const updated = beds.find(b => b.id === selectedBed.id);
                    if (updated) setSelectedBed({ ...updated, nextWater: iso(3), warning: '' });
                  }}
                >
                  <Droplets size={14} /> 已浇水
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
