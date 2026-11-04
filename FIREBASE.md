# Career Quest — Firebase Spark + GitHub (แผนฟรี)

## สถานะ
โค้ดเตรียมสำหรับ Spark แล้ว ยังไม่ได้สร้างโปรเจกต์จริงหรือเผยแพร่เว็บ ไม่ใช้ Cloud Functions, Cloud Run, Cloud Build หรือดิสก์ของ Render ไม่ต้องผูกบัตรเพื่อใช้บริการภายในโควตา Spark หากเต็มโควตา บริการอาจปฏิเสธคำขอจนโควตากลับมา ตรวจโควตาและเงื่อนไขปัจจุบันใน Firebase Console

คะแนนคำนวณในเบราว์เซอร์ เหมาะสำหรับฝึกเรียนรู้ ไม่ใช้ยืนยันคะแนนสอบ Rules ตรวจสิทธิ์ รูปแบบ ช่วงคะแนน ความสอดคล้อง และการคงคะแนนสูงสุด แต่ไม่สามารถพิสูจน์คำตอบหรือป้องกันผู้เล่นแก้คะแนนของตนเองให้อยู่ในช่วงที่อนุญาตได้

## ตั้งค่าใน Firebase Console
1. เข้า https://console.firebase.google.com สร้างโปรเจกต์ เลือก Spark ไม่เปิด Blaze และไม่ต้องเปิด Analytics สำหรับเกมนี้ จด Project ID
2. สร้าง Firestore Database แบบ Standard/Native ที่มี Spark quota เลือกภูมิภาคที่เหมาะสม เช่น Singapore และเริ่มด้วย production rules ไม่เปิด test mode
3. Authentication → Sign-in method: เปิด Anonymous และ Email/Password
4. Authentication → Users: สร้างบัญชีครูด้วยอีเมลและรหัสผ่านที่เก็บเป็นส่วนตัว คัดลอก UID ของครู
5. Firestore → Data: สร้าง collection `teachers` และ document ID เป็น UID ของครู เพิ่ม field `enabled` ชนิด **boolean** ค่า **true** การแก้ document นี้ทำโดยผู้ดูแล Console เท่านั้น นักเรียนแก้เองไม่ได้ ไม่ต้องใช้ service-account key สำหรับขั้นนี้
6. Project settings → General: เพิ่ม Web app เกมอ่าน Web config จาก `/__/firebase/init.json` ของ Firebase Hosting เอง ตรวจ Authorized domains ใน Authentication ให้มีโดเมน Hosting ที่ใช้

## เผยแพร่ด้วยเครื่องผู้ดูแล
ใช้ Node.js 22 ขึ้นไป และ Firebase CLI:

```sh
npm install --global firebase-tools@14
firebase login
node scripts/build-firebase.cjs
firebase deploy --only hosting,firestore --project game01-d361e
```

แทน game01-d361e ด้วย ID จริง คำสั่ง deploy เผยแพร่เฉพาะ Hosting กับ Firestore Rules/Indexes ไม่ deploy Functions มี `.firebaserc` กำหนดโปรเจกต์ `game01-d361e` ตามที่เจ้าของแจ้ง ให้ตรวจ ID นี้ก่อน deploy ทุกครั้ง เปิด URL HTTPS ที่ CLI แจ้งหลังสำเร็จ อย่าเปิด index.html โดยตรง

หากเคยเผยแพร่เวอร์ชัน Blaze ไปแล้ว การเปลี่ยนโค้ดไม่ได้ลบ Functions หรือยกเลิกบิลลิง ต้องสำรองข้อมูลและให้เจ้าของตรวจ/ลบทรัพยากรที่คิดเงินก่อนเปลี่ยนแผน ไม่ใช้คำสั่งลบอัตโนมัติในชุดนี้

## GitHub
นำไฟล์โค้ดขึ้น repository `krukung111-cpu/game-2569` โดยไม่รวม `.data/`, `node_modules/`, `public/`, logs หรือคีย์ลับ โฟลเดอร์ public สร้างใหม่จาก build script

Workflow `.github/workflows/firebase.yml` ทดสอบเมื่อเปิด pull request และสั่งรันเองได้ การ deploy ปิดเป็นค่าเริ่มต้น หากต้องการ deploy จาก Actions:

- สร้าง Environment `firebase-production` และกำหนด Required reviewers/branch ที่อนุญาตตามสิทธิ์บัญชี GitHub
- ตั้ง Environment variable `FIREBASE_PROJECT_ID`
- ตั้ง Environment secret `FIREBASE_SERVICE_ACCOUNT` ผ่าน GitHub Settings เท่านั้น เป็นข้อมูลบัญชี deploy ที่ผู้ดูแลสร้างและจำกัดสิทธิ์สำหรับ Hosting กับ Firestore Rules/Indexes ห้ามส่งคีย์ในแชตหรือใส่ Git
- ใช้ Workload Identity Federation แทน JSON key ได้ โดยผู้ดูแลปรับขั้น auth ให้ตรงระบบตนเอง หรือเลือก deploy จากเครื่องผู้ดูแลตามคำสั่งด้านบนซึ่งไม่ต้องสร้าง GitHub secret
- Actions → Test and deploy Firebase → Run workflow เลือก deploy หลังตรวจผลทดสอบและโปรเจกต์แล้วเท่านั้น

Firebase Spark ไม่มีค่าใช้จ่ายภายในโควตา ส่วน GitHub Actions และการเก็บ repository อยู่ภายใต้โควตา/แผน GitHub ของบัญชีเจ้าของ

## ข้อมูลและสิทธิ์
- students/{uid}: ชื่อเต็ม ชั้น เลขที่ best 5 ด่าน และเวลาอัปเดต เจ้าของอ่านของตนเอง ครูอ่านรวมได้ครั้งละไม่เกิน 1,000 คน
- roster/{ชั้น-เลขที่}: กันการลงทะเบียนเลขที่ซ้ำในห้องเดียวกัน สร้างพร้อมโปรไฟล์ด้วย transaction ไม่อนุญาต list หรือแก้ไขจาก client
- leaderboard/{uid}: ชื่อแรก ชั้น ดาว คะแนน ไม่มีชื่อสกุลหรือเลขที่ ทุกบัญชีที่เข้าสู่ระบบอ่านได้ไม่เกิน 30 คนต่อคำขอ ไม่เปิดอ่านให้ผู้ที่ยังไม่เข้าสู่ระบบ บันทึกพร้อม students ใน transaction
- teachers/{uid}: สิทธิ์ครู ผู้ใช้ดูสถานะของตนเองได้ แต่ไม่มี client คนใดเพิ่มหรือแก้สิทธิ์ครูได้
- คงคะแนนดีที่สุด ลำดับด่าน และข้อมูลชื่อ/ชั้น/เลขที่หลังลงทะเบียนไว้ เปลี่ยนข้อมูลเหล่านี้ผ่านผู้ดูแล Console พร้อมปรับ roster และ leaderboard ที่เกี่ยวข้อง

บัญชีครูและนักเรียนใช้ Auth แยกกันในหน้าเดียว ปิดแดชบอร์ดแล้ว sign out บัญชีครูและล้างข้อมูลหน้าจอ โดยไม่ออกจากบัญชีนักเรียน

## ลดการใช้โควตา
กระดานอันดับอ่านสูงสุด 30 คนเมื่อเปิดหน้า/กดอัปเดต/จบด่าน ไม่ใช้ real-time listener แดชบอร์ดครูโหลดเมื่อเข้าสู่ระบบหรือกดอัปเดตเท่านั้น แต่ละครั้งอ่านสูงสุด 1,000 คน ให้ครูส่งออก CSV แล้วใช้งานรายงานออฟไลน์เมื่อเหมาะสม ตรวจ Usage ใน Console เป็นระยะ ไม่เปิดหน้าเกมจำนวนมากทิ้งไว้เพื่อโหลดซ้ำ

## ทดสอบ

```sh
npm ci --prefix tools
npm test
node scripts/build-firebase.cjs
firebase emulators:exec --only auth,firestore,hosting --project demo-career-quest "node scripts/verify-spark.cjs"
```

Emulator ใช้ Java 21 และต้องดาวน์โหลด JAR จาก storage.googleapis.com การทดสอบ Rules นี้ตรวจ transaction การลงทะเบียน เลขที่ซ้ำ ข้อมูลส่วนตัว เงื่อนไขคะแนน การปลอมสิทธิ์ครู และขอบเขตการอ่าน ไม่ใช้โปรเจกต์จริง

`npm test` ทดสอบเนื้อหา เซิร์ฟเวอร์ท้องถิ่นเดิม และไฟล์เผยแพร่ Spark ไม่ทดแทนการรัน Emulator หรือทดสอบโปรเจกต์จริง หาก download ถูกบล็อก ต้องอนุญาตโดเมนแล้วทดสอบ Rules ก่อนใช้งานกับข้อมูลนักเรียนจริง

## ก่อนแจกนักเรียน
ทดลองข้อมูลจำลองบนมือถือและคอมพิวเตอร์ เล่นครบ 5 ด่าน ตรวจคะแนน reload กลับมาเล่นต่อ ตรวจสิทธิ์ครูและ CSV แล้วตรวจ Usage อย่าใช้ข้อมูลนักเรียนจริงจน Rules tests และการทดสอบบนโปรเจกต์เป้าหมายผ่าน

นักเรียนใช้ anonymous account และเบราว์เซอร์เดิม หากล้างข้อมูลหรือออกจากบัญชีจะกลับเข้าบัญชีเดิมด้วยตนเองไม่ได้ รุ่นนี้ยังไม่มีระบบกู้บัญชี ผู้ดูแลต้องจัดการบัญชี/ข้อมูลให้ก่อนเปลี่ยนอุปกรณ์ หากใช้เครื่องร่วมกันใช้โปรไฟล์เบราว์เซอร์แยก

CSV เป็นรายงาน ไม่ใช่ backup และไม่มี UID/token สำหรับกู้บัญชี จัดทำแนวทางสำรอง/เก็บรักษาข้อมูลของโรงเรียนตามความสามารถของแผนฟรี อย่าสมมติว่า Spark มีบริการสำรองอัตโนมัติแบบเสียเงิน การลบบัญชี Auth ไม่ได้ลบ students, roster และ leaderboard ให้เอง

โหมด `npm start` เดิมยังใช้ข้อมูล .data แยกต่างหาก ไม่มีการย้ายคะแนนเดิมเข้า Firestore อัตโนมัติ เอกสาร Render เก็บเป็นทางเลือกเก่า ไม่ใช่ส่วนของ Spark

## โปรเจกต์ของโรงเรียน
Project ID: `game01-d361e`
Firebase Console: https://console.firebase.google.com/project/game01-d361e/overview
ไฟล์ .firebaserc กำหนด default เป็นโปรเจกต์นี้แล้ว การตั้งค่า ID ไม่ใช่การยืนยันสิทธิ์หรือการ deploy สำเร็จ
