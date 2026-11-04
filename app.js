const $ = s=>document.querySelector(s);
const KEY='career-quest-v1';
let records=Array(5).fill(null);
try {const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved)&&saved.length===5)records=saved.map(x=>Number.isInteger(x)&&x>=0&&x<=3?x:null);}catch{}
// Keep the map sequential even if an old or edited save contains gaps.
for(let i=1;i<5;i++)if(records[i-1]===null)records[i]=null;
let stage=0,question=0,correct=0,answered=false,answers=[],attemptId=null;
let student=null,token='';try{token=localStorage.getItem('career-token')||'';}catch{}
const game=$('#game');
function render(){
 const score=records.reduce((s,x)=>s+(x||0),0), done=records.filter(x=>x!==null).length;
 $('#score').innerHTML=`${score*100} <small>คะแนน</small>`;$('#stars').innerHTML=`${score} <small>/ 15 ดวง</small>`;
 $('#completed').textContent=`${done} / 5 ด่าน`;$('#progress-fill').style.width=`${done*20}%`;
 $('#rank').textContent=done===5?'ผู้พิชิตโลกของอาชีพ':done?'นักสำรวจผู้มุ่งมั่น':'ผู้เริ่มต้นการเดินทาง';
 $('#begin').innerHTML=done===5?'ผจญภัยอีกครั้ง <span>→</span>':'เริ่มการผจญภัย <span>→</span>';
 $('#levels').innerHTML=STAGES.map((s,i)=>{
 const locked=i>0&&records[i-1]===null,finished=records[i]!==null;
 return `<button class="level ${s.color} ${locked?'locked':''}" data-stage="${i}" ${locked?'disabled':''}><div class="card-top"><span class="level-number">ด่านที่ 0${i+1}</span><span class="status">${locked?'🔒':finished?'✓ สำเร็จ':'พร้อมสำรวจ'}</span></div><div class="scene"><span class="scene-circle"></span><span class="scene-icon">${s.icon}</span><span class="scene-spark">✦</span></div><div class="level-body"><small>${s.place}</small><h3>${s.title}</h3><p>${s.subtitle}</p><div class="card-bottom"><span class="card-stars" aria-label="${records[i]||0} จาก 3 ดาว">${[0,1,2].map(n=>`<span class="${finished&&n<records[i]?'earned':''}">★</span>`).join('')}</span><span class="level-arrow">${locked?'🔒':'→'}</span></div></div></button>`;
 }).join('');
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>start(Number(b.dataset.stage)));
}
async function start(i){
 if(!student){$('#register-dialog').showModal();return;}
 try{const result=await api('/api/attempt',{stage:i});attemptId=result.id;stage=i;question=0;correct=0;answers=[];answered=false;showQuestion();if(!game.open)game.showModal();tone('start');}
 catch(e){$('#sync-note').textContent=e.message;}
}
function showQuestion(){
 answered=false;const s=STAGES[stage],q=s.questions[question];
 $('#stage-label').textContent=`${s.icon} ด่านที่ ${stage+1} · ${s.title}`;
 $('#game-content').innerHTML=`<div class="question-progress"><span>ภารกิจ ${question+1} / 3</span><span>⭐ ${correct} ดาว</span></div><div class="question-track"><div style="width:${question/3*100}%"></div></div><h2>${q[0]}</h2><div class="answers">${q[1].map((a,i)=>`<button class="answer" data-answer="${i}"><span>${['ก','ข','ค'][i]}</span>${a}</button>`).join('')}</div><div id="feedback" aria-live="polite"></div><button class="primary next" id="next" hidden>${question===2?'สรุปภารกิจ':'ภารกิจถัดไป'} →</button>`;
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.answer)));
 $('#next').onclick=()=>{question++;question<3?showQuestion():finish();};
}
function answer(choice){
 if(answered)return;answered=true;answers.push(choice);const q=STAGES[stage].questions[question],right=choice===q[2];if(right)correct++;tone(right?'correct':'wrong');
 document.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;const n=Number(b.dataset.answer);if(n===q[2])b.classList.add('correct');else if(n===choice)b.classList.add('wrong');});
 $('#feedback').className=right?'feedback good':'feedback review';$('#feedback').innerHTML=`<strong>${right?'✨ ถูกต้อง! +100 คะแนน และ 1 ดาว':'🌱 เรียนรู้กันอีกนิด'}</strong><p>${q[3]}</p>`;
 $('#next').hidden=false;$('#next').focus();
}
async function finish(){
 $('#game-content').innerHTML='<p role="status">กำลังบันทึกคะแนน…</p>';
 try {const result=await api('/api/submit',{attempt:attemptId,answers});student=result.student;records=student.best;correct=result.correct;render();updateStudent();refreshBoard();tone('win');}
 catch(e){$('#game-content').innerHTML='<h2>ยังบันทึกคะแนนไม่สำเร็จ</h2><p id="save-error"></p><button class="primary" id="save-retry">ลองบันทึกอีกครั้ง</button>';$('#save-error').textContent=e.message;$('#save-retry').onclick=finish;return;}
 const stored=true;
 const allDone=records.every(x=>x!==null);
 $('#game-content').innerHTML=`<div class="result"><div class="result-icon">${allDone?'🏆':'🎉'}</div><div class="eyebrow">${allDone?'CAREER QUEST COMPLETE':'MISSION COMPLETE'}</div><h2>${allDone?'ผู้พิชิตโลกของอาชีพ!':'พิชิตภารกิจสำเร็จ!'}</h2><div class="result-stars">${'★'.repeat(correct)}<span>${'☆'.repeat(3-correct)}</span></div><p>รอบนี้ได้ <b>${correct*100} คะแนน</b> · ${correct} / 3 ดาว</p><p>${correct===3?'ยอดเยี่ยม! เก็บดาวครบทุกดวงแล้ว':'ลองใหม่เพื่อทบทวนและเก็บดาวให้ครบได้เสมอ'}</p>${!stored?'<p>เบราว์เซอร์บันทึกข้อมูลไม่ได้ ความก้าวหน้าจะอยู่เฉพาะระหว่างเปิดหน้านี้</p>':''}<button class="primary" id="continue">${stage<4?'ไปด่านถัดไป →':'กลับสู่แผนที่ →'}</button><button class="text-btn" id="retry">เล่นด่านนี้อีกครั้ง</button></div>`;
 $('#continue').onclick=()=>stage<4?start(stage+1):game.close();$('#retry').onclick=()=>start(stage);
}
$('#begin').onclick=()=>{const next=records.findIndex(x=>x===null);start(next<0?0:next);};
$('#close').onclick=()=>game.close();$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();$('#understood').onclick=()=>$('#help-dialog').close();
$('#reset').textContent='ออกจากบัญชี';
$('#reset').onclick=async()=>{if(confirm('ออกจากบัญชีนักเรียนบนเครื่องนี้? คะแนนบนเซิร์ฟเวอร์จะยังอยู่ ใช้บัญชีเดิมอีกครั้งต้องติดต่อครู')){if(window.firebaseBackend){try{await window.firebaseBackend.logout();}catch{alert('ออกจากบัญชีไม่สำเร็จ กรุณาลองใหม่');return;}}try{localStorage.removeItem('career-token');localStorage.removeItem(KEY);}catch{}token='';student=null;records=Array(5).fill(null);render();updateStudent();}};
render();
async function api(route,data){
 if(window.firebaseBackend)return window.firebaseBackend.request(route,data);
 const r=await fetch(route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(data?{body:JSON.stringify(data)}:{})});
 const value=await r.json();if(!r.ok)throw Error(value.error||'เชื่อมต่อไม่สำเร็จ');return value;
}
function updateStudent(){
 $('#student-info').textContent=student?`${student.name} · ${student.room} · เลขที่ ${student.number}`:'ลงทะเบียนเพื่อบันทึกผลงานและร่วมอันดับ';
 $('#register-open').hidden=!!student;
 if(student)document.querySelector('.profile small').textContent=student.name;
 else document.querySelector('.profile small').textContent='นักสำรวจอาชีพ';
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refreshBoard(){
 try{const rows=await api('/api/leaderboard');$('#leaderboard').innerHTML=rows.length?'<div class="board-grid">'+rows.slice(0,30).map(r=>`<div class="board-row ${student&&student.id===r.id?'is-me':''}"><b>${r.rank<=3?['🥇','🥈','🥉'][r.rank-1]:'#'+r.rank}</b><span>${esc(r.name)} <small>${esc(r.room)}</small></span><strong>${r.score.toLocaleString()} <small>คะแนน · ★ ${r.stars}</small></strong></div>`).join('')+'</div>':'<p class="empty">ยังไม่มีนักสำรวจ มาเป็นคนแรกกันเถอะ!</p>';$('#sync-note').textContent='แสดงสูงสุด 30 คน · คะแนนเท่ากันได้อันดับเดียวกัน · อัปเดต '+new Date().toLocaleTimeString('th-TH');}
 catch(e){$('#sync-note').textContent='เชื่อมต่อกระดานอันดับไม่ได้ กรุณาเปิดเกมผ่านเซิร์ฟเวอร์แล้วลองอัปเดตอีกครั้ง';}
}
$('#refresh-board').onclick=refreshBoard;
$('#register-open').onclick=()=>$('#register-dialog').showModal();$('#register-close').onclick=()=>$('#register-dialog').close();
$('#register-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;$('#register-error').textContent='';
 try{const data=Object.fromEntries(new FormData(e.target));const result=await api('/api/register',data);token=result.token;student=result.student;records=student.best;try{if(token)localStorage.setItem('career-token',token);}catch{}render();updateStudent();$('#register-dialog').close();refreshBoard();start(0);}
 catch(error){$('#register-error').textContent=error.message;}finally{button.disabled=false;}
};
let audio=null,sound=false;
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'🔊 เสียง':'🔇 เสียง';$('#sound').setAttribute('aria-pressed',String(sound));if(sound)tone('start');};
function tone(kind){if(!sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=kind==='wrong'?[220,165]:kind==='win'?[523,659,784,1047]:kind==='correct'?[659,880]:[392,523];notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.13;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.23);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.24);});}catch{}}
let teacherRows=[],teacherPassword='',teacherEmail='';
$('#teacher-open').onclick=()=>$('#teacher-dialog').showModal();
$('#teacher-close').onclick=()=>{$('#teacher-dialog').close();clearTeacher();};
$('#teacher-dialog').addEventListener('cancel',clearTeacher);
function clearTeacher(){if(window.firebaseBackend)window.firebaseBackend.closeTeacher().catch(()=>{});teacherEmail='';teacherPassword='';teacherRows=[];$('#teacher-login').reset();$('#teacher-login').hidden=false;$('#teacher-results').hidden=true;$('#teacher-rows').innerHTML='';$('#teacher-stats').innerHTML='';}
async function loadTeacher(){const r=await api('/api/teacher',{password:teacherPassword,email:teacherEmail});teacherRows=r;const old=$('#room-filter').value;$('#room-filter').innerHTML='<option value="">ทุกชั้นเรียน</option>'+[...new Set(r.map(s=>s.room))].sort().map(room=>`<option value="${esc(room)}">${esc(room)}</option>`).join('');$('#room-filter').value=old;drawTeacher();}
$('#teacher-login').onsubmit=async e=>{e.preventDefault();teacherPassword=new FormData(e.target).get('password');teacherEmail=new FormData(e.target).get('email')||'';try{await loadTeacher();$('#teacher-login').hidden=true;$('#teacher-results').hidden=false;$('#teacher-error').textContent='';}catch(error){$('#teacher-error').textContent=error.message;teacherPassword='';}};
const filtered=()=>teacherRows.filter(s=>!$('#room-filter').value||s.room===$('#room-filter').value).sort((a,b)=>a.room.localeCompare(b.room)||a.number-b.number);
function drawTeacher(){const rows=filtered(),n=rows.length;$('#teacher-stats').innerHTML=`<div><b>${n}</b> นักเรียน</div><div><b>${n?Math.round(rows.reduce((s,r)=>s+r.score,0)/n):0}</b> คะแนนเฉลี่ย</div><div><b>${rows.filter(s=>s.completed===5).length}</b> เรียนครบทุกด่าน</div>`;$('#teacher-rows').innerHTML=rows.length?rows.map(s=>'<tr>'+[s.name,s.room,s.number,...s.best.map(v=>v===null?'–':v*100),s.score,s.stars,s.completed+'/5'].map(v=>`<td>${esc(v)}</td>`).join('')+'</tr>').join(''):'<tr><td colspan="11">ยังไม่มีข้อมูลในชั้นเรียนนี้</td></tr>';}
$('#room-filter').onchange=drawTeacher;$('#teacher-refresh').onclick=async()=>{try{await loadTeacher();}catch(e){alert(e.message)}};
$('#export-csv').onclick=()=>{const rows=[['ชื่อ–สกุล','ชั้น','เลขที่','ด่าน 1','ด่าน 2','ด่าน 3','ด่าน 4','ด่าน 5','คะแนน','ดาว','สำเร็จ'],...filtered().map(s=>[s.name,s.room,s.number,...s.best.map(v=>v===null?'':v*100),s.score,s.stars,s.completed])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='career-quest-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
(async()=>{records=Array(5).fill(null);if(token||window.firebaseBackend){try{student=await api('/api/me');records=student.best;}catch(e){$('#sync-note').textContent=e.message;}}render();updateStudent();refreshBoard();})();
