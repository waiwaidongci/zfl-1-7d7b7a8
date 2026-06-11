const today = new Date();
export const iso = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const ABNORMAL_TYPES = [
  { key: 'pest', label: '虫害', severity: 'danger', icon: 'Bug' },
  { key: 'disease', label: '病害', severity: 'danger', icon: 'Germ' },
  { key: 'water_shortage', label: '缺水', severity: 'warning', icon: 'Droplets' },
  { key: 'nutrient_deficiency', label: '缺肥', severity: 'warning', icon: 'Leaf' },
  { key: 'weed', label: '杂草', severity: 'info', icon: 'Sprout' },
  { key: 'equipment', label: '设施故障', severity: 'danger', icon: 'Wrench' },
  { key: 'soil', label: '土壤问题', severity: 'warning', icon: 'Mountain' },
  { key: 'other', label: '其他', severity: 'muted', icon: 'CircleHelp' }
];

export const TREATMENT_RESULTS = [
  { key: 'resolved', label: '已解决', severity: 'success', clearsWarning: true, createsTask: false },
  { key: 'needs_followup', label: '需跟进', severity: 'warning', clearsWarning: false, createsTask: true },
  { key: 'escalated', label: '已上报', severity: 'danger', clearsWarning: false, createsTask: true },
  { key: 'no_action', label: '无需处理', severity: 'muted', clearsWarning: true, createsTask: false }
];

export const getAbnormalTypeInfo = (key) => {
  return ABNORMAL_TYPES.find(t => t.key === key) || ABNORMAL_TYPES[ABNORMAL_TYPES.length - 1];
};

export const getTreatmentResultInfo = (key) => {
  return TREATMENT_RESULTS.find(t => t.key === key) || TREATMENT_RESULTS[TREATMENT_RESULTS.length - 1];
};

export const seedInspections = [
  {
    id: crypto.randomUUID(),
    bedId: null,
    bedName: 'A03薄荷香草畦',
    abnormalType: 'water_shortage',
    treatmentResult: 'needs_followup',
    note: '土壤表面干裂，传感器显示湿度偏低，已临时浇水3L，需持续观察3天',
    photos: [],
    inspector: '李雨晴',
    date: iso(0),
    time: '10:30',
    syncStatus: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    bedId: null,
    bedName: 'B07番茄试验畦',
    abnormalType: 'pest',
    treatmentResult: 'resolved',
    note: '发现少量蚜虫，已喷施有机驱虫剂，情况可控',
    photos: [],
    inspector: '张明远',
    date: iso(-1),
    time: '16:45',
    syncStatus: 'synced',
    retryCount: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const bedPlacementSeed = {};
