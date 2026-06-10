import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Droplets, Leaf, Plus, Search, TriangleAlert, Wheat } from 'lucide-react';
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
  const [beds, setBeds] = useStoredState('zfl-1-beds', seedBeds);
  const [harvests, setHarvests] = useStoredState('zfl-1-harvests', seedHarvests);
  const [tasks, setTasks] = useStoredState('zfl-1-tasks', seedTasks);
  const [query, setQuery] = useState('');
  const [bedForm, setBedForm] = useState({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '' });
  const [harvestForm, setHarvestForm] = useState({ bed: '', crop: '', weight: '', date: iso(0), note: '' });

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

      <section className="dashboard">
        <article>
          <h2>本周浇水</h2>
          {weekWater.map((bed) => <button className="listButton" key={bed.id} onClick={() => advanceWater(bed.id)}>{bed.name}<span>{bed.nextWater}</span></button>)}
        </article>
        <article>
          <h2>最近采摘</h2>
          {harvests.slice(0, 4).map((item) => <p className="row" key={item.id}><Wheat size={16} />{item.crop}{item.weight}<span>{item.date}</span></p>)}
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
            <label className="task" key={task.id}>
              <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
              <span className={task.done ? 'done' : ''}>{task.title}</span>
              <small>{task.owner} · {task.due}</small>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
