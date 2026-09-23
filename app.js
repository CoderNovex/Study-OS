const $=s=>document.querySelector(s);
const defaultTasks=[{text:'Review today’s school work',done:false},{text:'Practice one difficult topic',done:false},{text:'10-minute active recall',done:false}];
let tasks=JSON.parse(localStorage.getItem('studyOS_tasks')||'null')||defaultTasks;
let seconds=Number(localStorage.getItem('studyOS_focus')||0),timer=null;
let pomodoroSeconds=25*60,pomodoroTimer=null,pomodoroRunning=false;
function save(){localStorage.setItem('studyOS_tasks',JSON.stringify(tasks));localStorage.setItem('studyOS_focus',String(seconds));}
function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function render(){const box=$('#tasks');box.innerHTML='';tasks.forEach((t,i)=>{const row=document.createElement('label');row.className='task '+(t.done?'done':'');row.innerHTML=`<input type="checkbox" ${t.done?'checked':''}><span>${t.text}</span><button class="delete-task" type="button" title="Delete task" aria-label="Delete ${t.text}">🗑️</button>`;row.querySelector('input').onchange=e=>{t.done=e.target.checked;save();render()};row.querySelector('.delete-task').onclick=()=>{tasks.splice(i,1);save();render()};box.appendChild(row)});const done=tasks.filter(t=>t.done).length;$('#taskCount').textContent=`${done} / ${tasks.length}`;$('#progress').textContent=`${tasks.length?Math.round(done/tasks.length*100):0}%`;$('#focusTime').textContent=formatTime(seconds);save()}
function tick(){seconds++;render()}
function updatePomodoro(){const display=$('#pomodoroTime');if(display)display.textContent=formatTime(pomodoroSeconds)}
function endPomodoro(){clearInterval(pomodoroTimer);pomodoroTimer=null;pomodoroRunning=false;$('#pomodoroBtn').textContent='Start 25 min';document.title='Study-OS';if('Notification'in window&&Notification.permission==='granted')new Notification('Study-OS',{body:'Pomodoro complete! Take a short break. 🎉'});alert('Pomodoro complete! 🎉 Take a short break.');}
$('#date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
const h=new Date().getHours();$('#greeting').textContent=h<12?'Good morning. Ready?':h<18?'Good afternoon. Let’s lock in.':'Good evening. One focused session.';
render();
$('#focusBtn').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('#focusBtn').textContent='Resume Focus ⏱️'}else{timer=setInterval(tick,1000);$('#focusBtn').textContent='Pause Focus ⏸️'}};
$('#addTask').onclick=()=>{const text=prompt('Task for today:');if(text?.trim()){tasks.push({text:text.trim(),done:false});save();render()}};
document.querySelectorAll('.subject').forEach(b=>b.onclick=()=>{const subject=b.dataset.subject;tasks.push({text:`Study ${subject}`,done:false});save();render()});
const pomodoroBtn=$('#pomodoroBtn');if(pomodoroBtn){pomodoroBtn.onclick=()=>{if(pomodoroRunning){clearInterval(pomodoroTimer);pomodoroTimer=null;pomodoroRunning=false;pomodoroBtn.textContent='Resume 25 min';return}if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();pomodoroRunning=true;pomodoroBtn.textContent='Pause';pomodoroTimer=setInterval(()=>{pomodoroSeconds--;updatePomodoro();document.title=`${formatTime(pomodoroSeconds)} • Study-OS`;if(pomodoroSeconds<=0){pomodoroSeconds=25*60;endPomodoro()}},1000)}}
updatePomodoro();
$('#resetPomodoro')?.addEventListener('click',()=>{clearInterval(pomodoroTimer);pomodoroTimer=null;pomodoroRunning=false;pomodoroSeconds=25*60;updatePomodoro();pomodoroBtn.textContent='Start 25 min';document.title='Study-OS'});
