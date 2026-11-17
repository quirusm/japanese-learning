const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../curriculum.js');
const words=[...C.lessons.flatMap(l=>l.words),...C.legacyWords],ids=words.map(w=>w.id),lessons=C.lessons.map(l=>l.id),now=1700000000000;
test('all 16 lessons introduce exactly 3 unique expressions and valid situations',()=>{
  assert.equal(C.lessons.length,16);assert.equal(new Set(ids).size,ids.length);
  C.lessons.forEach(l=>{assert.equal(l.words.length,3);assert.equal(E.lessonSteps(l).length,17);l.scenes.forEach(s=>assert.ok(l.words.some(w=>w.id===s.answer)));assert.equal(new Set(E.lessonSteps(l).map(x=>x.mode)).size,6);});
});
test('v0.1 migration preserves original values, imports every practised phrase without inventing mastery',()=>{
  const old={jp_index:'4',jp_done:'5',jp02completed:null};
  const s=E.migrate(k=>old[k]??null,C,now);
  assert.deepEqual(s.legacy,old);assert.equal(Object.keys(s.cards).length,5);assert.equal(s.completed.length,0);assert.ok(s.cards['legacy-study']);assert.equal(E.dueCards(s,now).length,5);assert.ok(E.validState(s,ids,lessons));assert.deepEqual(old,{jp_index:'4',jp_done:'5',jp02completed:null});
});
test('partial v0.1 practice imports only practised phrases',()=>{
  const s=E.migrate(k=>({jp_index:'2',jp_done:'2'}[k]??null),C,now);
  assert.deepEqual(Object.keys(s.cards),['hello','meet']);assert.equal(s.legacy.jp_index,'2');
});
test('earlier v0.2 draft credits identical first lesson and keeps full old completion count',()=>{
  const s=E.migrate(k=>k==='jp02completed'?'4':null,C,now);
  assert.deepEqual(s.completed,['hello']);assert.equal(s.legacy.jp02completed,'4');assert.equal(Object.keys(s.cards).length,10);assert.ok(E.isUnlocked(s,C.lessons,'polite'));assert.ok(!E.isUnlocked(s,C.lessons,'greetings'));assert.ok(E.validState(s,ids,lessons));
});
test('spaced repetition grows 1,3,7,14,30,60 days and caps at 60',()=>{
  let c=E.introduced(now);[1,3,7,14,30,60,60].forEach(days=>{c=E.schedule(c,'good',now);assert.equal(c.due,now+days*E.DAY);assert.equal(c.intervalDays,days);});
  const again=E.schedule(c,'again',now);assert.equal(again.due,now+600000);assert.equal(again.stage,0);assert.equal(again.lapses,1);
  const hard=E.schedule(c,'hard',now);assert.equal(hard.due,now+E.DAY);assert.ok(hard.stage<c.stage);
});
test('due queue respects exact due time and oldest first',()=>{
  const s=E.freshState();s.cards={hello:{...E.introduced(now),due:now},yes:{...E.introduced(now),due:now-10},no:{...E.introduced(now),due:now+1}};
  assert.deepEqual(E.dueCards(s,now),['yes','hello']);
});
test('romaji and Japanese recall tolerate punctuation, capitals, spaces and long vowel spelling',()=>{
  const get=id=>words.find(w=>w.id===id);
  ['Maiku desu.','MAIKUDESU','マイクです。'].forEach(a=>assert.ok(E.accepts(a,get('mike'))));
  ['arigatou gozaimasu','arigato gozaimasu','Arigatō gozaimasu'].forEach(a=>assert.ok(E.accepts(a,get('thanks'))));
  ['koohii o kudasai','kōhī o kudasai','kohii o kudasai'].forEach(a=>assert.ok(E.accepts(a,get('coffee'))));
  assert.ok(!E.accepts('hello',get('hello')));assert.ok(!E.accepts('',get('mike')));
});
test('save validation rejects malformed or incompatible restores and retains resumable state',()=>{
  const s=E.freshState();s.cards.hello=E.introduced(now);s.active={kind:'lesson',lessonId:'hello',steps:E.lessonSteps(C.lessons[0]),cursor:8,phase:{heard:true},errors:[],right:2,answered:3,retried:[],early:false};
  assert.ok(E.validState(JSON.parse(JSON.stringify(s)),ids,lessons));
  for(const mutate of [x=>x.cards.hello.due='tomorrow',x=>x.active.cursor=100,x=>x.active.steps[0].id='missing',x=>x.daily.bad={seconds:1,answers:1,tasks:[]},x=>x.completed=['missing']]){const bad=JSON.parse(JSON.stringify(s));mutate(bad);assert.ok(!E.validState(bad,ids,lessons));}
});
test('lesson progression opens only the next lesson',()=>{
  const s=E.freshState();assert.equal(E.nextLesson(s,C.lessons).id,'hello');assert.ok(E.isUnlocked(s,C.lessons,'hello'));assert.ok(!E.isUnlocked(s,C.lessons,'polite'));s.completed.push('hello');assert.equal(E.nextLesson(s,C.lessons).id,'polite');assert.ok(E.isUnlocked(s,C.lessons,'polite'));assert.ok(!E.isUnlocked(s,C.lessons,'greetings'));
});
