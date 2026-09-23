document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const get = (key, fallback) => { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
  const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const defaultTasks = [
    { text: 'Review today’s school work', done: false },
    { text: 'Practice one difficult topic', done: false },
    { text: '10-minute active recall', done: false }
  ];
  const defaultSubjects = [
    { name:'Mathematics', icon:'➗', chapters:[] },
    { name:'Science', icon:'🔬', chapters:[] },
    { name:'Social Science', icon:'🌍', chapters:[] },
    { name:'English', icon:'📖', chapters:[] },
    { name:'Hindi', icon:'📝', chapters:[] },
    { name:'IT 402', icon:'💻', chapters:[] }
  ];
  let tasks = get('studyOS_tasks', defaultTasks);
  let subjects = get('studyOS_subjects', defaultSubjects);
  let tests = get('studyOS_tests', []);
  let focusSeconds = Number(localStorage.getItem('studyOS_focus') || 0);
  let streak = get('studyOS_streak', { count:0, lastDate:null });
  let daily = get('studyOS_daily', { date:'', focusSeconds:0 });
  let focusTimer = null;
  let pomoTimer = null;
  let pomoSeconds = 1500;

  function dateKey() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function ensureDaily() { if (daily.date !== dateKey()) daily = { date:dateKey(), focusSeconds:0 }; }
  function save() {
    put('studyOS_tasks', tasks); put('studyOS_subjects', subjects); put('studyOS_tests', tests);
    localStorage.setItem('studyOS_focus', String(focusSeconds)); put('studyOS_streak', streak); put('studyOS_daily', daily);
  }
  function time(s) { return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
  function activity() {
    const today=dateKey();
    if (streak.lastDate === today) return;
    if (streak.lastDate) {
      const diff=Math.round((new Date(today)-new Date(streak.lastDate))/86400000);
      streak.count = diff===1 ? streak.count+1 : 1;
    } else streak.count=1;
    streak.lastDate=today; save();
  }
  function renderTasks() {
    const box=$('tasks'); box.innerHTML='';
    tasks.forEach((task,index)=>{
      const row=document.createElement('div'); row.className='task '+(task.done?'done':'');
      row.innerHTML='<input type="checkbox" '+(task.done?'checked':'')+'><span></span><button class="delete-task" type="button">🗑️</button>';
      row.querySelector('span').textContent=task.text;
      row.querySelector('input').addEventListener('change',(e)=>{ task.done=e.target.checked; if(task.done) activity(); save(); renderAll(); });
      row.querySelector('.delete-task').addEventListener('click',()=>{ tasks.splice(index,1); save(); renderAll(); });
      box.appendChild(row);
    });
    $('taskCount').textContent=tasks.filter(t=>t.done).length+' / '+tasks.length;
  }
  function renderDaily() {
    ensureDaily();
    const completed=tasks.filter(t=>t.done).length;
    const taskPct=Math.min(100, completed/5*100), focusPct=Math.min(100, daily.focusSeconds/3600*100);
    const score=Math.round((taskPct+focusPct)/2);
    $('dailyTasks').textContent=completed+' / 5'; $('dailyFocus').textContent=Math.floor(daily.focusSeconds/60)+' / 60 min';
    $('dailyLabel').textContent=score+'%'; $('dailyBar').style.width=score+'%'; $('progress').textContent=score+'%';
    $('dailyGoal').textContent=score>=100?'🎉 Goal complete!':score>=50?'🔥 Halfway there!':'Keep going!';
  }
  function renderSubjects() {
    const box=$('subjects'); box.innerHTML='';
    subjects.forEach((subject,sIndex)=>{
      const card=document.createElement('div'); card.className='subject-card';
      card.innerHTML='<div class="subject-title"><span>'+subject.icon+'</span><b>'+subject.name+'</b><button class="chapter-add" type="button">+ Chapter</button></div><div class="chapters"></div>';
      const chapters=card.querySelector('.chapters');
      if (!subject.chapters.length) chapters.innerHTML='<small class="muted">No chapters yet</small>';
      subject.chapters.forEach((chapter,cIndex)=>{
        const row=document.createElement('div'); row.className='chapter';
        row.innerHTML='<button class="chapter-status '+(chapter.status||'not-started')+'" type="button">○</button><span></span><button class="chapter-delete" type="button">🗑️</button>';
        row.querySelector('span').textContent=chapter.name;
        row.querySelector('.chapter-status').textContent=chapter.status==='mastered'?'✓':chapter.status==='practicing'?'●':chapter.status==='learning'?'◐':'○';
        row.querySelector('.chapter-status').addEventListener('click',()=>{ const states=['not-started','learning','practicing','mastered']; const n=states.indexOf(chapter.status||'not-started'); chapter.status=states[(n+1)%states.length]; save(); renderSubjects(); });
        row.querySelector('.chapter-delete').addEventListener('click',()=>{ subject.chapters.splice(cIndex,1); save(); renderSubjects(); });
        chapters.appendChild(row);
      });
      card.querySelector('.chapter-add').addEventListener('click',()=>{ const name=prompt('Chapter name:'); if(name && name.trim()){ subject.chapters.push({name:name.trim(),status:'not-started'}); save(); renderSubjects(); } });
      box.appendChild(card);
    });
  }
  function renderTests() {
    const box=$('tests'); box.innerHTML='';
    if(!tests.length){ box.innerHTML='<p class="muted">No tests yet. Click + Add Test to create one. 🧪</p>'; return; }
    tests.forEach((test,index)=>{
      const row=document.createElement('div'); row.className='test';
      const score=test.lastScore==null?'Not attempted':test.lastScore+'/'+test.questions.length+' ('+Math.round(test.lastScore/test.questions.length*100)+'%)';
      row.innerHTML='<div><b></b><small></small></div><div><button class="test-attempt primary" type="button"></button><button class="chapter-delete" type="button">🗑️</button></div>';
      row.querySelector('b').textContent=test.name; row.querySelector('small').textContent=test.subject+' • '+test.questions.length+' questions • '+score;
      row.querySelector('.test-attempt').textContent=test.lastScore==null?'Attempt Test':'Retake Test';
      row.querySelector('.test-attempt').addEventListener('click',()=>attemptTest(index));
      row.querySelector('.chapter-delete').addEventListener('click',()=>{ tests.splice(index,1); save(); renderTests(); });
      box.appendChild(row);
    });
  }
  function createTest() {
    const name=prompt('Test name:'); if(!name || !name.trim()) return;
    const subject=prompt('Subject:','Mathematics'); if(subject===null) return;
    const count=Number(prompt('How many questions?','5'));
    if(!Number.isInteger(count)||count<1||count>20){ alert('Please choose 1 to 20 questions.'); return; }
    const questions=[];
    for(let i=0;i<count;i++){
      const q=prompt('Question '+(i+1)+'/'+count+':'); if(!q||!q.trim()) return;
      const options=[]; for(const letter of ['A','B','C','D']){ const o=prompt('Option '+letter+':'); if(!o||!o.trim()) return; options.push(o.trim()); }
      const correct=prompt('Correct option (A, B, C or D):','A'); if(!correct) return;
      const answer=correct.trim().toUpperCase(); if(!['A','B','C','D'].includes(answer)){ alert('Correct option must be A, B, C or D.'); return; }
      questions.push({question:q.trim(),options,correct:['A','B','C','D'].indexOf(answer)});
    }
    tests.push({name:name.trim(),subject:subject.trim()||'General',questions,lastScore:null}); save(); renderTests();
  }
  function attemptTest(index) {
    const test=tests[index]; let score=0;
    for(let i=0;i<test.questions.length;i++){
      const q=test.questions[i];
      const answer=prompt('Question '+(i+1)+'/'+test.questions.length+'\n\n'+q.question+'\n\nA) '+q.options[0]+'\nB) '+q.options[1]+'\nC) '+q.options[2]+'\nD) '+q.options[3]+'\n\nType A, B, C or D:');
      if(answer===null) return; if(answer.trim().toUpperCase()==='ABCD'[q.correct]) score++;
    }
    test.lastScore=score; save(); renderTests(); activity(); alert('Test finished! 🎯\nScore: '+score+'/'+test.questions.length+' ('+Math.round(score/test.questions.length*100)+'%)');
  }
  function renderAll(){ ensureDaily(); renderTasks(); renderDaily(); renderSubjects(); renderTests(); $('focusTime').textContent=time(focusSeconds); $('streak').textContent=streak.count+' day'+(streak.count===1?'':'s'); save(); }

  $('date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const h=new Date().getHours(); $('greeting').textContent=h<12?'Good morning. Ready?':h<18?'Good afternoon. Let’s lock in.':'Good evening. One focused session.';
  ensureDaily(); renderAll();

  $('addTask').addEventListener('click',()=>{ const text=prompt('Task for today:'); if(text&&text.trim()){ tasks.push({text:text.trim(),done:false}); save(); renderAll(); } });
  $('addSubject').addEventListener('click',()=>{ const name=prompt('Subject name:'); if(name&&name.trim()){ subjects.push({name:name.trim(),icon:'📚',chapters:[]}); save(); renderSubjects(); } });
  $('addTest').addEventListener('click',createTest);
  $('focusBtn').addEventListener('click',()=>{ if(focusTimer){ clearInterval(focusTimer); focusTimer=null; $('focusBtn').textContent='Resume Focus ⏱️'; } else { focusTimer=setInterval(()=>{focusSeconds++;daily.focusSeconds++;save();renderDaily();$('focusTime').textContent=time(focusSeconds);},1000); $('focusBtn').textContent='Pause Focus ⏸️'; } });
  $('pomodoroBtn').addEventListener('click',()=>{ if(pomoTimer){ clearInterval(pomoTimer); pomoTimer=null; $('pomodoroBtn').textContent='Resume 25 min'; return; } $('pomodoroBtn').textContent='Pause'; pomoTimer=setInterval(()=>{ pomoSeconds--; $('pomodoroTime').textContent=time(pomoSeconds); if(pomoSeconds<=0){clearInterval(pomoTimer);pomoTimer=null;pomoSeconds=1500;$('pomodoroTime').textContent='25:00';daily.focusSeconds+=1500;activity();save();renderDaily();$('pomodoroBtn').textContent='Start 25 min';alert('Pomodoro complete! 🎉 Take a short break.');}},1000); });
  $('resetPomodoro').addEventListener('click',()=>{clearInterval(pomoTimer);pomoTimer=null;pomoSeconds=1500;$('pomodoroTime').textContent='25:00';$('pomodoroBtn').textContent='Start 25 min';});
  $('pomodoroTime').textContent='25:00';
});