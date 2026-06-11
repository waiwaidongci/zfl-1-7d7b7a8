import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Clock, Droplets, Leaf, MessageCircle, Phone, MapPin, Bell, Plus, Search, Trash2, TriangleAlert, Users, Wheat } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('');
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');
  const [bedForm, setBedForm] = useState({ name: '', crop: '', adopter: '', phone: '', area: '', status: '认养中', nextWater: iso(2), warning: '' });
  const [harvestForm, setHarvestForm] = useState({ bed: '', crop: '', weight: '', date: iso(0), note: '' });
  const [scheduleForm, setScheduleForm] = useState({ date: iso(0), weekday: '', volunteer: '', phone: '', duty: '浇水', time: '09:00-11:00', note: '' });
  const [contactForm, setContactForm] = useState({ bedId: '', bedName: '', adopter: '', phone: '', type: '电话', date: iso(0), time: '09:00', content: '', note: '' });

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
        <button className={activeTab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setActiveTab('contacts')}>
          <MessageCircle size={16} />联系记录
        </button>
        <button className={activeTab === 'schedules' ? 'tab active' : 'tab'} onClick={() => setActiveTab('schedules')}>
          <Users size={16} />志愿者排班
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
                <label className="task" key={task.id}>
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                  <span className={task.done ? 'done' : ''}>{task.title}</span>
                  <small>{task.owner} · {task.due}</small>
                </label>
              ))}
            </div>
          </section>
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
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
