(function (root) {
  'use strict';
  const DAY = 86400000;
  const KEY = 'jp_everyday_v02';
  const INTERVALS = [1,3,7,14,30,60];
  const localDate = (time = Date.now()) => {const d=new Date(time);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  function freshState(){return {schema:2,completed:[],cards:{},daily:{},active:null,settings:{romaji:true},legacy:{jp_index:null,jp_done:null,jp02completed:null},created:Date.now()};}
  function normalize(text){return String(text).normalize('NFKC').toLowerCase().replace(/ō/g,'ou').replace(/ū/g,'uu').replace(/ā/g,'aa').replace(/ī/g,'ii').replace(/ē/g,'ee').replace(/[\s。、！？,.!?・’'"“”\-]/g,'');}
  function accepts(text, card){const values=[card.jp,card.romaji,...(card.alternatives||[])];return values.some(v=>normalize(v)===normalize(text)||normalize(v).replace(/ou/g,'o').replace(/uu/g,'u')===normalize(text));}
  function schedule(card,grade,now=Date.now()){
    const next={...card,reps:(card?.reps||0)+1,lastReview:now};
    if(grade==='again'){next.stage=0;next.intervalDays=0;next.due=now+600000;next.lapses=(card?.lapses||0)+1;}
    else if(grade==='hard'){next.stage=Math.max(0,(card?.stage||0)-1);next.intervalDays=1;next.due=now+DAY;}
    else {next.stage=Math.min(INTERVALS.length,(card?.stage||0)+1);next.intervalDays=INTERVALS[next.stage-1];next.due=now+next.intervalDays*DAY;}
    return next;
  }
  function introduced(now=Date.now()){return {stage:0,reps:0,lapses:0,introduced:now,due:now};}
  function migrate(read,curriculum,now=Date.now()){
    const state=freshState();
    ['jp_index','jp_done','jp02completed'].forEach(k=>{state.legacy[k]=read(k);});
    const count=Math.max(0,Math.min(5,Number(state.legacy.jp_done)||0));
    const v1=['hello','meet','mike','legacy-study','goodwill'];
    v1.slice(0,count).forEach(id=>{state.cards[id]={...introduced(now),source:'0.1'};});
    const completed=Math.max(0,Math.min(4,Number(state.legacy.jp02completed)||0));
    const oldLessons=[['hello','yes','no'],['thanks-casual','excuse','please'],['legacy-morning','evening','legacy-night'],['meet']];
    oldLessons.slice(0,completed).flat().forEach(id=>{state.cards[id]??={...introduced(now),source:'earlier 0.2'};});
    if(completed>0)state.completed=['hello'];
    return state;
  }
  function shuffle(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function lessonSteps(lesson,random=Math.random){
    const ids=lesson.words.map(w=>w.id);
    const steps=ids.map(id=>({mode:'learn',id}));
    ['recognize','listen','recall','repeat'].forEach(mode=>shuffle(ids,random).forEach(id=>steps.push({mode,id})));
    lesson.scenes.forEach((scene,index)=>steps.push({mode:'dialogue',id:scene.answer,scene:index}));
    return steps;
  }
  function dueCards(state,now=Date.now()){return Object.keys(state.cards).filter(id=>state.cards[id].due<=now).sort((a,b)=>state.cards[a].due-state.cards[b].due);}
  function nextLesson(state,lessons){return lessons.find(l=>!state.completed.includes(l.id));}
  function isUnlocked(state,lessons,id){const i=lessons.findIndex(l=>l.id===id);return i>=0&&(i===0||state.completed.includes(lessons[i-1].id)||state.completed.includes(id));}
  function validState(s,knownIds,lessonIds){
    if(!s||s.schema!==2||!Array.isArray(s.completed)||!s.completed.every(id=>lessonIds.includes(id))||!s.cards||typeof s.cards!=='object'||Array.isArray(s.cards)||!s.daily||typeof s.daily!=='object'||Array.isArray(s.daily))return false;
    if(!Object.entries(s.cards).every(([id,c])=>knownIds.includes(id)&&c&&Number.isFinite(c.due)&&Number.isInteger(c.stage)&&c.stage>=0&&c.stage<=INTERVALS.length&&Number.isFinite(c.reps)&&c.reps>=0))return false;
    if(!Object.entries(s.daily).every(([key,d])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&d&&Number.isFinite(d.seconds)&&d.seconds>=0&&Number.isFinite(d.answers)&&d.answers>=0&&Array.isArray(d.tasks)&&d.tasks.every(t=>['review','lesson','speaking','dialogue'].includes(t))))return false;
    if(!s.settings||typeof s.settings.romaji!=='boolean'||!s.legacy||typeof s.legacy!=='object')return false;
    if(s.active){const a=s.active;if(!['lesson','review','speaking','dialogue'].includes(a.kind)||!Array.isArray(a.steps)||!a.steps.length||a.steps.length>150||!Number.isInteger(a.cursor)||a.cursor<0||a.cursor>=a.steps.length||!Array.isArray(a.errors)||!a.errors.every(id=>knownIds.includes(id))||!Number.isFinite(a.right)||!Number.isFinite(a.answered)||!Array.isArray(a.retried)||!a.steps.every(x=>x&&knownIds.includes(x.id)&&['learn','recognize','listen','recall','repeat','dialogue','review'].includes(x.mode)))return false;
      if(a.kind==='lesson'&&!lessonIds.includes(a.lessonId))return false;
      if(!a.phase||typeof a.phase!=='object')return false;
      for(const key of ['choices','wrongIds'])if(a.phase[key]&&(!Array.isArray(a.phase[key])||!a.phase[key].every(id=>knownIds.includes(id))))return false;
      if(a.phase.input!==undefined&&typeof a.phase.input!=='string')return false;
      if(a.steps.some(x=>x.mode==='dialogue'&&(!lessonIds.includes(x.lessonId||a.lessonId)||!Number.isInteger(x.scene)||x.scene<0||x.scene>1)))return false;
    }
    return true;
  }
  const engine={KEY,DAY,INTERVALS,localDate,freshState,normalize,accepts,schedule,introduced,migrate,shuffle,lessonSteps,dueCards,nextLesson,isUnlocked,validState};
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;else root.JPEngine=engine;
})(typeof window!=='undefined'?window:globalThis);
