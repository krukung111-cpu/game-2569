const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stages=require('./content.js');
const root=__dirname,dir=process.env.DATA_DIR||path.join(root,'.data');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const keyFile=path.join(dir,'teacher-key');
if(!process.env.TEACHER_PASSWORD&&!fs.existsSync(keyFile))fs.writeFileSync(keyFile,crypto.randomBytes(18).toString('hex'),{mode:0o600});
const teacherKey=process.env.TEACHER_PASSWORD||fs.readFileSync(keyFile,'utf8').trim();
const dbFile=path.join(dir,'students.json');let db=fs.existsSync(dbFile)?JSON.parse(fs.readFileSync(dbFile,'utf8')):[];
const save=()=>{fs.writeFileSync(dbFile+'.tmp',JSON.stringify(db),{mode:0o600});fs.renameSync(dbFile+'.tmp',dbFile)};
const totals=s=>s.best.reduce((a,b)=>a+(b??0),0);
const publicStudent=s=>({id:s.id,name:s.name,room:s.room,number:s.number,best:s.best,stars:totals(s),score:totals(s)*100,completed:s.best.filter(x=>x!==null).length,updated:s.updated});
const safeEqual=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const attempts=new Map(), logins=new Map();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>8192)throw Error('ข้อมูลใหญ่เกินไป')}return JSON.parse(data||'{}')}
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
 if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok'});
 if(pathname.startsWith('/api/')){
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'ไม่อนุญาตคำขอข้ามเว็บไซต์'});
 const token=(req.headers.authorization||'').replace(/^Bearer /,''),student=db.find(s=>safeEqual(token,s.token));
 if(pathname==='/api/register'&&req.method==='POST'){
 const data=await body(req),name=String(data.name||'').trim(),room=String(data.room||'').trim(),number=Number(data.number);
 if(name.length<3||name.length>100||!name.includes(' ')||!/^(ม\.)?1\/[1-9]\d?$/.test(room)||!Number.isInteger(number)||number<1||number>99)return json(res,400,{error:'กรอกชื่อ–สกุล ชั้น เช่น ม.1/1 และเลขที่ 1–99 ให้ครบถ้วน'});
 const normalized=room.startsWith('ม.')?room:'ม.'+room;
 if(db.some(s=>s.room===normalized&&s.number===number))return json(res,409,{error:'ชั้นและเลขที่นี้ลงทะเบียนแล้ว กรุณาใช้อุปกรณ์เดิม หรือติดต่อครูเพื่อตรวจสอบ'});
 const s={id:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),name,room:normalized,number,best:Array(5).fill(null),updated:new Date().toISOString()};db.push(s);save();return json(res,201,{token:s.token,student:publicStudent(s)});
 }
 if(pathname==='/api/me'&&req.method==='GET')return student?json(res,200,publicStudent(student)):json(res,401,{error:'กรุณาลงทะเบียนหรือเข้าสู่ระบบใหม่'});
 if(pathname==='/api/attempt'&&req.method==='POST'){
 if(!student)return json(res,401,{error:'กรุณาลงทะเบียนก่อนเล่น'});const {stage}=await body(req);
 if(!Number.isInteger(stage)||stage<0||stage>4||(stage>0&&student.best[stage-1]===null))return json(res,400,{error:'ด่านนี้ยังไม่เปิด'});
 const id=crypto.randomUUID();const now=Date.now();for(const [key,a]of attempts)if(a.expires<now||a.student===student.id)attempts.delete(key);
 attempts.set(id,{student:student.id,stage,expires:now+3600000});return json(res,200,{id});
 }
 if(pathname==='/api/submit'&&req.method==='POST'){
 if(!student)return json(res,401,{error:'ไม่พบข้อมูลนักเรียน'});const {attempt,answers}=await body(req),a=attempts.get(attempt);
 if(!a||a.student!==student.id||a.expires<Date.now()||!Array.isArray(answers)||answers.length!==3||answers.some(n=>!Number.isInteger(n)||n<0||n>2))return json(res,400,{error:'ภารกิจหมดอายุหรือข้อมูลไม่ครบ กรุณาเริ่มด่านใหม่'});
 if(a.result)return json(res,200,a.result);
 const correct=answers.filter((v,i)=>v===stages[a.stage].questions[i][2]).length;student.best[a.stage]=Math.max(student.best[a.stage]||0,correct);student.updated=new Date().toISOString();save();a.result={correct,student:publicStudent(student)};return json(res,200,a.result);
 }
 if(pathname==='/api/leaderboard'&&req.method==='GET'){
 const room=url.searchParams.get('room');const rows=db.filter(s=>!room||s.room===room).sort((a,b)=>totals(b)-totals(a)||a.updated.localeCompare(b.updated));let rank=0,last=-1;
 return json(res,200,rows.map((s,i)=>{if(totals(s)!==last)rank=i+1;last=totals(s);return {id:s.id,name:s.name.split(/\s+/)[0],room:s.room,rank,score:totals(s)*100,stars:totals(s)}}));
 }
 if(pathname==='/api/teacher'&&req.method==='POST'){
 const address=req.socket.remoteAddress,now=Date.now(),lim=logins.get(address)||{n:0,until:now+60000};if(lim.until<now){lim.n=0;lim.until=now+60000}lim.n++;logins.set(address,lim);if(lim.n>20)return json(res,429,{error:'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 1 นาที'});
 const {password}=await body(req);if(typeof password!=='string'||!safeEqual(password,teacherKey))return json(res,401,{error:'รหัสครูไม่ถูกต้อง'});
 return json(res,200,db.map(publicStudent));
 }
 return json(res,404,{error:'ไม่พบรายการ'});
 }
 const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/content.js':'content.js','/app.js':'app.js'};
 if(!files[pathname]||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end('Not found')}
 const file=files[pathname],types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)],'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?'':fs.readFileSync(path.join(root,file)));
 }catch(e){json(res,400,{error:'ดำเนินการไม่สำเร็จ โปรดลองใหม่ หรือติดต่อครู'})}
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Career World running on port '+(process.env.PORT||3000)));
