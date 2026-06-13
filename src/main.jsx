import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Clock, CheckCircle2, Droplets, Leaf, MessageCircle, Phone, MapPin, Bell, Plus, Search, Trash2, TriangleAlert, Users, Wheat, Sprout, CalendarCheck, Package, AlertCircle, ArrowDownCircle, ArrowUpCircle, Archive, History, User, Heart, Map, Bug, Database, Wrench, AlertTriangle, Info, RefreshCw, TrendingUp, ListTodo } from 'lucide-react';
import './styles.css';

import {
  seedBeds, seedHarvests, seedTasks, seedSchedules, seedContacts,
  seedPlants, seedMaterials, seedTransactions, iso, getWeekday,
  getSuggestedMaterials, RELATED_TYPE_LABELS, buildTransactionEntry
} from './data/seedData';
import { CropRotationPanel } from './components/CropRotationPanel';
import { seedInspections, bedPlacementSeed } from './data/inspectionData';
import { useStoredState } from './hooks/useStoredState';
import { DistributionTab } from './components/DistributionTab';
import { DistributionModal } from './components/DistributionModal';
import { FloorPlanTab } from './components/FloorPlanTab';
import { InspectionTab } from './components/InspectionTab';
import { ArchivePanel } from './components/ArchivePanel';
import { ConsistencyCheckCenter } from './components/ConsistencyCheckCenter';
import {
  runAllConsistencyChecks,
  fixIssue as fixConsistencyIssue,
  getConsistencyStats,
  ISSUE_SEVERITY
} from './utils/consistencyCheck';
import {
  DISTRIBUTION_TYPES,
  PICKUP_CONFIRM_OVERDUE_DAYS,
  parseWeight,
  formatWeight,
  getDistributionTotal,
  getDistributionStatus,
  getDistributionWarnings,
  getDistributionRemaining,
  getDistributionStats,
  getPickupStatus,
  getPickupWarnings,
  getAllWarnings,
  generatePickupNoticeContact,
  confirmPickupContact,
  checkPickupNoticeExists,
  findRelatedPickupNotice
} from './utils/distribution';
import { getOverdueReviewTasks, syncAllInspections } from './utils/statusSync';


const today = new Date();

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
  const [inspections, setInspections] = useStoredState('zfl-1-inspections', seedInspections);
  const [bedPlacement, setBedPlacement] = useStoredState('zfl-1-bedPlacement', bedPlacementSeed);
  const [prefillBedId, setPrefillBedId] = useState('');
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
  const [transactionForm, setTransactionForm] = useState({ materialId: '', type: 'inbound', quantity: '', date: iso(0), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '' });
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
  const [transactionMaterialFilter, setTransactionMaterialFilter] = useState('');
  const [transactionBedFilter, setTransactionBedFilter] = useState('');
  const [transactionCropFilter, setTransactionCropFilter] = useState('');
  const [transactionRelatedTypeFilter, setTransactionRelatedTypeFilter] = useState('');
  const [editingMaterialId, setEditingMaterialId] = useState('');
  const [editingMaterialForm, setEditingMaterialForm] = useState({ name: '', category: '种子', unit: '', lowStockThreshold: 5, note: '' });
  const [distEditingHarvest, setDistEditingHarvest] = useState(null);
  const [harvestConsumptions, setHarvestConsumptions] = useState([]);
  const [plantConsumptions, setPlantConsumptions] = useState([]);
  const [taskConsumptions, setTaskConsumptions] = useState({});
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [consistencyIssues, setConsistencyIssues] = useState([]);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [lastConsistencyCheck, setLastConsistencyCheck] = useState(null);

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
    const newId = crypto.randomUUID();
    const matchedBed = beds.find(b => b.name === harvestForm.bed);
    const effectiveCrop = matchedBed && matchedBed.crop && matchedBed.crop !== '待播种'
      ? matchedBed.crop
      : harvestForm.crop;
    const effectiveBedName = matchedBed ? matchedBed.name : harvestForm.bed;
    setHarvests([{ id: newId, ...harvestForm, bed: effectiveBedName, crop: effectiveCrop, distribution: null }, ...harvests]);
    if (harvestConsumptions.length > 0) {
      const newTransactions = harvestConsumptions.filter(c => c.quantity > 0).map(c => ({
        ...c,
        id: crypto.randomUUID(),
        relatedType: 'harvest',
        relatedId: newId,
        relatedName: `${effectiveCrop} ${harvestForm.weight}`,
        bedName: effectiveBedName,
        crop: effectiveCrop
      }));
      if (newTransactions.length > 0) {
        setTransactions([...newTransactions, ...transactions]);
      }
    }
    setHarvestForm({ bed: '', crop: '', weight: '', date: iso(0), note: '' });
    setHarvestConsumptions([]);
  };

  const saveDistributionFromDashboard = (harvestId, distribution) => {
    setHarvests(harvests.map((h) =>
      h.id === harvestId ? {
        ...h,
        distribution: distribution ? { ...distribution, distributionUpdatedAt: iso(0) } : null
      } : h
    ));
    setDistEditingHarvest(null);
  };

  const generatePickupNoticeFromDashboard = (harvestId) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest || !harvest.distribution?.selfPickup) return;
    if (checkPickupNoticeExists(contacts, harvestId)) return;
    const contact = generatePickupNoticeContact(harvest, beds);
    if (contact) {
      setContacts([contact, ...contacts]);
    }
  };

  const confirmPickupFromDashboard = (harvestId) => {
    setHarvests(harvests.map((h) => {
      if (h.id !== harvestId) return h;
      if (!h.distribution || !h.distribution.selfPickup) return h;
      return {
        ...h,
        distribution: {
          ...h.distribution,
          selfPickupConfirmedAt: iso(0)
        }
      };
    }));
    if (checkPickupNoticeExists(contacts, harvestId)) {
      setContacts(confirmPickupContact(contacts, harvestId));
    }
  };

  const toggleTask = (id) => setTasks(tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const advanceWater = (id) => setBeds(beds.map((bed) => bed.id === id ? { ...bed, nextWater: iso(3), warning: '' } : bed));

  const toggleTaskExpand = (taskId) => {
    setExpandedTaskIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const getTaskConsumptions = (taskId) => taskConsumptions[taskId] || [];

  const setTaskConsumptionsById = (taskId, consumptions) => {
    setTaskConsumptions(prev => ({
      ...prev,
      [taskId]: consumptions
    }));
  };

  const getTaskBedInfo = (task) => {
    const matchedBed = beds.find((b) => task.title.includes(b.name.slice(0, 3)));
    return matchedBed ? { bedId: matchedBed.id, bedName: matchedBed.name, crop: matchedBed.crop === '待播种' ? '' : matchedBed.crop } : { bedId: '', bedName: '', crop: '' };
  };

  const saveTaskConsumptions = (taskId, taskTitle) => {
    const consumptions = getTaskConsumptions(taskId);
    const validConsumptions = consumptions.filter(c => c.quantity > 0);
    if (validConsumptions.length === 0) return;

    const bedInfo = getTaskBedInfo({ title: taskTitle });
    const newTransactions = validConsumptions.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      relatedType: 'task',
      relatedId: taskId,
      relatedName: taskTitle,
      bedName: bedInfo.bedName,
      crop: bedInfo.crop
    }));

    setTransactions([...newTransactions, ...transactions]);
    setTaskConsumptionsById(taskId, []);
    toggleTaskExpand(taskId);
  };

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
    const newId = crypto.randomUUID();
    setPlants([{ id: newId, ...plantForm, growthStage: stage }, ...plants]);
    if (plantConsumptions.length > 0) {
      const newTransactions = plantConsumptions.filter(c => c.quantity > 0).map(c => ({
        ...c,
        id: crypto.randomUUID(),
        relatedType: 'plant',
        relatedId: newId,
        relatedName: `${plantForm.bedName}-${plantForm.crop}`,
        bedName: plantForm.bedName,
        crop: plantForm.crop
      }));
      if (newTransactions.length > 0) {
        setTransactions([...newTransactions, ...transactions]);
      }
    }
    setPlantForm({ bedId: '', bedName: '', crop: '', sowDate: iso(0), harvestDate: iso(30), growthStage: '播种期', note: '' });
    setPlantConsumptions([]);
  };

  const deletePlant = (id) => {
    setPlants(plants.filter((p) => p.id !== id));
  };

  const addPlantFromRotation = (plantData) => {
    if (!plantData || !plantData.bedId || !plantData.crop) return;
    const newId = crypto.randomUUID();
    const stage = calculateGrowthStage(plantData.sowDate, plantData.harvestDate);
    setPlants([{ ...plantData, id: newId, growthStage: stage }, ...plants]);
    setActiveTab('plants');
  };

  const addTaskFromRotation = (taskData) => {
    if (!taskData || !taskData.title) return;
    const newId = crypto.randomUUID();
    setTasks([{ ...taskData, id: newId }, ...tasks]);
    setActiveTab('dashboard');
  };

  const handleCreatePlantFromBed = (bed, suggestion, availableDate) => {
    if (!bed || !suggestion) return;
    const growthDays = suggestion.growthDays || 30;
    const sowDate = availableDate || iso(0);
    const harvestDateObj = new Date(sowDate);
    harvestDateObj.setDate(harvestDateObj.getDate() + growthDays);
    const harvestDate = harvestDateObj.toISOString().slice(0, 10);
    const stage = calculateGrowthStage(sowDate, harvestDate);

    const newPlant = {
      id: crypto.randomUUID(),
      bedId: bed.id,
      bedName: bed.name,
      crop: suggestion.crop,
      sowDate,
      harvestDate,
      growthStage: stage,
      note: `轮作规划推荐 · ${suggestion.reason}`
    };
    setPlants([newPlant, ...plants]);
    setActiveTab('plants');
  };

  const handleCreateTaskFromBed = (bed, suggestion, availableDate) => {
    if (!bed || !suggestion) return;
    const taskDate = availableDate || iso(0);
    const newTask = {
      id: crypto.randomUUID(),
      title: `${bed.name} 播种${suggestion.crop}`,
      owner: '园艺管家',
      due: taskDate,
      done: false,
      note: `轮作规划推荐 · ${suggestion.reason}`,
      relatedBedId: bed.id,
      relatedBedName: bed.name,
      relatedCrop: suggestion.crop,
      source: 'rotation_plan'
    };
    setTasks([newTask, ...tasks]);
    setActiveTab('dashboard');
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
    const consumeByRelatedType = {};
    const consumeQtyByRelatedType = {};
    transactions.filter(t => t.type === 'consume').forEach(t => {
      const key = t.relatedType || 'unassigned';
      consumeByRelatedType[key] = (consumeByRelatedType[key] || 0) + 1;
      consumeQtyByRelatedType[key] = (consumeQtyByRelatedType[key] || 0) + t.quantity;
    });
    const topConsumed = {};
    transactions.filter(t => t.type === 'consume').forEach(t => {
      if (!topConsumed[t.materialId]) {
        topConsumed[t.materialId] = { name: t.materialName, total: 0, unit: t.unit, category: t.category };
      }
      topConsumed[t.materialId].total += t.quantity;
    });
    const topConsumedList = Object.values(topConsumed).sort((a, b) => b.total - a.total).slice(0, 5);

    const consumeByCategory = {};
    transactions.filter(t => t.type === 'consume').forEach(t => {
      if (!consumeByCategory[t.category]) {
        consumeByCategory[t.category] = { count: 0, totalQty: 0 };
      }
      consumeByCategory[t.category].count += 1;
      consumeByCategory[t.category].totalQty += t.quantity;
    });

    const consumeBeds = new Set();
    transactions.filter(t => t.type === 'consume').forEach(t => {
      if (t.bedName) consumeBeds.add(t.bedName);
    });

    const totalConsumeQty = transactions
      .filter(t => t.type === 'consume')
      .reduce((sum, t) => sum + t.quantity, 0);

    return {
      categoryCount: categories.size,
      materialCount: materials.length,
      lowStockCount: lowStockItems.length,
      monthlyInbound,
      monthlyConsume,
      consumeByRelatedType,
      consumeQtyByRelatedType,
      topConsumedList,
      consumeByCategory,
      consumeBedCount: consumeBeds.size,
      totalConsumeQty
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

  const transactionBedOptions = useMemo(() => {
    const bedNames = new Set();
    transactions.filter((t) => t.type === 'consume').forEach((t) => {
      if (t.bedName) bedNames.add(t.bedName);
    });
    beds.forEach((b) => bedNames.add(b.name));
    return Array.from(bedNames).sort();
  }, [transactions, beds]);

  const transactionCropOptions = useMemo(() => {
    const crops = new Set();
    transactions.filter((t) => t.type === 'consume').forEach((t) => {
      if (t.crop) crops.add(t.crop);
    });
    plants.forEach((p) => crops.add(p.crop));
    harvests.forEach((h) => crops.add(h.crop));
    beds.forEach((b) => { if (b.crop && b.crop !== '待播种') crops.add(b.crop); });
    return Array.from(crops).sort();
  }, [transactions, plants, harvests, beds]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (transactionTypeFilter) {
      result = result.filter((t) => t.type === transactionTypeFilter);
    }
    if (transactionMaterialFilter) {
      result = result.filter((t) => t.materialId === transactionMaterialFilter);
    }
    if (transactionBedFilter) {
      result = result.filter((t) => t.bedName === transactionBedFilter);
    }
    if (transactionCropFilter) {
      result = result.filter((t) => t.crop === transactionCropFilter);
    }
    if (transactionRelatedTypeFilter) {
      result = result.filter((t) => t.relatedType === transactionRelatedTypeFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, transactionTypeFilter, transactionMaterialFilter, transactionBedFilter, transactionCropFilter, transactionRelatedTypeFilter]);

  const transactionRelatedOptions = useMemo(() => {
    const taskOpts = tasks.map((t) => ({ id: t.id, name: t.title, type: 'task' }));
    const harvestOpts = harvests.map((h) => ({ id: h.id, name: `${h.crop} ${h.weight}`, type: 'harvest', bedName: h.bed, crop: h.crop }));
    const plantOpts = plants.map((p) => ({ id: p.id, name: `${p.bedName}-${p.crop}`, type: 'plant', bedName: p.bedName, crop: p.crop }));
    const inspectionOpts = inspections.map((i) => ({ id: i.id, name: `${i.bedName}-${i.abnormalType || '巡检'}`, type: 'inspection', bedName: i.bedName }));
    const bedOpts = beds.map((b) => ({ id: b.id, name: b.name, type: 'bed', bedName: b.name, crop: b.crop }));
    return { task: taskOpts, harvest: harvestOpts, plant: plantOpts, inspection: inspectionOpts, bed: bedOpts };
  }, [tasks, harvests, plants, inspections, beds]);

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

  const consumptionsByPlantId = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'consume' && t.relatedType === 'plant').forEach((t) => {
      if (!map[t.relatedId]) map[t.relatedId] = [];
      map[t.relatedId].push(t);
    });
    return map;
  }, [transactions]);

  const consumptionsByInspectionId = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'consume' && t.relatedType === 'inspection').forEach((t) => {
      if (!map[t.relatedId]) map[t.relatedId] = [];
      map[t.relatedId].push(t);
    });
    return map;
  }, [transactions]);

  const consumptionsByBedId = useMemo(() => {
    const map = {};
    const bedIdMap = {};
    beds.forEach((b) => { bedIdMap[b.name] = b.id; });
    const taskBedMap = {};
    tasks.forEach((t) => {
      const matchedBed = beds.find((b) => t.title.includes(b.name.slice(0, 3)));
      if (matchedBed) taskBedMap[t.id] = matchedBed.id;
    });
    transactions.filter((t) => t.type === 'consume').forEach((t) => {
      let bedId = '';
      if (t.relatedType === 'harvest') {
        const h = harvests.find((h) => h.id === t.relatedId);
        if (h) bedId = bedIdMap[h.bed] || '';
      } else if (t.relatedType === 'task') {
        bedId = taskBedMap[t.relatedId] || '';
      } else if (t.relatedType === 'plant') {
        const p = plants.find((p) => p.id === t.relatedId);
        if (p) bedId = p.bedId;
      } else if (t.relatedType === 'inspection') {
        const i = inspections.find((i) => i.id === t.relatedId);
        if (i) {
          const b = beds.find((b) => b.name === i.bedName);
          if (b) bedId = b.id;
        }
      } else if (t.relatedType === 'bed') {
        bedId = t.relatedId;
      }
      if (!bedId && t.bedName) {
        bedId = bedIdMap[t.bedName] || '';
      }
      if (bedId) {
        if (!map[bedId]) map[bedId] = [];
        map[bedId].push(t);
      }
    });
    return map;
  }, [transactions, tasks, harvests, plants, inspections, beds]);

  const consumptionsByBedName = useMemo(() => {
    const map = {};
    Object.entries(consumptionsByBedId).forEach(([bedId, ts]) => {
      const bed = beds.find((b) => b.id === bedId);
      if (bed) {
        map[bed.name] = ts;
      }
    });
    return map;
  }, [consumptionsByBedId, beds]);

  const consumptionsByCrop = useMemo(() => {
    const map = {};
    const bedCropMap = {};
    beds.forEach((b) => { if (b.crop && b.crop !== '待播种') bedCropMap[b.name] = b.crop; });
    plants.forEach((p) => { bedCropMap[p.bedName] = p.crop; });
    harvests.forEach((h) => { bedCropMap[h.bed] = h.crop; });
    transactions.filter((t) => t.type === 'consume').forEach((t) => {
      let crop = t.crop || '';
      if (!crop) {
        if (t.relatedType === 'harvest') {
          const h = harvests.find((h) => h.id === t.relatedId);
          if (h) crop = h.crop;
        } else if (t.relatedType === 'plant') {
          const p = plants.find((p) => p.id === t.relatedId);
          if (p) crop = p.crop;
        } else if (t.bedName) {
          crop = bedCropMap[t.bedName] || '';
        }
      }
      if (crop) {
        if (!map[crop]) map[crop] = [];
        map[crop].push(t);
      }
    });
    return map;
  }, [transactions, harvests, plants, beds]);

  const consumeTransactionBedOptions = useMemo(() =>
    beds.map((b) => ({ id: b.id, name: b.name, crop: b.crop })),
    [beds]
  );

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
      bedName: transactionForm.bedName,
      crop: transactionForm.crop,
      note: transactionForm.note
    };
    setTransactions([entry, ...transactions]);
    setTransactionForm({ materialId: '', type: 'inbound', quantity: '', date: iso(0), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '' });
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const selectTransactionRelated = (type, id) => {
    if (!type || !id) {
      setTransactionForm({ ...transactionForm, relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '' });
      return;
    }
    const opts = transactionRelatedOptions[type] || [];
    const found = opts.find((o) => o.id === id);
    if (found) {
      setTransactionForm({
        ...transactionForm,
        relatedType: type,
        relatedId: found.id,
        relatedName: found.name,
        bedName: found.bedName || transactionForm.bedName,
        crop: found.crop || transactionForm.crop
      });
    }
  };

  const selectTransactionBed = (bedId) => {
    if (!bedId) {
      setTransactionForm({ ...transactionForm, bedName: '', crop: '' });
      return;
    }
    const bed = beds.find((b) => b.id === bedId);
    if (bed) {
      setTransactionForm({
        ...transactionForm,
        bedName: bed.name,
        crop: bed.crop === '待播种' ? '' : bed.crop
      });
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

  const quickConsumeForHarvest = (harvestId, harvestName, bedName, crop) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'harvest',
      relatedId: harvestId,
      relatedName: harvestName,
      bedName: bedName || '',
      crop: crop || '',
      note: ''
    });
    setActiveTab('inventory');
  };

  const quickConsumeForPlant = (plantId, plantName, bedName, crop) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'plant',
      relatedId: plantId,
      relatedName: plantName,
      bedName: bedName || '',
      crop: crop || '',
      note: ''
    });
    setActiveTab('inventory');
  };

  const quickConsumeForInspection = (inspectionId, inspectionName, bedName, crop) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'inspection',
      relatedId: inspectionId,
      relatedName: inspectionName,
      bedName: bedName || '',
      crop: crop || '',
      note: ''
    });
    setActiveTab('inventory');
  };

  const quickConsumeForBed = (bedId, bedName, crop) => {
    setTransactionForm({
      materialId: '',
      type: 'consume',
      quantity: '',
      date: iso(0),
      relatedType: 'bed',
      relatedId: bedId,
      relatedName: bedName,
      bedName: bedName || '',
      crop: crop || '',
      note: ''
    });
    setActiveTab('inventory');
  };

  const getMaterialInfo = (materialId) => {
    const m = materials.find((x) => x.id === materialId);
    return m ? { name: m.name, category: m.category, unit: m.unit } : null;
  };

  const renderConsumptionSuggestions = (context, consumptions, setConsumptions) => {
    const suggestions = getSuggestedMaterials(materials, context);
    if (suggestions.length === 0) return null;

    const addSuggestedMaterial = (rule) => {
      const firstMat = rule.materials[0];
      if (!firstMat) return;
      const exists = consumptions.find(c => c.materialId === firstMat.id);
      if (exists) return;
      const entry = buildTransactionEntry(firstMat.id, materials, {
        quantity: rule.defaultQty,
        note: rule.label
      });
      if (entry) {
        setConsumptions([...consumptions, entry]);
      }
    };

    const removeConsumption = (materialId) => {
      setConsumptions(consumptions.filter(c => c.materialId !== materialId));
    };

    const updateConsumptionQty = (materialId, qty) => {
      setConsumptions(consumptions.map(c =>
        c.materialId === materialId ? { ...c, quantity: Number(qty) || 0 } : c
      ));
    };

    const addCustomMaterial = () => {
      const availableMaterials = materials.filter(
        m => !consumptions.find(c => c.materialId === m.id)
      );
      if (availableMaterials.length === 0) return;
      const first = availableMaterials[0];
      const entry = buildTransactionEntry(first.id, materials, { quantity: 1 });
      if (entry) {
        setConsumptions([...consumptions, entry]);
      }
    };

    const changeCustomMaterial = (oldMaterialId, newMaterialId) => {
      const existing = consumptions.find(c => c.materialId === newMaterialId);
      if (existing) return;
      const entry = buildTransactionEntry(newMaterialId, materials, { quantity: 1 });
      if (entry) {
        setConsumptions(consumptions.map(c =>
          c.materialId === oldMaterialId ? entry : c
        ));
      }
    };

    const availableMaterials = materials.filter(
      m => !consumptions.find(c => c.materialId === m.id)
    );

    return (
      <div className="consumptionSuggestionSection">
        <div className="consumptionSuggestionHeader">
          <ArrowUpCircle size={16} />
          <span>消耗建议</span>
          <span className="consumptionSuggestionHint">（可选，同步记入库存消耗）</span>
        </div>
        <div className="suggestionQuickAdd">
          {suggestions.map((rule, idx) => {
            const firstMat = rule.materials[0];
            const alreadyAdded = consumptions.find(c => c.materialId === firstMat?.id);
            return (
              <button
                key={idx}
                type="button"
                className={`suggestionChip ${alreadyAdded ? 'added' : ''}`}
                onClick={() => addSuggestedMaterial(rule)}
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
        {consumptions.length > 0 && (
          <div className="consumptionItems">
            {consumptions.map((c) => (
              <div key={c.materialId} className="consumptionItem">
                <select
                  value={c.materialId}
                  onChange={(e) => changeCustomMaterial(c.materialId, e.target.value)}
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
                  onChange={(e) => updateConsumptionQty(c.materialId, e.target.value)}
                  style={{ width: '80px' }}
                />
                <span className="consumptionUnit">{c.unit}</span>
                <button
                  type="button"
                  className="consumptionRemoveBtn"
                  onClick={() => removeConsumption(c.materialId)}
                >
                  ×
                </button>
              </div>
            ))}
            {availableMaterials.length > 0 && (
              <button type="button" className="consumptionAddBtn" onClick={addCustomMaterial}>
                <Plus size={12} /> 添加物资
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const runConsistencyCheck = (currentData = null) => {
    setIsCheckingConsistency(true);
    setTimeout(() => {
      const data = currentData || { beds, tasks, inspections, harvests, plants, transactions, contacts, materials };
      const issues = runAllConsistencyChecks(data);
      setConsistencyIssues(issues);
      setLastConsistencyCheck(new Date());
      setIsCheckingConsistency(false);
    }, 300);
  };

  const applyFixToData = (issue, currentBeds, currentTasks, currentInspections, currentHarvests, currentPlants, currentTransactions, currentContacts) => {
    const { fixType, fixData } = issue;
    let newBeds = currentBeds;
    let newTasks = currentTasks;
    let newInspections = currentInspections;
    let newHarvests = currentHarvests;
    let newPlants = currentPlants;
    let newTransactions = currentTransactions;
    let newContacts = currentContacts;

    switch (fixType) {
      case 'clear_bed_warning':
        newBeds = currentBeds.map(b => b.id === fixData.bedId ? { ...b, warning: '' } : b);
        break;

      case 'remove_duplicate_tasks': {
        const relatedTasks = currentTasks.filter(t =>
          t.relatedInspectionId === fixData.inspectionId && t.taskType === fixData.taskType
        );
        const tasksToKeep = relatedTasks.slice(0, fixData.keepCount).map(t => t.id);
        newTasks = currentTasks.filter(t =>
          !(t.relatedInspectionId === fixData.inspectionId &&
            t.taskType === fixData.taskType &&
            !tasksToKeep.includes(t.id))
        );
        break;
      }

      case 'adjust_distribution': {
        const harvest = currentHarvests.find(h => h.id === fixData.harvestId);
        if (harvest && harvest.distribution) {
          const ratio = fixData.maxAllowed / getDistributionTotal(harvest.distribution);
          const adjustedDist = { ...harvest.distribution };

          for (const key of Object.keys(adjustedDist)) {
            if (key === 'distributionUpdatedAt' || key === 'selfPickupConfirmedAt') continue;
            if (adjustedDist[key]) {
              const grams = parseWeight(adjustedDist[key]);
              const newGrams = Math.round(grams * ratio);
              adjustedDist[key] = newGrams >= 1000
                ? `${(newGrams / 1000).toFixed(1)}kg`
                : `${newGrams}g`;
            }
          }

          newHarvests = currentHarvests.map(h =>
            h.id === fixData.harvestId ? { ...h, distribution: adjustedDist } : h
          );
        }
        break;
      }

      case 'update_bed_status':
        newBeds = currentBeds.map(b =>
          b.id === fixData.bedId ? { ...b, status: fixData.newStatus } : b
        );
        break;

      case 'clear_transaction_relation':
        newTransactions = currentTransactions.map(t =>
          t.id === fixData.transactionId
            ? { ...t, relatedType: '', relatedId: '', relatedName: '' }
            : t
        );
        break;

      case 'retry_sync_inspection': {
        const result = syncAllInspections(currentInspections, currentBeds, currentTasks);
        newBeds = result.beds;
        newTasks = result.tasks;
        newInspections = result.inspections.map(i =>
          i.id === fixData.inspectionId ? { ...i, syncStatus: 'synced', retryCount: 0 } : i
        );
        break;
      }

      case 'send_pickup_notice': {
        const harvest = currentHarvests.find(h => h.id === fixData.harvestId);
        if (harvest && harvest.distribution?.selfPickup) {
          if (!checkPickupNoticeExists(currentContacts, harvest.id)) {
            const contact = generatePickupNoticeContact(harvest, currentBeds);
            if (contact) {
              newContacts = [contact, ...currentContacts];
            }
          }
        }
        break;
      }

      case 'sync_pickup_confirmation': {
        const now = new Date().toISOString();
        newHarvests = currentHarvests.map(h => {
          if (h.id !== fixData.harvestId) return h;
          return {
            ...h,
            distribution: {
              ...h.distribution,
              selfPickupConfirmedAt: now
            }
          };
        });
        newContacts = currentContacts.map(c => {
          if (c.id !== fixData.contactId) return c;
          return {
            ...c,
            pickupStatus: 'confirmed',
            pickupConfirmedAt: now,
            note: c.note
              ? `${c.note} · 已于${now.slice(5, 16)}确认取菜`
              : `已于${now.slice(5, 16)}确认取菜`
          };
        });
        break;
      }

      default:
        break;
    }

    return { newBeds, newTasks, newInspections, newHarvests, newPlants, newTransactions, newContacts };
  };

  const persistConsistencyData = ({
    nextBeds,
    nextTasks,
    nextInspections,
    nextHarvests,
    nextPlants,
    nextTransactions,
    nextContacts
  }) => {
    setBeds(nextBeds);
    setTasks(nextTasks);
    setInspections(nextInspections);
    setHarvests(nextHarvests);
    setPlants(nextPlants);
    setTransactions(nextTransactions);
    setContacts(nextContacts);
    setMaterials(materials);
  };

  const handleFixIssue = (issue) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { newBeds, newTasks, newInspections, newHarvests, newPlants, newTransactions, newContacts } = 
          applyFixToData(issue, beds, tasks, inspections, harvests, plants, transactions, contacts);

        persistConsistencyData({
          nextBeds: newBeds,
          nextTasks: newTasks,
          nextInspections: newInspections,
          nextHarvests: newHarvests,
          nextPlants: newPlants,
          nextTransactions: newTransactions,
          nextContacts: newContacts
        });

        setConsistencyIssues(prev => prev.filter(i => i.id !== issue.id));

        setTimeout(() => {
          runConsistencyCheck({
            beds: newBeds, tasks: newTasks, inspections: newInspections,
            harvests: newHarvests, plants: newPlants, transactions: newTransactions,
            contacts: newContacts, materials
          });
          resolve(true);
        }, 50);
      }, 300);
    });
  };

  const handleBatchFix = async (issuesToFix) => {
    const autoFixable = issuesToFix.filter(i =>
      !['handle_missing_material', 'review_inspection_status'].includes(i.fixType)
    );

    if (autoFixable.length === 0) return;

    let currentBeds = beds;
    let currentTasks = tasks;
    let currentInspections = inspections;
    let currentHarvests = harvests;
    let currentPlants = plants;
    let currentTransactions = transactions;
    let currentContacts = contacts;
    const fixedIds = new Set();

    for (const issue of autoFixable) {
      const result = applyFixToData(
        issue, currentBeds, currentTasks, currentInspections,
        currentHarvests, currentPlants, currentTransactions, currentContacts
      );
      currentBeds = result.newBeds;
      currentTasks = result.newTasks;
      currentInspections = result.newInspections;
      currentHarvests = result.newHarvests;
      currentPlants = result.newPlants;
      currentTransactions = result.newTransactions;
      currentContacts = result.newContacts;
      fixedIds.add(issue.id);
    }

    persistConsistencyData({
      nextBeds: currentBeds,
      nextTasks: currentTasks,
      nextInspections: currentInspections,
      nextHarvests: currentHarvests,
      nextPlants: currentPlants,
      nextTransactions: currentTransactions,
      nextContacts: currentContacts
    });

    setConsistencyIssues(prev => prev.filter(i => !fixedIds.has(i.id)));

    setTimeout(() => {
      runConsistencyCheck({
        beds: currentBeds, tasks: currentTasks, inspections: currentInspections,
        harvests: currentHarvests, plants: currentPlants, transactions: currentTransactions,
        contacts: currentContacts, materials
      });
    }, 100);
  };

  const consistencyStats = useMemo(() =>
    getConsistencyStats(consistencyIssues),
    [consistencyIssues]
  );

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
          {consistencyStats.total > 0 && (
            <span
              className="heroConsistencyStat"
              onClick={() => setActiveTab('consistency')}
              style={{ cursor: 'pointer', background: consistencyStats.critical > 0 ? 'rgba(138, 44, 44, 0.3)' : 'rgba(138, 90, 44, 0.3)' }}
            >
              <Wrench size={18} />{consistencyStats.total}项一致性问题
              {consistencyStats.critical > 0 && <strong style={{ marginLeft: '4px' }}>({consistencyStats.critical}严重)</strong>}
            </span>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setActiveTab('dashboard')}>
          <Leaf size={16} />菜园总览
        </button>
        <button className={activeTab === 'plants' ? 'tab active' : 'tab'} onClick={() => setActiveTab('plants')}>
          <Sprout size={16} />种植计划
        </button>
        <button className={activeTab === 'rotation' ? 'tab active' : 'tab'} onClick={() => setActiveTab('rotation')}>
          <TrendingUp size={16} />轮作规划
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
        <button className={activeTab === 'distribution' ? 'tab active' : 'tab'} onClick={() => setActiveTab('distribution')}>
          <Package size={16} />采收分配
        </button>
        <button className={activeTab === 'floorPlan' ? 'tab active' : 'tab'} onClick={() => setActiveTab('floorPlan')}>
          <Map size={16} />屋顶平面图
        </button>
        <button className={activeTab === 'inspection' ? 'tab active' : 'tab'} onClick={() => setActiveTab('inspection')}>
          <Bug size={16} />巡检记录
        </button>
        <button className={activeTab === 'archive' ? 'tab active' : 'tab'} onClick={() => setActiveTab('archive')}>
          <Database size={16} />运营档案
        </button>
        <button
          className={activeTab === 'consistency' ? 'tab active' : 'tab'}
          onClick={() => {
            setActiveTab('consistency');
            if (consistencyIssues.length === 0) {
              runConsistencyCheck();
            }
          }}
          style={consistencyStats.total > 0 ? { position: 'relative' } : {}}
        >
          <Wrench size={16} />运营一致性
          {consistencyStats.total > 0 && (
            <span className="tabBadge" style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: consistencyStats.critical > 0 ? '#8a2c2c' : '#8a5a2c',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '18px',
              textAlign: 'center'
            }}>
              {consistencyStats.total}
            </span>
          )}
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
                const distStatus = getDistributionStatus(item);
                const pickupStatus = getPickupStatus(item);
                const distTotal = getDistributionTotal(item.distribution);
                const distRemaining = getDistributionRemaining(item);
                const noticeExists = checkPickupNoticeExists(contacts, item.id);
                const relatedNotice = findRelatedPickupNotice(contacts, item.id);
                const typeIcons = { selfPickup: User, communityShare: Users, volunteerSample: Heart, loss: Trash2 };
                return (
                <div key={item.id} className="harvestMiniCard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p className="row" style={{ margin: 0 }}><Wheat size={16} />{item.crop} {item.weight}<span>{item.date}</span></p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`distributionStatusTag ${distStatus.key} ${distStatus.isOverdue ? 'overdue' : ''}`}>
                        {distStatus.isOverdue && <AlertCircle size={12} />}
                        {distStatus.label}
                      </span>
                      {pickupStatus.key !== 'none' && (
                        <span className={`pickupStatusTag ${pickupStatus.key} ${pickupStatus.isOverdue ? 'overdue' : ''}`}>
                          {pickupStatus.key === 'confirmed' ? <CheckCircle2 size={12} /> : pickupStatus.isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {pickupStatus.label}
                          {pickupStatus.key === 'confirmed' && pickupStatus.confirmedAt && ` · ${pickupStatus.confirmedAt.slice(5)}`}
                        </span>
                      )}
                      {relatedNotice && (
                        <span style={{ fontSize: '11px', color: '#2c5f8a', padding: '2px 6px', borderRadius: '4px', background: '#e8f0fa', alignSelf: 'center' }}>
                          <Bell size={10} /> {relatedNotice.date}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.distribution && (
                    <div className="distributionMiniSummary">
                      {DISTRIBUTION_TYPES.map((t) => {
                        const val = item.distribution[t.key];
                        if (!val) return null;
                        const Icon = typeIcons[t.key];
                        return (
                          <span key={t.key} style={{ borderLeft: `3px solid ${t.color}`, paddingLeft: '6px' }}>
                            <Icon size={11} /> {t.label}: {val}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {!item.distribution && distTotal === 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: distStatus.isOverdue ? '#8b3f23' : '#8a6a2c' }}>
                      {distStatus.isOverdue ? '⚠️ 已超期未分配' : '⏳ 待登记去向'}
                      {distRemaining > 0 && ` · 剩余 ${formatWeight(distRemaining)}`}
                    </p>
                  )}
                  {pickupStatus.key === 'pending' && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: pickupStatus.isOverdue ? '#8b3f23' : '#2c5f8a' }}>
                      {pickupStatus.isOverdue
                        ? `⚠️ 自取超期${pickupStatus.daysSince - PICKUP_CONFIRM_OVERDUE_DAYS}天未取`
                        : '⏳ 待认养人取菜'
                      }
                      {item.distribution?.selfPickup && ` · ${item.distribution.selfPickup}`}
                    </p>
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
                    {pickupStatus.key === 'pending' && (
                      <>
                        {!noticeExists && (
                          <button
                            type="button"
                            className="miniBtn"
                            style={{ background: '#e8f0fa', color: '#2c5f8a', borderColor: '#a0c0e0' }}
                            onClick={() => generatePickupNoticeFromDashboard(item.id)}
                          >
                            <Bell size={12} />发送通知
                          </button>
                        )}
                        <button
                          type="button"
                          className={`miniBtn ${pickupStatus.isOverdue ? 'pickupOverdueBtn' : 'pickupPendingBtn'}`}
                          onClick={() => confirmPickupFromDashboard(item.id)}
                        >
                          <CheckCircle2 size={12} />
                          {pickupStatus.isOverdue ? '标记已取' : '确认取菜'}
                        </button>
                      </>
                    )}
                    <button type="button" className="miniBtn distributionBtn" onClick={() => setDistEditingHarvest(item)}>
                      <Package size={12} />{item.distribution ? '编辑分配' : '登记分配'}
                    </button>
                    <button type="button" className="miniBtn" onClick={() => quickConsumeForHarvest(item.id, `${item.crop} ${item.weight}`, item.bed, item.crop)}>
                      <ArrowUpCircle size={12} />登记追肥/耗材
                    </button>
                  </div>
                </div>
                );
              })}
            </article>
            <article>
              <h2>异常提醒</h2>
              {(() => {
                const harvestWarnings = getAllWarnings(harvests);
                const overdueReviews = getOverdueReviewTasks(tasks, inspections);
                const totalWarnings = warnings.length + harvestWarnings.length + overdueReviews.length;
                return totalWarnings === 0
                  ? <p className="muted">暂无异常</p>
                  : <>
                      {warnings.map((bed) => <p className="row alert" key={bed.id}><TriangleAlert size={16} />{bed.name}<span>{bed.warning}</span></p>)}
                      {harvestWarnings.map((w) => (
                        <p className={`row alert ${w.type === 'critical' ? 'critical' : w.type === 'pickupPending' ? 'pickupPendingWarning' : 'harvestWarning'}`} key={w.id}>
                          {w.type === 'critical' ? <AlertCircle size={16} /> : <Clock size={16} />}
                          {w.label}（{w.bed}）
                          <span>{w.message}</span>
                        </p>
                      ))}
                      {overdueReviews.map((w) => (
                        <p className="row alert reviewOverdueWarning" key={w.id}>
                          <AlertCircle size={16} />
                          {w.label}
                          <span>{w.message}</span>
                        </p>
                      ))}
                    </>
              })()}
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
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="workspace bottom">
            <form onSubmit={addHarvest} className="panel">
              <h2>新增采摘记录</h2>
              <select value={harvestForm.bed} onChange={(e) => {
                const bedName = e.target.value;
                const matchedBed = beds.find(b => b.name === bedName);
                const bedCrop = matchedBed && matchedBed.crop && matchedBed.crop !== '待播种'
                  ? matchedBed.crop
                  : harvestForm.crop;
                setHarvestForm({ ...harvestForm, bed: bedName, crop: bedCrop });
              }}>
                <option value="">选择菜畦</option>
                {harvestOptions.map((name) => <option key={name}>{name}</option>)}
              </select>
              <input placeholder="采摘作物" value={harvestForm.crop} onChange={(e) => setHarvestForm({ ...harvestForm, crop: e.target.value })} />
              <input placeholder="重量" value={harvestForm.weight} onChange={(e) => setHarvestForm({ ...harvestForm, weight: e.target.value })} />
              <input type="date" value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} />
              <input placeholder="备注" value={harvestForm.note} onChange={(e) => setHarvestForm({ ...harvestForm, note: e.target.value })} />
              {renderConsumptionSuggestions({ type: 'harvest' }, harvestConsumptions, setHarvestConsumptions)}
              <button>保存采摘</button>
            </form>
            <div className="panel">
              <h2>待处理事项</h2>
              {tasks.map((task) => {
                const isExpanded = expandedTaskIds.includes(task.id);
                const currentConsumptions = getTaskConsumptions(task.id);
                return (
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
                  <div className="taskActions">
                    <button type="button" className="miniBtn" onClick={() => toggleTaskExpand(task.id)}>
                      <ArrowUpCircle size={12} />{isExpanded ? '收起消耗' : '登记消耗'}
                    </button>
                    <button type="button" className="miniBtn" onClick={() => quickConsumeForTask(task.id, task.title)}>
                      <History size={12} />流水登记
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="taskConsumptionForm">
                      {renderConsumptionSuggestions(
                        { type: 'task' },
                        currentConsumptions,
                        (val) => setTaskConsumptionsById(task.id, val)
                      )}
                      {currentConsumptions.length > 0 && (
                        <button
                          type="button"
                          className="saveConsumptionBtn"
                          onClick={() => saveTaskConsumptions(task.id, task.title)}
                        >
                          <CheckCircle2 size={14} />确认登记消耗
                        </button>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
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
              {renderConsumptionSuggestions({ type: 'plant' }, plantConsumptions, setPlantConsumptions)}
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

      {activeTab === 'rotation' && (
        <CropRotationPanel
          beds={beds}
          plants={plants}
          harvests={harvests}
          bedPlacement={bedPlacement}
          onAddPlant={addPlantFromRotation}
          onAddTask={addTaskFromRotation}
          onSwitchToPlants={() => setActiveTab('plants')}
          onSwitchToTasks={() => setActiveTab('dashboard')}
        />
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
            <article>
              <h2>本月消耗</h2>
              <p className="statNumber" style={{ color: '#8a5a2c' }}>{inventoryStats.monthlyConsume}<span>次</span></p>
            </article>
            <article>
              <h2>累计消耗</h2>
              <p className="statNumber" style={{ color: '#8a5a2c' }}>{inventoryStats.totalConsumeQty}<span>件</span></p>
            </article>
            <article>
              <h2>涉及菜畦</h2>
              <p className="statNumber" style={{ color: '#2c5f8a' }}>{inventoryStats.consumeBedCount}<span>块</span></p>
            </article>
          </section>

          {inventoryStats.topConsumedList.length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#8a5a2c' }}><ArrowUpCircle size={18} />消耗排行</h2>
              <div className="warningCards">
                {inventoryStats.topConsumedList.map((item, idx) => (
                  <div key={item.name} className="warningCard" style={{ background: '#f8faf5', borderColor: '#dfe7d7' }}>
                    <div className="warningInfo">
                      <strong style={{ color: '#3c4d38' }}>{item.name}</strong>
                      <span className={`categoryTag ${item.category}`}>{item.category}</span>
                    </div>
                    <div className="warningStock">
                      <span className="warningCurrent" style={{ color: '#8a5a2c' }}>{item.total}<small style={{ fontSize: '13px', color: '#71806a', fontWeight: 'normal' }}>{item.unit}</small></span>
                      <span className="warningThreshold" style={{ color: '#8a7a4e' }}>累计消耗</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {Object.keys(consumptionsByBedId).length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#3c4d38' }}><MapPin size={18} />按菜畦归因消耗</h2>
              <div className="consumptionBreakdownGrid">
                {Object.entries(consumptionsByBedId).map(([bedId, ts]) => {
                  const bed = beds.find(b => b.id === bedId);
                  if (!bed) return null;
                  const summary = {};
                  ts.forEach(t => {
                    if (!summary[t.materialId]) {
                      summary[t.materialId] = { name: t.materialName, total: 0, unit: t.unit };
                    }
                    summary[t.materialId].total += t.quantity;
                  });
                  return (
                    <div key={bedId} className="consumptionBreakdownCard">
                      <div className="consumptionBreakdownHeader">
                        <strong>{bed.name}</strong>
                        <span style={{ fontSize: '12px', color: '#5f7648' }}>{bed.crop}</span>
                      </div>
                      <div className="consumptionBreakdownItems">
                        {Object.values(summary).map(s => (
                          <span key={s.name} className="miniConsumeTag">
                            {s.name} -{s.total}{s.unit}
                          </span>
                        ))}
                      </div>
                      {ts.length > 0 && (
                        <div className="consumptionBreakdownAttribution">
                          {(() => {
                            const byType = {};
                            ts.forEach(t => {
                              const key = t.relatedType || 'unassigned';
                              if (!byType[key]) byType[key] = [];
                              byType[key].push(t);
                            });
                            return Object.entries(byType).map(([type, items]) => (
                              <span key={type} className="attributionTag">
                                {RELATED_TYPE_LABELS[type] || '未关联'} ×{items.length}
                              </span>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {Object.keys(consumptionsByCrop).length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#3c4d38' }}><Wheat size={18} />按作物归因消耗</h2>
              <div className="consumptionBreakdownGrid">
                {Object.entries(consumptionsByCrop).map(([crop, ts]) => {
                  const summary = {};
                  ts.forEach(t => {
                    if (!summary[t.materialId]) {
                      summary[t.materialId] = { name: t.materialName, total: 0, unit: t.unit };
                    }
                    summary[t.materialId].total += t.quantity;
                  });
                  return (
                    <div key={crop} className="consumptionBreakdownCard">
                      <div className="consumptionBreakdownHeader">
                        <strong>{crop}</strong>
                        <span style={{ fontSize: '12px', color: '#71806a' }}>{ts.length}条消耗</span>
                      </div>
                      <div className="consumptionBreakdownItems">
                        {Object.values(summary).map(s => (
                          <span key={s.name} className="miniConsumeTag">
                            {s.name} -{s.total}{s.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {Object.keys(inventoryStats.consumeByRelatedType).length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#3c4d38' }}><History size={18} />按任务类型归因</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(inventoryStats.consumeByRelatedType).map(([type, qty]) => (
                  <span key={type} className="consumptionTypeStat">
                    {RELATED_TYPE_LABELS[type] || '未关联'}
                    <strong>{qty}</strong>
                  </span>
                ))}
              </div>
            </section>
          )}

          {Object.keys(consumptionsByTaskId).length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#3c4d38' }}><Clock size={18} />按任务明细归因消耗</h2>
              <div className="consumptionBreakdownGrid">
                {Object.entries(consumptionsByTaskId).map(([taskId, ts]) => {
                  const task = tasks.find(t => t.id === taskId);
                  if (!task) return null;
                  const summary = {};
                  ts.forEach(t => {
                    if (!summary[t.materialId]) {
                      summary[t.materialId] = { name: t.materialName, total: 0, unit: t.unit };
                    }
                    summary[t.materialId].total += t.quantity;
                  });
                  return (
                    <div key={taskId} className="consumptionBreakdownCard">
                      <div className="consumptionBreakdownHeader">
                        <strong style={{ fontSize: '14px' }}>{task.title}</strong>
                        <span style={{ fontSize: '12px', color: task.done ? '#71806a' : '#8a6a2c' }}>
                          {task.done ? '已完成' : '待处理'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#71806a' }}>
                        负责人：{task.owner} · 截止：{task.due}
                      </p>
                      <div className="consumptionBreakdownItems">
                        {Object.values(summary).map(s => (
                          <span key={s.name} className="miniConsumeTag">
                            {s.name} -{s.total}{s.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {Object.keys(consumptionsByHarvestId).length > 0 && (
            <section className="inventoryWarning" style={{ borderColor: '#dfe7d7', background: '#fff' }}>
              <h2 style={{ color: '#3c4d38' }}><Wheat size={18} />按采收记录归因消耗</h2>
              <div className="consumptionBreakdownGrid">
                {Object.entries(consumptionsByHarvestId).map(([harvestId, ts]) => {
                  const harvest = harvests.find(h => h.id === harvestId);
                  if (!harvest) return null;
                  const summary = {};
                  ts.forEach(t => {
                    if (!summary[t.materialId]) {
                      summary[t.materialId] = { name: t.materialName, total: 0, unit: t.unit };
                    }
                    summary[t.materialId].total += t.quantity;
                  });
                  return (
                    <div key={harvestId} className="consumptionBreakdownCard">
                      <div className="consumptionBreakdownHeader">
                        <strong style={{ fontSize: '14px' }}>{harvest.crop} {harvest.weight}</strong>
                        <span style={{ fontSize: '12px', color: '#71806a' }}>{harvest.date}</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#71806a' }}>
                        菜畦：{harvest.bed}
                      </p>
                      <div className="consumptionBreakdownItems">
                        {Object.values(summary).map(s => (
                          <span key={s.name} className="miniConsumeTag">
                            {s.name} -{s.total}{s.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
                      <option value="plant">种植计划</option>
                      <option value="inspection">巡检处理</option>
                      <option value="bed">菜畦直接消耗</option>
                    </select>
                    {transactionForm.relatedType && (
                      <select value={transactionForm.relatedId} onChange={(e) => selectTransactionRelated(transactionForm.relatedType, e.target.value)}>
                        <option value="">选择{
                          transactionForm.relatedType === 'task' ? '维护任务' :
                          transactionForm.relatedType === 'harvest' ? '采摘记录' :
                          transactionForm.relatedType === 'plant' ? '种植计划' :
                          transactionForm.relatedType === 'inspection' ? '巡检记录' :
                          '菜畦'
                        }</option>
                        {(transactionRelatedOptions[transactionForm.relatedType] || []).map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="grid2">
                      <select value={transactionForm.bedName ? beds.find(b => b.name === transactionForm.bedName)?.id || '' : ''} onChange={(e) => selectTransactionBed(e.target.value)}>
                        <option value="">归因菜畦（可选）</option>
                        {consumeTransactionBedOptions.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <input placeholder="归因作物（可选）" value={transactionForm.crop} onChange={(e) => setTransactionForm({ ...transactionForm, crop: e.target.value })} />
                    </div>
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
                <div className="toolbarActions" style={{ flexWrap: 'wrap' }}>
                  <select className="filterSelect" value={transactionTypeFilter} onChange={(e) => setTransactionTypeFilter(e.target.value)}>
                    <option value="">全部类型</option>
                    <option value="inbound">入库</option>
                    <option value="consume">消耗</option>
                  </select>
                  <select className="filterSelect" value={transactionMaterialFilter} onChange={(e) => setTransactionMaterialFilter(e.target.value)}>
                    <option value="">全部物资</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.category}）</option>)}
                  </select>
                  <select className="filterSelect" value={transactionRelatedTypeFilter} onChange={(e) => setTransactionRelatedTypeFilter(e.target.value)}>
                    <option value="">全部关联</option>
                    <option value="task">维护任务</option>
                    <option value="harvest">采摘记录</option>
                    <option value="plant">种植计划</option>
                    <option value="inspection">巡检处理</option>
                    <option value="bed">菜畦直接</option>
                  </select>
                  <select className="filterSelect" value={transactionBedFilter} onChange={(e) => setTransactionBedFilter(e.target.value)}>
                    <option value="">全部菜畦</option>
                    {transactionBedOptions.map((name) => <option key={name}>{name}</option>)}
                  </select>
                  <select className="filterSelect" value={transactionCropFilter} onChange={(e) => setTransactionCropFilter(e.target.value)}>
                    <option value="">全部作物</option>
                    {transactionCropOptions.map((name) => <option key={name}>{name}</option>)}
                  </select>
                  {(transactionTypeFilter || transactionMaterialFilter || transactionBedFilter || transactionCropFilter || transactionRelatedTypeFilter) && (
                    <button className="clearBtn" onClick={() => { setTransactionTypeFilter(''); setTransactionMaterialFilter(''); setTransactionBedFilter(''); setTransactionCropFilter(''); setTransactionRelatedTypeFilter(''); }}>清除筛选</button>
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
                              {t.relatedType === 'task' ? '🔧' : t.relatedType === 'harvest' ? '🌾' : t.relatedType === 'plant' ? '🌱' : t.relatedType === 'inspection' ? '🐛' : '📍'}
                              {RELATED_TYPE_LABELS[t.relatedType] || ''}：{t.relatedName}
                            </span>
                          )}
                        </div>
                        {(t.bedName || t.crop) && (
                          <div className="transactionBedCrop">
                            {t.bedName && <span className="transactionBedTag"><MapPin size={10} />{t.bedName}</span>}
                            {t.crop && <span className="transactionCropTag"><Wheat size={10} />{t.crop}</span>}
                          </div>
                        )}
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

      {activeTab === 'distribution' && (
        <DistributionTab
          harvests={harvests}
          setHarvests={setHarvests}
          harvestOptions={harvestOptions}
          harvestForm={harvestForm}
          setHarvestForm={setHarvestForm}
          addHarvest={addHarvest}
          beds={beds}
          contacts={contacts}
          setContacts={setContacts}
          materials={materials}
          harvestConsumptions={harvestConsumptions}
          setHarvestConsumptions={setHarvestConsumptions}
          renderConsumptionSuggestions={renderConsumptionSuggestions}
        />
      )}

      {activeTab === 'floorPlan' && (
        <FloorPlanTab
          beds={beds}
          setBeds={setBeds}
          bedPlacement={bedPlacement}
          setBedPlacement={setBedPlacement}
          plants={plants}
          contacts={contacts}
          harvests={harvests}
          transactions={transactions}
          tasks={tasks}
          inspections={inspections}
          materials={materials}
          onAddInspection={(bed) => {
            if (bed && bed.id) {
              setPrefillBedId(bed.id);
            }
            setActiveTab('inspection');
          }}
          onCreatePlantFromBed={handleCreatePlantFromBed}
          onCreateTaskFromBed={handleCreateTaskFromBed}
        />
      )}

      {activeTab === 'inspection' && (
        <InspectionTab
          inspections={inspections}
          setInspections={setInspections}
          beds={beds}
          tasks={tasks}
          setTasks={setTasks}
          setBeds={setBeds}
          prefillBedId={prefillBedId}
          onPrefillConsumed={() => setPrefillBedId('')}
          materials={materials}
          transactions={transactions}
          setTransactions={setTransactions}
        />
      )}

      {activeTab === 'archive' && (
        <section className="archiveTabWrap">
          <ArchivePanel
            currentState={{
              beds, harvests, tasks, schedules, contacts,
              plants, materials, transactions, inspections, bedPlacement
            }}
            onImportComplete={(merged) => {
              setBeds(merged.beds);
              setHarvests(merged.harvests);
              setTasks(merged.tasks);
              setSchedules(merged.schedules);
              setContacts(merged.contacts);
              setPlants(merged.plants);
              setMaterials(merged.materials);
              setTransactions(merged.transactions);
              setInspections(merged.inspections);
              setBedPlacement(merged.bedPlacement);
            }}
          />
        </section>
      )}

      {activeTab === 'consistency' && (
        <ConsistencyCheckCenter
          issues={consistencyIssues}
          onRefresh={runConsistencyCheck}
          onFixIssue={handleFixIssue}
          onBatchFix={handleBatchFix}
          isChecking={isCheckingConsistency}
          lastChecked={lastConsistencyCheck}
          beds={beds}
          tasks={tasks}
          inspections={inspections}
          harvests={harvests}
          plants={plants}
          transactions={transactions}
          contacts={contacts}
        />
      )}

      {distEditingHarvest && (
        <DistributionModal
          harvest={distEditingHarvest}
          onClose={() => setDistEditingHarvest(null)}
          onSave={(dist) => saveDistributionFromDashboard(distEditingHarvest.id, dist)}
          onConfirmPickup={() => {
            confirmPickupFromDashboard(distEditingHarvest.id);
            setDistEditingHarvest(null);
          }}
          beds={beds}
          contacts={contacts}
          setContacts={setContacts}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
