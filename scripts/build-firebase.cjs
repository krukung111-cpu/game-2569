const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'public');fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','style.css','app.js','content.js','firebase-client.js'])fs.copyFileSync(path.join(root,file),path.join(out,file));

const file=path.join(out,'index.html');let html=fs.readFileSync(file,'utf8');html=html.replace('<script src="content.js">','<script type="module" src="firebase-client.js"></script><script src="content.js">');html=html.replace('<script src="app.js"></script>','');fs.writeFileSync(file,html);
console.log('Firebase assets built in public/; server files and private data excluded.');
