export const FIXTURE_CONSTANTS = {
  FIXED_DATE: '2025-06-15',
  FIXED_DATETIME: '2025-06-15T10:00:00.000Z',
  BED_ID_A01: 'bed-fixture-a01-00000000001',
  BED_ID_B02: 'bed-fixture-b02-00000000002',
  BED_ID_C03: 'bed-fixture-c03-00000000003',
  HARVEST_ID_001: 'harvest-fixture-001-000000001',
  HARVEST_ID_002: 'harvest-fixture-002-000000002',
  HARVEST_ID_003: 'harvest-fixture-003-000000003',
  TASK_ID_001: 'task-fixture-001-00000000001',
  TASK_ID_002: 'task-fixture-002-00000000002',
  TASK_ID_003: 'task-fixture-003-00000000003',
  INSP_ID_001: 'insp-fixture-001-00000000001',
  INSP_ID_002: 'insp-fixture-002-00000000002',
  TX_ID_001: 'tx-fixture-001-0000000000001',
  TX_ID_002: 'tx-fixture-002-0000000000002',
  TX_ID_003: 'tx-fixture-003-0000000000003',
  TX_ID_004: 'tx-fixture-004-0000000000004',
  CONTACT_ID_001: 'contact-fixture-001-0000001',
  CONTACT_ID_002: 'contact-fixture-002-0000002',
  MATERIAL_ID_001: 'material-fixture-001-00001',
  MATERIAL_ID_002: 'material-fixture-002-00002',
  PLANT_ID_001: 'plant-fixture-001-00000001',
  SCHEDULE_ID_001: 'schedule-fixture-001-00001'
};

const {
  FIXED_DATETIME,
  BED_ID_A01, BED_ID_B02, BED_ID_C03,
  HARVEST_ID_001, HARVEST_ID_002, HARVEST_ID_003,
  TASK_ID_001, TASK_ID_002, TASK_ID_003,
  INSP_ID_001, INSP_ID_002,
  TX_ID_001, TX_ID_002, TX_ID_003, TX_ID_004,
  CONTACT_ID_001, CONTACT_ID_002,
  MATERIAL_ID_001, MATERIAL_ID_002,
  PLANT_ID_001, SCHEDULE_ID_001
} = FIXTURE_CONSTANTS;

export const createV0State = () => ({
  beds: [
    { id: BED_ID_A01, name: 'A01番茄畦', crop: '番茄', adopter: '李阿姨', phone: '13800138000', area: '6㎡', status: '认养中', nextWater: '2025-06-16' },
    { id: BED_ID_B02, name: 'B02生菜畦', crop: '生菜', adopter: '王大爷', phone: '13900139000', area: '5㎡', status: '认养中', nextWater: '2025-06-15' },
    { id: BED_ID_C03, name: 'C03轮作空畦', crop: '待播种', adopter: '', phone: '', area: '8㎡', status: '空闲', nextWater: '2025-06-20' }
  ],
  harvests: [
    { id: HARVEST_ID_001, bed: 'A01番茄畦', crop: '番茄', weight: '2.5kg', date: '2025-06-12', note: '甜度记录8.2' },
    { id: HARVEST_ID_002, bed: 'B02生菜畦', crop: '生菜', weight: '800g', date: '2025-06-10', note: '' }
  ],
  tasks: [
    { id: TASK_ID_001, title: '检查A区滴灌头', owner: '值班志愿者', due: '2025-06-16', done: false },
    { id: TASK_ID_002, title: 'C03补土并翻松', owner: '园艺管家', due: '2025-06-18', done: false }
  ],
  inspections: [
    { id: INSP_ID_001, bedName: 'A01番茄畦', abnormalType: 'pest', treatmentResult: 'needs_followup', note: '发现蚜虫需喷洒苦参碱', photos: [], inspector: '张工', date: '2025-06-13', time: '10:00', followupDate: '2025-06-18', followupOwner: '李阿姨' },
    { id: INSP_ID_002, bedName: 'B02生菜畦', abnormalType: 'water_shortage', treatmentResult: 'resolved', note: '已临时浇水', photos: [], inspector: '李工', date: '2025-06-11', time: '15:30', followupDate: null, followupOwner: null }
  ],
  transactions: [
    { id: TX_ID_001, materialId: MATERIAL_ID_001, materialName: '番茄种子', category: '种子', type: 'consume', quantity: 2, unit: '包', date: '2025-06-01' },
    { id: TX_ID_002, materialId: MATERIAL_ID_002, materialName: '有机堆肥', category: '肥料', type: 'consume', quantity: 3, unit: '袋', date: '2025-06-05' }
  ],
  contacts: [
    { id: CONTACT_ID_001, bedId: BED_ID_A01, bedName: 'A01番茄畦', adopter: '李阿姨', phone: '13800138000', type: '取菜通知', date: '2025-06-12', time: '16:00', content: '番茄成熟通知' }
  ],
  plants: [
    { id: PLANT_ID_001, bedId: BED_ID_A01, bedName: 'A01番茄畦', crop: '番茄', sowDate: '2025-04-20', harvestDate: '2025-07-10', growthStage: '结果期', note: '' }
  ],
  schedules: [
    { id: SCHEDULE_ID_001, date: '2025-06-15', weekday: '周日', volunteer: '赵小云', phone: '13600007777', duty: '浇水', time: '08:00-10:00', note: '' }
  ],
  materials: [
    { id: MATERIAL_ID_001, name: '番茄种子', category: '种子', unit: '包', lowStockThreshold: 3, note: '进口品种' },
    { id: MATERIAL_ID_002, name: '有机堆肥', category: '肥料', unit: '袋', lowStockThreshold: 5, note: '5kg装' }
  ],
  bedPlacement: {}
});

export const createV1State = () => {
  const v0 = createV0State();
  return {
    ...v0,
    inspections: v0.inspections.map(i => ({
      ...i,
      syncStatus: i.id === INSP_ID_002 ? 'synced' : 'pending',
      retryCount: 0,
      followupTaskId: null,
      reviewCompletedAt: null,
      reviewCompletedBy: null,
      createdAt: `${i.date}T${i.time}:00.000Z`
    })),
    tasks: v0.tasks.map(t => ({
      ...t,
      taskType: 'general',
      relatedInspectionId: null,
      completedAt: null,
      createdAt: FIXED_DATETIME
    })),
    beds: v0.beds.map(b => ({ ...b, warning: '' })),
    transactions: v0.transactions.map(t => ({
      ...t,
      relatedType: t.id === TX_ID_001 ? 'task' : '',
      relatedId: t.id === TX_ID_001 ? TASK_ID_001 : '',
      relatedName: '',
      bedName: '',
      crop: '',
      materialDeleted: false
    }))
  };
};

export const createV2State = () => {
  const v1 = createV1State();
  return {
    ...v1,
    tasks: [
      ...v1.tasks,
      {
        id: TASK_ID_003,
        title: 'A01番茄畦 - 虫害跟进',
        owner: '值班志愿者',
        due: '2025-06-16',
        done: false,
        relatedInspectionId: INSP_ID_001,
        taskType: 'inspection_followup',
        completedAt: null,
        createdAt: FIXED_DATETIME
      }
    ],
    transactions: v1.transactions.map(t => ({
      ...t,
      relatedType: t.id === TX_ID_001 ? 'task' : t.id === TX_ID_002 ? 'inspection' : '',
      relatedId: t.id === TX_ID_001 ? TASK_ID_001 : t.id === TX_ID_002 ? INSP_ID_002 : '',
      relatedName: t.id === TX_ID_001 ? '检查A区滴灌头' : t.id === TX_ID_002 ? 'B02生菜畦-缺水' : '',
      bedName: t.id === TX_ID_001 ? 'A01番茄畦' : t.id === TX_ID_002 ? 'B02生菜畦' : '',
      crop: t.id === TX_ID_001 ? '番茄' : t.id === TX_ID_002 ? '生菜' : ''
    }))
  };
};

export const createV3State = () => {
  const v2 = createV2State();
  return {
    ...v2,
    harvests: v2.harvests.map(h => ({
      ...h,
      distribution: h.id === HARVEST_ID_001 ? {
        selfPickup: '1.5kg',
        communityShare: '800g',
        loss: '200g',
        distributionUpdatedAt: '2025-06-12'
      } : null,
      archived: false
    })),
    contacts: v2.contacts.map(c => ({
      ...c,
      pickupStatus: c.type === '取菜通知' ? 'pending' : undefined,
      relatedHarvestId: c.id === CONTACT_ID_001 ? HARVEST_ID_001 : null,
      expectedPickupDate: c.id === CONTACT_ID_001 ? '2025-06-14' : null
    })),
    transactions: [
      ...v2.transactions,
      {
        id: TX_ID_003,
        materialId: MATERIAL_ID_002,
        materialName: '有机堆肥',
        category: '肥料',
        type: 'consume',
        quantity: 1,
        unit: '袋',
        date: '2025-06-12',
        relatedType: 'harvest',
        relatedId: HARVEST_ID_001,
        relatedName: '番茄 2.5kg',
        bedName: 'A01番茄畦',
        crop: '番茄',
        materialDeleted: false
      },
      {
        id: TX_ID_004,
        materialId: MATERIAL_ID_001,
        materialName: '番茄种子',
        category: '种子',
        type: 'consume',
        quantity: 1,
        unit: '包',
        date: '2025-04-20',
        relatedType: 'plant',
        relatedId: PLANT_ID_001,
        relatedName: 'A01番茄畦-番茄',
        bedName: 'A01番茄畦',
        crop: '番茄',
        materialDeleted: false
      }
    ]
  };
};

export const buildLocalStorageMock = (dataVersion, state) => {
  const store = {
    'zfl-1-data-version': String(dataVersion)
  };
  if (state.beds) store['zfl-1-beds'] = JSON.stringify(state.beds);
  if (state.harvests) store['zfl-1-harvests'] = JSON.stringify(state.harvests);
  if (state.tasks) store['zfl-1-tasks'] = JSON.stringify(state.tasks);
  if (state.inspections) store['zfl-1-inspections'] = JSON.stringify(state.inspections);
  if (state.transactions) store['zfl-1-transactions'] = JSON.stringify(state.transactions);
  if (state.contacts) store['zfl-1-contacts'] = JSON.stringify(state.contacts);
  if (state.plants) store['zfl-1-plants'] = JSON.stringify(state.plants);
  if (state.schedules) store['zfl-1-schedules'] = JSON.stringify(state.schedules);
  if (state.materials) store['zfl-1-materials'] = JSON.stringify(state.materials);
  if (state.bedPlacement) store['zfl-1-bedPlacement'] = JSON.stringify(state.bedPlacement);
  return store;
};
