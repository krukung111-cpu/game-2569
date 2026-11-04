import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,signInAnonymously,setPersistence,browserLocalPersistence,browserSessionPersistence,signInWithEmailAndPassword,signOut,connectAuthEmulator} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,getDocs,collection,query,orderBy,limit,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
let auth,teacherAuth,db,teacherDb;const attempts=new Map();
const points=best=>best.reduce((n,v)=>n+(v||0),0);
const view=(id,s)=>({id,...s,stars:points(s.best),score:points(s.best)*100,completed:s.best.filter(v=>v!==null).length});
const publicRow=(s)=>({name:s.name.split(' ')[0],room:s.room,stars:points(s.best),score:points(s.best)*100});
async function init(){
 const local=['localhost','127.0.0.1'].includes(location.hostname);let config;
 if(local)config={apiKey:'demo-key',projectId:'demo-career-quest',authDomain:'demo-career-quest.firebaseapp.com'};
 else{const r=await fetch('/__/firebase/init.json');if(!r.ok)throw Error('ยังไม่ได้ตั้งค่า Firebase Hosting');config=await r.json();}
 const app=initializeApp(config),teacherApp=initializeApp(config,'teacher');auth=getAuth(app);teacherAuth=getAuth(teacherApp);db=getFirestore(app);teacherDb=getFirestore(teacherApp);
 if(local){for(const a of [auth,teacherAuth])connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});for(const d of [db,teacherDb])connectFirestoreEmulator(d,'127.0.0.1',8081);}
 await setPersistence(auth,browserLocalPersistence);await setPersistence(teacherAuth,browserSessionPersistence);await auth.authStateReady();await teacherAuth.authStateReady();await signOut(teacherAuth);if(!auth.currentUser)await signInAnonymously(auth);
}
const ready=init();ready.catch(()=>{});
async function request(route,data={}){
 await ready;const uid=auth.currentUser.uid,ref=doc(db,'students',uid);
 if(route==='/api/me'){const s=await getDoc(ref);if(!s.exists())throw Error('ยังไม่ได้ลงทะเบียนนักเรียน');return view(uid,s.data());}
 if(route==='/api/register'){
 const name=String(data.name||'').trim().replace(/\s+/g,' '),room=String(data.room||'').trim(),number=Number(data.number);
 if(name.length<3||name.length>100||!name.includes(' ')||!/^(ม\.)?1\/[1-9]\d?$/.test(room)||!Number.isInteger(number)||number<1||number>99)throw Error('กรอกชื่อ–สกุล ชั้น เช่น ม.1/1 และเลขที่ 1–99 ให้ครบถ้วน');
 const normalized=room.startsWith('ม.')?room:'ม.'+room,slot=doc(db,'roster',normalized.replace('/','-')+'-'+number);
 const student=await runTransaction(db,async tx=>{const [existing,roster]=await Promise.all([tx.get(ref),tx.get(slot)]);if(existing.exists())throw Error('บัญชีนี้ลงทะเบียนแล้ว กรุณาโหลดหน้าใหม่');if(roster.exists())throw Error('ชั้นและเลขที่นี้ลงทะเบียนแล้ว กรุณาใช้เบราว์เซอร์เดิมหรือติดต่อครู');const s={name,room:normalized,number,best:Array(5).fill(null),updated:serverTimestamp()};tx.set(ref,s);tx.set(slot,{uid});tx.set(doc(db,'leaderboard',uid),publicRow(s));return s;});return {student:view(uid,student)};
 }
 if(route==='/api/attempt'){
 const stage=data.stage,snap=await getDoc(ref);if(!snap.exists())throw Error('กรุณาลงทะเบียนก่อน');const s=snap.data();if(!Number.isInteger(stage)||stage<0||stage>4||(stage>0&&s.best[stage-1]===null))throw Error('ด่านนี้ยังไม่เปิด');
 const id=crypto.randomUUID();attempts.clear();attempts.set(id,{stage,expires:Date.now()+3600000});return {id};
 }
 if(route==='/api/submit'){
 const a=attempts.get(data.attempt);if(!a||a.expires<Date.now()||!Array.isArray(data.answers)||data.answers.length!==3||data.answers.some(v=>!Number.isInteger(v)||v<0||v>2))throw Error('ภารกิจหมดอายุหรือข้อมูลไม่ครบ กรุณาเริ่มด่านใหม่');
 // Spark has no trusted server scoring: this is a learning activity, not an exam.
 const correct=data.answers.filter((v,i)=>v===STAGES[a.stage].questions[i][2]).length;
 const s=await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('ไม่พบข้อมูลนักเรียน');const s=snap.data();if(a.stage>0&&s.best[a.stage-1]===null)throw Error('ด่านนี้ยังไม่เปิด');s.best[a.stage]=Math.max(s.best[a.stage]||0,correct);s.updated=serverTimestamp();tx.set(ref,s);tx.set(doc(db,'leaderboard',uid),publicRow(s));return s;});return {correct,student:view(uid,s)};
 }
 if(route==='/api/leaderboard'){
 const snapshot=await getDocs(query(collection(db,'leaderboard'),orderBy('score','desc'),limit(30)));let rank=0,last=-1;return snapshot.docs.map((d,i)=>{const s=d.data();if(s.score!==last)rank=i+1;last=s.score;return {id:d.id,...s,rank};});
 }
 if(route==='/api/teacher'){
 try{if(!teacherAuth.currentUser)await signInWithEmailAndPassword(teacherAuth,data.email,data.password);
 const role=await getDoc(doc(teacherDb,'teachers',teacherAuth.currentUser.uid));if(!role.exists()||role.data().enabled!==true)throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ครู');
 const snapshot=await getDocs(query(collection(teacherDb,'students'),limit(1000)));return snapshot.docs.map(d=>view(d.id,d.data()));
 }catch(e){await signOut(teacherAuth);throw e;}
 }
 throw Error('ไม่พบรายการ');
}
window.firebaseBackend={async request(route,data){try{return await request(route,data);}catch(e){const messages={'permission-denied':'ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาตรวจบัญชีและ Firestore Rules','resource-exhausted':'โควตาฟรีถึงขีดจำกัด กรุณาลองใหม่ภายหลัง','unavailable':'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจอินเทอร์เน็ต','auth/operation-not-allowed':'กรุณาเปิด Anonymous และ Email/Password ใน Firebase Authentication','auth/invalid-credential':'อีเมลหรือรหัสผ่านครูไม่ถูกต้อง'};throw Error(messages[e.code]||e.message);}},async logout(){await ready;await signOut(auth);await signInAnonymously(auth);attempts.clear();},async closeTeacher(){await ready;await signOut(teacherAuth);}};
const email=document.createElement('label');email.textContent='อีเมลครู';const input=document.createElement('input');input.name='email';input.type='email';input.required=true;input.autocomplete='username';email.append(input);document.querySelector('#teacher-login h2').after(email);document.querySelector('#teacher-login label:has(input[name="password"])').firstChild.textContent='รหัสผ่านบัญชีครู';
await import('./app.js');
