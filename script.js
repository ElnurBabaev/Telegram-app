/* =====================================================
   TELEGRAM SCHOOL MINI‑APP (frontend, localStorage) v2.4
   -----------------------------------------------------
   Полный скрипт: мероприятия, достижения, награды, рейтинг,
   админ‑панель, флеш‑анимация карточки.
   =====================================================*/

/***** ГЛОБАЛЬНЫЕ ДАННЫЕ *****/
const urlParams = new URLSearchParams(window.location.search);
const isAdmin   = urlParams.get('admin') === 'true';

let events        = JSON.parse(localStorage.getItem('events')        || '[]');
let registrations = JSON.parse(localStorage.getItem('registrations') || '[]');
let allUsers      = JSON.parse(localStorage.getItem('allUsers')      || '[]');

const savedUserData = JSON.parse(localStorage.getItem('userData') || 'null');
let currentUser     = savedUserData;

const ACHIEVEMENTS = [
  { threshold:50,  title:'Новичок',     emoji:'🥉' },
  { threshold:100, title:'Продвинутый', emoji:'🥈' },
  { threshold:200, title:'Профи',       emoji:'🥇' },
];
let earnedAch = JSON.parse(localStorage.getItem('achievements') || '[]');

const rewards = [
  { id:1, title:'Блокнот',             cost:80  },
  { id:2, title:'Термокружка',         cost:120 },
  { id:3, title:'Футболка с логотипом',cost:200 },
];

/***** ИНИЦИАЛИЗАЦИЯ *****/
if (isAdmin) document.getElementById('admin-add-event').style.display='block';

/***** ТОСТЫ *****/
function showToast(msg,type='success',ms=2200){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.style.display='block';
  const colors={success:'#10b981',error:'#ef4444',warning:'#f59e0b',info:'#2563eb'};
  t.style.backgroundColor = colors[type] || colors.success;
  t.style.color = (type==='warning')?'#000':'#fff';
  clearTimeout(t._hide);
  t._hide=setTimeout(()=>{t.style.display='none';},ms);
}

/***** ПРОФИЛЬ *****/
function saveUserInfo(){
  const fullName=document.getElementById('fullNameInput').value.trim();
  const className=document.getElementById('classInput').value.trim();
  if(!fullName||!className) return showToast('Пожалуйста, заполните все поля!','warning');

  currentUser={fullName, class:className, points:0, receivedRewards:[]};
  localStorage.setItem('userData',JSON.stringify(currentUser));
  document.getElementById('user-info-modal').style.display='none';

  if(!allUsers.some(u=>u.fullName===fullName && u.class===className)){
    allUsers.push(currentUser);
    localStorage.setItem('allUsers',JSON.stringify(allUsers));
  }

  updateProfileInfo(currentUser);
  showSection('events');
}

function updateProfileInfo(user){
  document.getElementById('profileName').textContent   = user.fullName;
  document.getElementById('profileClass').textContent  = user.class;
  document.getElementById('profilePoints').textContent = user.points || 0;

  checkAchievements(user.points||0);
  const achUl=document.getElementById('achievements-list');
  achUl.innerHTML='';
  earnedAch.forEach(th=>{
    const a=ACHIEVEMENTS.find(x=>x.threshold===th);
    const li=document.createElement('li');
    li.className='achievement-badge';
    li.textContent=`${a.emoji} ${a.title} (${th} б.)`;
    achUl.appendChild(li);
  });

  const rewardList=document.getElementById('reward-history');
  rewardList.innerHTML='';
  if(!user.receivedRewards||user.receivedRewards.length===0){
    rewardList.innerHTML='<li>Пока нет наград</li>';
  }else{
    user.receivedRewards.forEach(id=>{
      const r=rewards.find(x=>x.id===id);
      const li=document.createElement('li');
      li.textContent=r?r.title:'—';
      rewardList.appendChild(li);
    });
  }
}

function checkAchievements(points){
  ACHIEVEMENTS.forEach(a=>{
    if(points>=a.threshold && !earnedAch.includes(a.threshold)){
      earnedAch.push(a.threshold);
      localStorage.setItem('achievements',JSON.stringify(earnedAch));
      showToast(`Новая цель достигнута: ${a.emoji} ${a.title}!`);
    }
  });
}

function toggleTheme(){
  const d=document.documentElement;
  const dark = d.classList.toggle('dark');
  localStorage.setItem('theme', dark?'dark':'light');
  document.getElementById('themeToggle').textContent = dark?'☀️':'🌙';
}
/* применять сохранённую тему при загрузке */
document.addEventListener('DOMContentLoaded',()=>{
  if(localStorage.getItem('theme')==='dark'){
    document.documentElement.classList.add('dark');
    document.getElementById('themeToggle').textContent='☀️';
  }
});

function renderClassRating(){
  const body = document.querySelector('#class-table tbody');
  body.innerHTML='';
  /* группировка */
  const byClass = {};
  allUsers.forEach(u=>{
    if(!byClass[u.class]) byClass[u.class]=[];
    byClass[u.class].push(u.points||0);
  });
  /* массив объектов {klass, avg, count} */
  const rows = Object.entries(byClass).map(([klass,arr])=>{
    const avg = Math.round(arr.reduce((s,x)=>s+x,0)/arr.length);
    return {klass, avg, count:arr.length};
  }).sort((a,b)=>b.avg-a.avg);               // по убыванию среднего

  rows.forEach((r,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML =
      `<td>${idx===0?'🏆':idx+1}</td><td>${r.klass}</td><td>${r.avg}</td><td>${r.count}</td>`;
    body.appendChild(tr);
  });
}
/* вызываем её вместе с renderLeaderboard() */
function renderLeaderboard(){
  /* …старый код личного рейтинга… */
  renderClassRating();
}


/***** МЕРОПРИЯТИЯ *****/
function renderEventsList(){
  const list=document.getElementById('events-list');
  list.innerHTML='';
  if(events.length===0){
    list.innerHTML='<p style="margin:0;color:#6b7280">Пока нет активных мероприятий</p>';
    return;
  }
  events.forEach(ev=>{
    const isReg=registrations.some(r=>r.eventId===ev.id && r.fullName===currentUser?.fullName);
    const li=document.createElement('li');
    li.dataset.eventId=ev.id;
    li.innerHTML=`
      <div>
        <h3>${ev.title}</h3>
        <div class="date">📅 ${ev.date}</div>
        <div class="points">+${ev.points} баллов</div>
      </div>
      <div class="card-actions">
        ${isReg ? `<button class="btn" onclick="cancelRegistration(${ev.id})">Отменить</button>`
                 : `<button class="btn" onclick="registerForEvent(${ev.id})">Участвовать</button>`}
        ${isAdmin? `<button class="btn admin-btn" onclick="openAdminView(${ev.id})">Заявки</button>`:''}
      </div>`;
    list.appendChild(li);
  });
}

function registerForEvent(eventId){
  if(!currentUser) return showToast('Сначала введите свои данные!','warning');
  if(registrations.some(r=>r.eventId===eventId && r.fullName===currentUser.fullName))
    return showToast('Вы уже записаны!','warning');

  registrations.push({eventId, fullName:currentUser.fullName, class:currentUser.class, attended:false});
  localStorage.setItem('registrations',JSON.stringify(registrations));

    // ↓  сначала обновляем HTML‑список
    renderEventsList();

    // ↓  теперь берём «свежую» карточку и мигаем
    const card = document.querySelector(`[data-event-id='${eventId}']`);
    if (card) {
      card.classList.add('flash-success');
      card.addEventListener('animationend', () =>
        card.classList.remove('flash-success'), { once:true });
    }
  
    // ↓  тост можно оставить после эффекта
    showToast('Вы успешно записались!','success');
  
}

function cancelRegistration(eventId){
  registrations=registrations.filter(r=>!(r.eventId===eventId && r.fullName===currentUser.fullName));
  localStorage.setItem('registrations',JSON.stringify(registrations));
  showToast('Запись отменена','info');
  renderEventsList();
}
/***** АДМИН‑модалка *****/
function openAdminView(eventId){
  document.getElementById('admin-modal').style.display='flex';
  const list=document.getElementById('admin-registrations');
  list.innerHTML='';
  registrations
    .filter(r=>r.eventId===eventId)
    .forEach((reg,idx)=>{
      const li=document.createElement('li');
      li.innerHTML =
        `${reg.fullName} (${reg.class}) ` +
        (reg.attended
          ? '— Участвовал ✅'
          : `<button class="btn-success" onclick="confirmAttendance(${eventId},${idx})">Подтвердить</button>`);
      list.appendChild(li);
    });
}
function closeAdminModal(){ document.getElementById('admin-modal').style.display='none'; }

function confirmAttendance(eventId, idx){
  const sameEvt = registrations.filter(r=>r.eventId===eventId);
  const reg     = sameEvt[idx];

  if (!reg.attended) {
    reg.attended = true;
    reg.points   = getEventPoints(eventId);

    /* если подтверждаем текущего пользователя — начисляем баллы */
    if (currentUser && reg.fullName === currentUser.fullName) {
      currentUser.points = (currentUser.points || 0) + reg.points;
      localStorage.setItem('userData', JSON.stringify(currentUser));
      updateProfileInfo(currentUser);
      syncCurrentUserWithAllUsers();
    }
    /* обновляем глобальный массив регистраций */
    const gIdx = registrations.findIndex(r => r.eventId===eventId && r.fullName===reg.fullName);
    registrations[gIdx] = reg;
    localStorage.setItem('registrations', JSON.stringify(registrations));

    openAdminView(eventId);          // перерисовать список
  }
}
function getEventPoints(id){
  const ev = events.find(e=>e.id===id);
  return ev ? ev.points : 0;
}

/***** АДМИН: добавить мероприятие *****/
function addEvent(){
  const title = document.getElementById('newEventTitle').value.trim();
  const desc  = document.getElementById('newEventDescription').value.trim();
  const date  = document.getElementById('newEventDate').value.trim();
  const pts   = parseInt(document.getElementById('newEventPoints').value,10);

  if (!title || !desc || !date || isNaN(pts))
    return showToast('Заполните все поля!','warning');

  const newId = events.length ? Math.max(...events.map(e=>e.id))+1 : 1;
  events.push({id:newId, title, description:desc, date, points:pts});
  localStorage.setItem('events', JSON.stringify(events));

  ['newEventTitle','newEventDescription','newEventDate','newEventPoints']
    .forEach(id => document.getElementById(id).value='');

  renderEventsList();
  showToast('Мероприятие добавлено!','success');
}

/***** НАГРАДЫ *****/
function renderRewards(){
  const box = document.getElementById('rewards-container');
  box.innerHTML = '';
  rewards.forEach(rw=>{
    const owned  = currentUser?.receivedRewards.includes(rw.id);
    const enough = (currentUser?.points || 0) >= rw.cost;
    const card   = document.createElement('div');
    card.className = 'reward-card';
    card.innerHTML = `
      <div>
        <h3>${rw.title}</h3>
        <div class="cost">${rw.cost} баллов</div>
      </div>
      <button class="btn ${owned?'btn-accent':''}" ${enough&&!owned ? '' : 'disabled'}
        onclick="redeemReward(${rw.id})">${owned?'Получено':'Получить'}</button>`;
    box.appendChild(card);
  });
}

function redeemReward(id){
  const reward = rewards.find(r=>r.id===id);
  if (!reward || !currentUser) return;
  if (currentUser.receivedRewards.includes(id))
    return showToast('У вас уже есть эта награда','info');
  if ((currentUser.points || 0) < reward.cost)
    return showToast('Недостаточно баллов','warning');

  currentUser.points -= reward.cost;
  currentUser.receivedRewards.push(id);
  localStorage.setItem('userData', JSON.stringify(currentUser));
  updateProfileInfo(currentUser);
  syncCurrentUserWithAllUsers();
  renderRewards();
  showToast('Награда получена!','success');
}

/***** ЛИДЕРБОРД *****/
function renderLeaderboard(){
  const tbody  = document.querySelector('#leaderboard-table tbody');
  tbody.innerHTML = '';
  const sorted = [...allUsers].sort((a,b)=>b.points-a.points);
  sorted.forEach((u,idx)=>{
    const row = document.createElement('tr');
    row.innerHTML =
      `<td>${idx+1}</td><td>${u.fullName}</td><td>${u.class}</td><td>${u.points}</td>`;
    tbody.appendChild(row);
  });
}
function syncCurrentUserWithAllUsers(){
  const idx = allUsers.findIndex(u=>u.fullName===currentUser.fullName && u.class===currentUser.class);
  if (idx>-1) allUsers[idx] = currentUser;
  else        allUsers.push(currentUser);
  localStorage.setItem('allUsers', JSON.stringify(allUsers));
  renderLeaderboard();
}

/***** ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ *****/
function showSection(sec){
  ['events','profile','rewards','leaderboard','calendar'].forEach(id=>{
    document.getElementById(`${id}-section`).style.display =
      (sec===id ? 'block' : 'none');
  });
  if (sec==='rewards')     renderRewards();
  if (sec==='leaderboard') renderLeaderboard();
}

/***** СБРОС ВСЕХ ДАННЫХ (тест) *****/
function resetAllData(){
  if (confirm('Удалить ВСЕ данные?')){
    localStorage.clear();
    location.reload();
  }
}

/***** FIRST RUN *****/
document.addEventListener('DOMContentLoaded', ()=>{
  if (!currentUser)
    document.getElementById('user-info-modal').style.display='flex';
  else
    updateProfileInfo(currentUser);

  renderEventsList();
  renderRewards();
  renderLeaderboard();
  showSection('events');
});
