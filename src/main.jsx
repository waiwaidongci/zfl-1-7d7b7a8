import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Clock, Droplets, Leaf, MessageCircle, Phone, MapPin, Bell, Plus, Search, Trash2, TriangleAlert, Users, Wheat, Sprout, CalendarCheck, Package, AlertCircle, ArrowDownCircle, ArrowUpCircle, Archive, History } from 'lucide-react';
import './styles.css';

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

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  });
  const update = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    setValue(resolved);
    localStorage.setItem(key, JSON.stringify(resolved));
  };
  return [value, update];
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [beds, setBeds] = useStoredState('zfl-1-beds', seedBeds);
  const [harvests, setHarvests] = useStoredState('zfl-1-harvests', seedHarvests);
  const [tasks, setTasks] = useStoredState('zfl-1-tasks', seedTasks);
  const [schedules, setSchedules] = useStoredState('zfl-1-schedules', seedSchedules);
  const [contacts, setContacts] = useStoredState('zfl-1-contacts', seedContacts);
  const [plants, setPlants] = useStoredState('zfl-1-plants', seedPlants);
  const [materials, setMaterials] = useStoredState('zfl-1-materials', seedMaterials);
  const [transactions, setTransactions] = useStoredState('zfl-1-transactions', seedTransactions);
  const [query, setQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('');
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');
  const [plantQuery, setPlantQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [bedForm, setBedForm] = useState({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '' });
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

  const weekWater = beds.filter((bed) => {
    const days = (new Date(bed.nextWater) - today) / 86400000;
    return days <= 7 && days >= -1;
  });
  const filteredBeds = beds.filter((bed) => `${bed.name}${bed.crop}${bed.adopter}${bed.phone}`.includes(query.trim()));
  const activeCount = beds.filter((bed) => bed.status === '认养中').length;
  const warnings = beds.filter((bed) => bed.warning);

  const addBed = (event) => {
    event.preventDefault();
    if (!bedForm.name.trim()) return;
    setBeds([{ id: crypto.randomUUID(), ...bedForm }, ...beds]);
    setBedForm({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '' });
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
          <span><TriangleAlert size={18} />{warnings.length}条异常</span>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setActiveTab('dashboard')}>
          <Leaf size={16} />菜园总览
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
              {harvests.slice(0, 4).map((item) => (
                <div key={item.id} className="harvestMiniCard">
                  <p className="row" style={{ margin: 0 }}><Wheat size={16} />{item.crop}{item.weight}<span>{item.date}</span></p>
                  {consumptionsByHarvestId[item.id] && consumptionsByHarvestId[item.id].length > 0 && (
                    <div className="taskConsumptions">
                      {consumptionsByHarvestId[item.id].map((c) => (
                        <span key={c.id} className="miniConsumeTag">
                          <Package size={12} />{c.materialName} -{c.quantity}{c.unit}
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="button" className="miniBtn" onClick={() => quickConsumeForHarvest(item.id, `${item.crop} ${item.weight}`)}>
                    <ArrowUpCircle size={12} />登记追肥/耗材
                  </button>
                </div>
              ))}
            </article>
            <article>
              <h2>异常提醒</h2>
              {warnings.length ? warnings.map((bed) => <p className="row alert" key={bed.id}><TriangleAlert size={16} />{bed.name}<span>{bed.warning}</span></p>) : <p className="muted">暂无异常</p>}
            </article>
          </section>

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
                          {consumptionsByBedName[bed.name].slice(0, 3).map((c) => (
                            <span key={c.id} className="miniConsumeTag">
                              {c.materialName} -{c.quantity}{c.unit}
                            </span>
                          ))}
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
                      {consumptionsByTaskId[task.id].map((c) => (
                        <span key={c.id} className="miniConsumeTag">
                          <Package size={12} />{c.materialName} -{c.quantity}{c.unit}
                        </span>
                      ))}
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
                  filteredTransactions.map((t) => (
                    <article className="transactionCard" key={t.id}>
                      <div className="transactionHeader">
                        <div className="transactionMeta">
                          <span className={`transactionTypeTag ${t.type}`}>
                            {t.type === 'inbound' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                            {t.type === 'inbound' ? '入库' : '消耗'}
                          </span>
                          <strong className="transactionMaterial">{t.materialName}</strong>
                          <span className={`categoryTag ${t.category}`}>{t.category}</span>
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
                            {t.type === 'inbound' ? '+' : '-'}{t.quantity} {t.unit}
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
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
