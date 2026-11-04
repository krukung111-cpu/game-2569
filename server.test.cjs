const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const stages=require('./content.js');
test('registration, authoritative scoring, persistence, tied ranks and teacher access',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'career-test-')),port=32000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 let child;async function launch(){child=spawn(process.execPath,['server.cjs'],{cwd:__dirname,env:{...process.env,PORT:String(port),DATA_DIR:dir,TEACHER_PASSWORD:'test-password-only'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),5000);child.stdout.once('data',()=>{clearTimeout(timer);resolve()});child.once('error',reject);child.once('exit',code=>{if(code)reject(Error('server exited '+code))})});}
 const stop=()=>new Promise(resolve=>{if(!child||child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill()});
 t.after(async()=>{await stop();fs.rmSync(dir,{recursive:true,force:true})});
 async function api(route,data,token){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
 await launch();assert.deepEqual((await api('/api/health')).data,{status:'ok'});assert.equal((await api('/api/teacher',{password:'wrong'})).status,401);assert.equal((await api('/api/register',{name:'x',room:'x',number:0})).status,400);
 const a=await api('/api/register',{name:'นักเรียน ทดสอบ',room:'ม.1/1',number:1}),token=a.data.token;assert.equal(a.status,201);assert.equal((await api('/api/register',{name:'ชื่อ ซ้ำ',room:'1/1',number:1})).status,409);assert.equal((await api('/api/attempt',{stage:1},token)).status,400);assert.equal((await api('/api/submit',{score:1500},token)).status,400);
 for(let i=0;i<5;i++){const attempt=await api('/api/attempt',{stage:i},token),data={attempt:attempt.data.id,answers:stages[i].questions.map(q=>q[2])};assert.equal((await api('/api/submit',data,token)).data.correct,3);assert.equal((await api('/api/submit',data,token)).status,200);}
 const retry=await api('/api/attempt',{stage:0},token);await api('/api/submit',{attempt:retry.data.id,answers:stages[0].questions.map(q=>(q[2]+1)%3)},token);assert.equal((await api('/api/me',null,token)).data.score,1500);
 const board=(await api('/api/leaderboard')).data;assert.equal(board[0].name,'นักเรียน');assert.ok(!('token' in board[0]));assert.equal((await api('/api/teacher',{password:'test-password-only'})).data[0].name,'นักเรียน ทดสอบ');
 await stop();await launch();assert.equal((await api('/api/me',null,token)).data.score,1500);
 assert.equal((await fetch(base+'/.data/students.json')).status,404);assert.equal((await fetch(base+'/server.cjs')).status,404);
});
