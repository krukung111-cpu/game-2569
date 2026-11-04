const test=require('node:test');
const assert=require('node:assert/strict');
const stages=require('./content.js');
test('five stages provide fifteen valid questions with unique choices and explanations',()=>{
 assert.equal(stages.length,5);
 for(const stage of stages){assert.equal(stage.questions.length,3);for(const [prompt,options,answer,explanation] of stage.questions){assert.ok(prompt.length>10);assert.equal(options.length,3);assert.equal(new Set(options).size,3);assert.ok(Number.isInteger(answer)&&answer>=0&&answer<3);assert.ok(explanation.length>20);}}
 assert.equal(stages.reduce((n,s)=>n+s.questions.length*100,0),1500);
});
