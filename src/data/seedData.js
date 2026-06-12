const today = new Date();
export const iso = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const seedBeds = [
  { id: crypto.randomUUID(), name: 'A03薄荷香草畦', crop: '薄荷/迷迭香', adopter: '林小满', phone: '13800001234', area: '6㎡', status: '认养中', nextWater: iso(1), warning: '水箱余量偏低' },
  { id: crypto.randomUUID(), name: 'B07番茄试验畦', crop: '樱桃番茄', adopter: '周原', phone: '13900004567', area: '8㎡', status: '认养中', nextWater: iso(3), warning: '' },
  { id: crypto.randomUUID(), name: 'C02轮作空畦', crop: '待播种', adopter: '', phone: '', area: '5㎡', status: '空闲', nextWater: iso(6), warning: '等待补土' }
];

export const seedHarvests = [
  { id: crypto.randomUUID(), bed: 'A03薄荷香草畦', crop: '薄荷', weight: '1.4kg', date: iso(-1), note: '已通知认养人自取', distribution: null },
  { id: crypto.randomUUID(), bed: 'B07番茄试验畦', crop: '樱桃番茄', weight: '2.1kg', date: iso(-3), note: '甜度记录7.8', distribution: null }
];

export const seedTasks = [
  { id: crypto.randomUUID(), title: '检查A区滴灌头', owner: '值班志愿者', due: iso(1), done: false },
  { id: crypto.randomUUID(), title: 'C02补土并翻松', owner: '园艺管家', due: iso(4), done: false }
];

export const seedSchedules = [
  { id: crypto.randomUUID(), date: iso(0), weekday: '周四', volunteer: '李雨晴', phone: '13800007777', duty: '浇水', time: '09:00-11:00', note: '重点关注A区薄荷' },
  { id: crypto.randomUUID(), date: iso(1), weekday: '周五', volunteer: '张明远', phone: '13900008888', duty: '巡检', time: '16:00-18:00', note: '检查虫害情况' },
  { id: crypto.randomUUID(), date: iso(2), weekday: '周六', volunteer: '王建国', phone: '13700009999', duty: '补土', time: '08:00-10:00', note: 'C02区需要补土约5袋' },
  { id: crypto.randomUUID(), date: iso(3), weekday: '周日', volunteer: '刘芳', phone: '13600001111', duty: '浇水', time: '09:00-11:00', note: '' },
  { id: crypto.randomUUID(), date: iso(5), weekday: '周二', volunteer: '陈志豪', phone: '13500002222', duty: '巡检', time: '17:00-19:00', note: '检查滴灌系统' }
];

export const seedContacts = [
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', adopter: '林小满', phone: '13800001234', type: '电话', date: iso(-2), time: '15:30', content: '确认本周薄荷长势良好，邀请周末可采摘约300g，通知认养人周末自取', note: '已确认周六上午自取' },
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', adopter: '林小满', phone: '13800001234', type: '微信', date: iso(-5), time: '09:15', content: '发送薄荷生长照片，回复很满意', note: '' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', phone: '13900004567', type: '现场沟通', date: iso(-1), time: '10:00', content: '认养人来菜园参观，介绍番茄养护要点', note: '赠送番茄苗2株' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', adopter: '周原', phone: '13900004567', type: '取菜通知', date: iso(-7), time: '16:45', content: '樱桃番茄成熟约500g，通知自取', note: '次日下午已取' }
];

export const seedPlants = [
  { id: crypto.randomUUID(), bedId: seedBeds[0].id, bedName: 'A03薄荷香草畦', crop: '薄荷', sowDate: iso(-30), harvestDate: iso(10), growthStage: '生长期', note: '薄荷长势良好，注意浇水' },
  { id: crypto.randomUUID(), bedId: seedBeds[1].id, bedName: 'B07番茄试验畦', crop: '樱桃番茄', sowDate: iso(-45), harvestDate: iso(20), growthStage: '结果期', note: '已开始挂果，注意追肥' }
];

export const seedMaterials = [
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

export const seedTransactions = [
  { id: crypto.randomUUID(), materialId: seedMaterials[0].id, materialName: '薄荷种子', category: '种子', type: 'inbound', quantity: 20, unit: '包', date: iso(-15), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[1].id, materialName: '樱桃番茄种子', category: '种子', type: 'inbound', quantity: 10, unit: '包', date: iso(-12), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[2].id, materialName: '通用营养土', category: '营养土', type: 'inbound', quantity: 30, unit: '袋', date: iso(-10), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[2].id, materialName: '通用营养土', category: '营养土', type: 'consume', quantity: 5, unit: '袋', date: iso(-3), relatedType: 'task', relatedId: seedTasks[1].id, relatedName: 'C02补土并翻松', bedName: 'C02轮作空畦', crop: '', note: 'C02补土5袋' },
  { id: crypto.randomUUID(), materialId: seedMaterials[3].id, materialName: '有机堆肥', category: '肥料', type: 'inbound', quantity: 15, unit: '袋', date: iso(-8), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[4].id, materialName: '水溶肥', category: '肥料', type: 'inbound', quantity: 6, unit: '瓶', date: iso(-7), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[5].id, materialName: '修枝剪', category: '工具', type: 'inbound', quantity: 4, unit: '把', date: iso(-5), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[6].id, materialName: '浇水壶', category: '工具', type: 'inbound', quantity: 5, unit: '把', date: iso(-5), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[7].id, materialName: '绑藤绳', category: '耗材', type: 'inbound', quantity: 10, unit: '卷', date: iso(-6), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[8].id, materialName: '防虫网', category: '耗材', type: 'inbound', quantity: 8, unit: '张', date: iso(-6), relatedType: '', relatedId: '', relatedName: '', bedName: '', crop: '', note: '采购入库' },
  { id: crypto.randomUUID(), materialId: seedMaterials[1].id, materialName: '樱桃番茄种子', category: '种子', type: 'consume', quantity: 2, unit: '包', date: iso(-2), relatedType: 'task', relatedId: seedTasks[0].id, relatedName: '检查A区滴灌头', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: 'B07播种用' },
  { id: crypto.randomUUID(), materialId: seedMaterials[3].id, materialName: '有机堆肥', category: '肥料', type: 'consume', quantity: 3, unit: '袋', date: iso(-1), relatedType: 'harvest', relatedId: seedHarvests[1].id, relatedName: '樱桃番茄 2.1kg', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: '采摘后追肥' },
  { id: crypto.randomUUID(), materialId: seedMaterials[0].id, materialName: '薄荷种子', category: '种子', type: 'consume', quantity: 1, unit: '包', date: iso(-30), relatedType: 'plant', relatedId: seedPlants[0].id, relatedName: 'A03薄荷香草畦-薄荷', bedName: 'A03薄荷香草畦', crop: '薄荷', note: 'A03薄荷播种' },
  { id: crypto.randomUUID(), materialId: seedMaterials[1].id, materialName: '樱桃番茄种子', category: '种子', type: 'consume', quantity: 2, unit: '包', date: iso(-45), relatedType: 'plant', relatedId: seedPlants[1].id, relatedName: 'B07番茄试验畦-樱桃番茄', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: 'B07番茄播种' },
  { id: crypto.randomUUID(), materialId: seedMaterials[2].id, materialName: '通用营养土', category: '营养土', type: 'consume', quantity: 4, unit: '袋', date: iso(-45), relatedType: 'plant', relatedId: seedPlants[1].id, relatedName: 'B07番茄试验畦-樱桃番茄', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: 'B07备土' },
  { id: crypto.randomUUID(), materialId: seedMaterials[8].id, materialName: '防虫网', category: '耗材', type: 'consume', quantity: 1, unit: '张', date: iso(-5), relatedType: 'inspection', relatedId: '', relatedName: 'B07番茄试验畦-虫害处理', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: '虫害防治覆盖防虫网' },
  { id: crypto.randomUUID(), materialId: seedMaterials[7].id, materialName: '绑藤绳', category: '耗材', type: 'consume', quantity: 1, unit: '卷', date: iso(-8), relatedType: 'plant', relatedId: seedPlants[1].id, relatedName: 'B07番茄试验畦-樱桃番茄', bedName: 'B07番茄试验畦', crop: '樱桃番茄', note: '番茄绑藤' },
  { id: crypto.randomUUID(), materialId: seedMaterials[4].id, materialName: '水溶肥', category: '肥料', type: 'consume', quantity: 1, unit: '瓶', date: iso(-10), relatedType: 'bed', relatedId: seedBeds[0].id, relatedName: 'A03薄荷香草畦', bedName: 'A03薄荷香草畦', crop: '薄荷', note: '薄荷叶面追肥' },
  { id: crypto.randomUUID(), materialId: seedMaterials[3].id, materialName: '有机堆肥', category: '肥料', type: 'consume', quantity: 2, unit: '袋', date: iso(-20), relatedType: 'bed', relatedId: seedBeds[0].id, relatedName: 'A03薄荷香草畦', bedName: 'A03薄荷香草畦', crop: '薄荷', note: '薄荷基肥' }
];

export const getWeekday = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[d.getDay()];
};

const SUGGESTION_RULES = {
  plant: [
    { categories: ['种子'], label: '播种用种', defaultQty: 2 },
    { categories: ['营养土'], label: '备土建议', defaultQty: 3 },
    { categories: ['肥料'], label: '基肥建议', defaultQty: 1 }
  ],
  harvest: [
    { categories: ['肥料'], label: '采摘后追肥', defaultQty: 1 }
  ],
  inspection: {
    pest: [{ categories: ['耗材'], label: '虫害防治', defaultQty: 1 }],
    disease: [{ categories: ['肥料', '耗材'], label: '病害处理', defaultQty: 1 }],
    nutrient_deficiency: [{ categories: ['肥料'], label: '缺肥补充', defaultQty: 2 }],
    soil: [{ categories: ['营养土'], label: '土壤改善', defaultQty: 3 }],
    water_shortage: [],
    weed: [],
    equipment: [{ categories: ['工具'], label: '设施维修', defaultQty: 1 }],
    other: []
  },
  task: [
    { categories: ['营养土'], label: '补土用资', defaultQty: 5 },
    { categories: ['肥料'], label: '施肥用资', defaultQty: 2 }
  ]
};

export const getSuggestedMaterials = (materials, context) => {
  const { type, abnormalType } = context;
  const suggestions = [];

  let rules = [];
  if (type === 'inspection') {
    rules = SUGGESTION_RULES.inspection[abnormalType] || [];
  } else {
    rules = SUGGESTION_RULES[type] || [];
  }

  rules.forEach(rule => {
    const matched = materials.filter(m => rule.categories.includes(m.category));
    if (matched.length > 0) {
      suggestions.push({ ...rule, materials: matched });
    }
  });

  return suggestions;
};

export const RELATED_TYPE_LABELS = {
  task: '维护任务',
  harvest: '采摘记录',
  plant: '种植计划',
  inspection: '巡检处理',
  bed: '菜畦直接'
};

export const buildTransactionEntry = (materialId, materials, overrides = {}) => {
  const material = materials.find(m => m.id === materialId);
  if (!material) return null;
  return {
    id: crypto.randomUUID(),
    materialId: material.id,
    materialName: material.name,
    category: material.category,
    type: 'consume',
    quantity: 0,
    unit: material.unit,
    date: iso(0),
    relatedType: '',
    relatedId: '',
    relatedName: '',
    bedName: '',
    crop: '',
    note: '',
    ...overrides
  };
};
