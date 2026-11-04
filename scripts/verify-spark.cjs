const sdkRequire=require('node:module').createRequire(require.resolve('../tools/package.json'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=sdkRequire('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,query,limit,writeBatch,serverTimestamp}=sdkRequire('firebase/firestore');
const fs=require('node:fs');
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Use Firebase Emulator; never run against production');
(async()=>{const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');const env=await initializeTestEnvironment({projectId:'demo-career-quest',firestore:{host,port:Number(port),rules:fs.readFileSync('firestore.rules','utf8')}});
try{await env.clearFirestore();const a=env.authenticatedContext('student-a').firestore(),b=env.authenticatedContext('student-b').firestore(),teacher=env.authenticatedContext('teacher-a').firestore(),anon=env.unauthenticatedContext().firestore();
function register(db,uid,number=1){const batch=writeBatch(db);batch.set(doc(db,'students',uid),{name:'นักเรียน ทดสอบ',room:'ม.1/1',number,best:[null,null,null,null,null],updated:serverTimestamp()});batch.set(doc(db,'roster','ม.1-1-'+number),{uid});batch.set(doc(db,'leaderboard',uid),{name:'นักเรียน',room:'ม.1/1',stars:0,score:0});return batch.commit();}
await assertSucceeds(register(a,'student-a'));await assertFails(register(b,'student-b'));await assertSucceeds(register(b,'student-b',2));
await assertFails(getDoc(doc(b,'students','student-a')));await assertFails(getDoc(doc(anon,'leaderboard','student-a')));await assertFails(getDocs(collection(a,'students')));await assertFails(getDocs(collection(a,'leaderboard')));await assertSucceeds(getDocs(query(collection(a,'leaderboard'),limit(30))));
function score(best,stars,extra={}){const batch=writeBatch(a);batch.update(doc(a,'students','student-a'),{best,updated:serverTimestamp(),...extra});batch.set(doc(a,'leaderboard','student-a'),{name:'นักเรียน',room:'ม.1/1',stars,score:stars*100});return batch.commit();}
await assertFails(score([null,3,null,null,null],3));await assertFails(score([4,null,null,null,null],4));await assertFails(score([3,null,null,null,null],15));await assertFails(score([3,null,null,null,null],3,{name:'เปลี่ยน ชื่อ'}));await assertSucceeds(score([3,null,null,null,null],3));await assertFails(score([1,null,null,null,null],1));await assertSucceeds(score([3,0,null,null,null],3));
const promote=writeBatch(a);promote.set(doc(a,'teachers','student-a'),{enabled:true});await assertFails(promote.commit());
await env.withSecurityRulesDisabled(async context=>{const batch=writeBatch(context.firestore());batch.set(doc(context.firestore(),'teachers','teacher-a'),{enabled:true});await batch.commit();});
await assertSucceeds(getDocs(query(collection(teacher,'students'),limit(1000))));await assertFails(getDocs(query(collection(b,'students'),limit(1000))));
console.log('PASS Spark rules: atomic registration, duplicate slots, private profiles, bounded leaderboard, locked stages, score bounds/consistency, immutable identity, best-score preservation, teacher-only reports, no self-promotion.');
}finally{await env.cleanup();}})().catch(e=>{console.error(e);process.exit(1)});
