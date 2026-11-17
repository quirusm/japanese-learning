/* No network services, paid APIs, analytics, or account are used by this app. */
(function () {
  'use strict';
  const main=document.getElementById('main'),notice=document.getElementById('notice');
  if(!window.JPEngine||!window.JPCurriculum){main.innerHTML='<section class="panel"><h1>The lesson files did not load.</h1><p>Reconnect to the internet and reopen the app.</p><button onclick="location.reload()">Reload</button></section>';return;}
  const E=window.JPEngine,C=window.JPCurriculum,VERSION='0.2.0';
  const cards=Object.fromEntries([...C.lessons.flatMap(l=>l.words),...C.legacyWords].map(w=>[w.id,w]));
  const ids=Object.keys(cards),lessonIds=C.lessons.map(l=>l.id);
  let storageAvailable=true,protectStorage=false,screen='today',pendingImport=null,utterance=null,registration=null;
  let lastActivity=Date.now(),lastTick=Date.now(),lastUpdate=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notify(message){notice.textContent=message;notice.hidden=!message;}
  function read(key){try{return localStorage.getItem(key);}catch{storageAvailable=false;return null;}}
  function load(){
    const raw=read(E.KEY);
    if(raw){try{const parsed=JSON.parse(raw);if(E.validState(parsed,ids,lessonIds))return parsed;throw new Error('Invalid save');}catch{
      try{localStorage.setItem(E.KEY+'_recovered_'+Date.now(),raw);}catch{protectStorage=true;}
      notify('Your previous save could not be read. A recovery copy is kept when storage is available. You can restore a backup in Settings.');
    }}
    const fresh=E.migrate(read,C);
    try{if(!localStorage.getItem('jp_v02_legacy_snapshot'))localStorage.setItem('jp_v02_legacy_snapshot',JSON.stringify(fresh.legacy));}catch{storageAvailable=false;}
    return fresh;
  }
  let state=load();
  function save(){
    if(protectStorage)return;
    try{localStorage.setItem(E.KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;notify('Progress cannot be saved on this device right now. Keep this page open and export a backup in Settings.');}
  }
  function today(){const key=E.localDate();return state.daily[key]??=( {seconds:0,answers:0,tasks:[]} );}
  function taskDone(task){const d=today();if(!d.tasks.includes(task))d.tasks.push(task);}
  function tick(){
    const now=Date.now(),elapsed=Math.min(5,Math.max(0,(now-lastTick)/1000));lastTick=now;
    if(screen==='session'&&state.active&&!document.hidden&&now-lastActivity<60000){today().seconds+=elapsed;save();}
  }
  function nav(name){tick();screen=name;document.querySelectorAll('[data-nav]').forEach(b=>{if(b.dataset.nav===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();}
  function mount(html,focus=true){main.innerHTML=html;if(focus){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}}
  const button=(action,label,cls='primary',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
  function wordMarkup(card,meaning=true){return `<div class="jp" lang="ja">${esc(card.jp)}</div>${state.settings.romaji?`<p class="romaji">${esc(card.romaji)}</p>`:''}${meaning?`<p class="translation">${esc(card.en)}</p>`:''}`;}
  function audioMarkup(id){return `<div class="audio-row">${button('audio','▶ Hear Japanese','primary',`data-id="${id}"`)}${button('audio','Slow audio','secondary',`data-id="${id}" data-slow="true"`)}</div><p id="audio-status" class="audio-status" role="status"></p>`;}
  function savedPractice(){return state.active?`<section class="panel"><p class="eyebrow">Your place is saved</p><h2>Continue your ${state.active.kind==='lesson'?'lesson':'practice'}</h2><p class="muted">Step ${state.active.cursor+1} of ${state.active.steps.length}. You can return to this whenever you are ready.</p>${button('resume','Resume practice →')}</section>`:'';}
  function legacyMarkup(){
    const old=state.legacy;
    if(!Object.values(old).some(v=>v!==null))return '';
    return `<section class="panel"><h2>Your earlier practice is safe</h2><p class="small muted">Version 0.1: ${Math.max(0,Math.min(5,Number(old.jp_done)||0))} of 5 phrases practised.${old.jp02completed!==null?` Earlier 0.2 draft: ${Math.max(0,Math.min(4,Number(old.jp02completed)||0))} of 4 lessons finished.`:''} Familiar expressions are in your review deck. The new course uses smaller, structured lessons; only an identical old lesson receives completion credit.</p></section>`;
  }
  function renderToday(){
    const d=today(),due=E.dueCards(state).length,next=E.nextLesson(state,C.lessons),mins=Math.floor(d.seconds/60),learned=Object.keys(state.cards).length;
    const primary=state.active?button('resume','Resume practice →'):next&&!d.tasks.includes('lesson')?button('begin-lesson',`${state.completed.length?'Continue learning':'Start lesson 1'} →`,'primary',`data-id="${next.id}"`):button('start-speaking','Keep the words moving →');
    mount(`<section class="hero"><div class="hero-top"><p class="eyebrow">A little Japanese, every day</p><span class="stamp">30-minute routine</span></div><h1>${d.tasks.includes('lesson')?'Make it stick.':'Small steps.<br>Real conversations.'}</h1><p class="muted">${d.tasks.includes('lesson')?'You have met today’s three expressions. Spend the rest of your practice listening, speaking, and recalling.':next?`${state.completed.length?'Up next':'Begin here'}: ${esc(next.title)}. Just three expressions, practised in several ways.`:'You finished the foundation course. Keep your conversations growing through daily review.'}</p>${primary}<div class="daily-meter"><div class="between small"><strong>${mins} / 30 minutes today</strong><span>${due} due for review</span></div><progress max="1800" value="${Math.min(1800,d.seconds)}" aria-label="Daily practice time"></progress></div><p class="stats-line">${state.completed.length} / 16 lessons · ${learned} expressions in your deck</p></section>
      <div class="section-heading"><h2>Your daily rhythm</h2><span class="pill">Go at your pace</span></div><div class="routine">${[
        ['review','↻','Warm up & review',due?`${due} expressions ready`:'Revisit familiar expressions','5 min','start-review'],
        ['lesson','＋','Learn three expressions',d.tasks.includes('lesson')?'Done today · revisit if you like':'One short lesson','10 min','daily-lesson'],
        ['speaking','◌','Listen & say it aloud','Copy the rhythm, then recall','10 min','start-speaking'],
        ['dialogue','↔','Use it in conversation','Choose replies for real situations','5 min','start-dialogue']
      ].map(([key,icon,title,desc,time,action])=>`<button class="routine-item" data-action="${action}"><span class="routine-icon" aria-hidden="true">${d.tasks.includes(key)?'✓':icon}</span><span class="routine-copy"><strong>${title}</strong><small>${desc}</small></span><span class="time">${time}</span></button>`).join('')}</div>
      <p class="small muted" style="margin-top:16px">These are practice targets, not timers for each exercise. Repeat a speaking round or a conversation until your 30 minutes are up. Active time pauses when the app is hidden or idle for a minute.</p>${state.active?savedPractice():''}${legacyMarkup()}`);
  }
  function renderPath(){
    const next=E.nextLesson(state,C.lessons);
    mount(`<p class="eyebrow">Your course</p><h1>From hello to everyday.</h1><p class="muted">16 lessons · 3 expressions each · No prior Japanese needed. Finish a lesson to open the next. Aim for one new lesson a day.</p><progress aria-label="Course progress" value="${state.completed.length}" max="16"></progress>${C.units.map((unit,u)=>`<section class="unit"><div class="unit-heading"><span class="unit-number">${u+1}</span><h2>${unit}</h2></div>${C.lessons.filter(l=>l.unit===u+1).map(l=>{const done=state.completed.includes(l.id),open=E.isUnlocked(state,C.lessons,l.id);return `<button class="lesson-row ${next?.id===l.id?'current':''}" data-action="lesson-info" data-id="${l.id}" ${open?'':'disabled'}><span class="lesson-number">${done?'✓':C.lessons.indexOf(l)+1}</span><span><strong>${esc(l.title)}</strong><small>${esc(l.goal)}</small></span><span class="row-end" aria-label="${done?'Completed':open?'Available':'Locked'}">${open?'›':'○'}</span></button>`;}).join('')}</section>`).join('')}`);
  }
  function lessonInfo(id){
    const l=C.lessons.find(x=>x.id===id);if(!l||!E.isUnlocked(state,C.lessons,id))return;
    screen='lesson-info';mount(`<p class="eyebrow">Unit ${l.unit} · Lesson ${C.lessons.indexOf(l)+1}</p><h1>${esc(l.title)}</h1><p class="muted">${esc(l.goal)}</p><section class="panel"><h2>Just three expressions</h2>${l.words.map(w=>`<div class="word-row"><div class="jp" lang="ja">${esc(w.jp)}</div><p class="muted">${esc(w.en)}</p></div>`).join('')}<p class="phrase-note">${esc(l.tip)}</p>${button('begin-lesson',state.completed.includes(id)?'Practise this lesson →':'Let’s begin →','primary full',`data-id="${id}"`)}</section><p class="small muted">17 short steps: learn, recognise, listen, recall, repeat, and use the expressions in a situation. Mistakes return for another try.</p>`);
  }
  function dateLabel(time){if(time<=Date.now())return 'Ready now';const minutes=Math.ceil((time-Date.now())/60000);if(minutes<60)return `In ${minutes} min`;if(E.localDate(time)===E.localDate())return 'Later today';return new Date(time).toLocaleDateString(undefined,{month:'short',day:'numeric'});}
  function renderReview(){
    const due=E.dueCards(state),learned=Object.keys(state.cards).sort((a,b)=>state.cards[a].due-state.cards[b].due);
    mount(`<p class="eyebrow">Remember a little longer</p><h1>Your review garden.</h1><p class="muted">Recall first, reveal the answer, then honestly rate how it went. Reviews grow from 1 to 3, 7, 14, 30, and 60 days. A forgotten expression returns in 10 minutes.</p><section class="panel"><div class="between"><h2>${due.length} ${due.length===1?'expression':'expressions'} ready</h2><span class="pill">${learned.length} in your deck</span></div><p class="muted small">${due.length?'A short round covers up to 10 expressions.':'Nothing overdue. Early practice is available and keeps your review dates unchanged.'}</p>${button('start-review',due.length?'Start due reviews →':learned.length?'Practise early →':'Start your first lesson →','primary full')}</section>${state.active?savedPractice():''}<section class="panel"><h2>Expressions you have met</h2>${learned.length?learned.map(id=>`<div class="word-row"><div class="between"><div><div class="jp" lang="ja">${esc(cards[id].jp)}</div><p class="muted small">${esc(cards[id].en)}</p></div><span class="pill">${dateLabel(state.cards[id].due)}</span></div>${button('audio','▶ Listen','secondary',`data-id="${id}"`)}</div>`).join(''):'<p class="muted">Your expressions appear here as you learn them.</p>'}</section>`);
  }
  function start(kind,lessonId){
    if(state.active){screen='paused';mount(`<section class="panel"><p class="eyebrow">One small step at a time</p><h1>You have practice in progress.</h1><p class="muted">Finish your saved ${state.active.kind==='lesson'?'lesson':'round'} first. Your place is kept even if you close the app.</p>${button('resume','Resume saved practice →')} ${button('home','Return to today','text-button')}</section>`);return;}
    let steps=[],early=false;
    if(kind==='lesson'){const l=C.lessons.find(x=>x.id===lessonId);if(!l||!E.isUnlocked(state,C.lessons,l.id))return;steps=E.lessonSteps(l);}
    if(kind==='review'){let selected=E.dueCards(state);early=!selected.length;if(early)selected=Object.keys(state.cards);steps=selected.slice(0,10).map(id=>({id,mode:'review'}));}
    if(kind==='speaking')steps=E.shuffle(Object.keys(state.cards)).slice(0,10).map(id=>({id,mode:'repeat'}));
    if(kind==='dialogue')steps=E.shuffle(C.lessons.filter(l=>l.words.every(w=>state.cards[w.id])).flatMap(l=>l.scenes.map((s,i)=>({id:s.answer,mode:'dialogue',scene:i,lessonId:l.id})))).slice(0,8);
    if(!steps.length){const next=E.nextLesson(state,C.lessons)||C.lessons[0];lessonInfo(next.id);return;}
    state.active={kind,lessonId:lessonId||null,steps,cursor:0,phase:{},errors:[],right:0,answered:0,retried:[],early,started:Date.now()};save();screen='session';renderSession();
  }
  function active(){return state.active;}
  function currentStep(){return active()?.steps[active().cursor];}
  function feedbackMarkup(){const p=active().phase;return p.feedback?`<div id="feedback" class="feedback ${p.wrong?'retry':''}" role="status">${esc(p.feedback)}</div>`:'<div id="feedback" role="status"></div>';}
  function addRetry(id){const a=active();if(!a.errors.includes(id))a.errors.push(id);if(a.kind==='lesson'&&!a.retried.includes(id)){a.retried.push(id);a.steps.push({id,mode:'recall',retry:true});}}
  function record(correct){const a=active();if(a.phase.counted)return;a.phase.counted=true;a.answered++;if(correct)a.right++;today().answers++;}
  function choicesFor(step){
    const a=active();if(a.phase.choices)return a.phase.choices;
    const l=C.lessons.find(x=>x.id===(step.lessonId||a.lessonId));
    let pool=l?l.words.map(w=>w.id):Object.keys(state.cards);
    pool=pool.filter(id=>id!==step.id);
    a.phase.choices=E.shuffle([step.id,...E.shuffle(pool).slice(0,2)]);save();return a.phase.choices;
  }
  function renderChoices(step,japanese=false){const p=active().phase;return `<div class="choices">${choicesFor(step).map(id=>`<button class="choice ${p.done&&id===step.id?'correct':''} ${(p.wrongIds||[]).includes(id)?'wrong':''}" data-action="choose" data-id="${id}" ${p.done||(p.wrongIds||[]).includes(id)||(step.mode==='listen'&&!p.heard&&!p.textMode)?'disabled':''}>${japanese?`<span lang="ja">${esc(cards[id].jp)}</span>${state.settings.romaji?`<div class="romaji">${esc(cards[id].romaji)}</div>`:''}`:esc(cards[id].en)}</button>`).join('')}</div>`;}
  function renderSession(focus=true){
    const a=active();if(!a){nav('today');return;}const step=currentStep(),card=cards[step.id],p=a.phase;
    if(!state.cards[step.id]&&step.mode==='learn'){state.cards[step.id]=E.introduced();save();}
    let content='',action='';
    const nextButton=button('next','Continue →','primary full');
    if(step.mode==='learn'){
      content=`<p class="eyebrow">Expression ${a.cursor+1} of 3 · Meet it</p><h1>Listen. Then say it twice.</h1>${wordMarkup(card)}<p class="phrase-note">${esc(card.note)}</p>${audioMarkup(step.id)}`;
      action=button('next','I practised it →','primary full');
    }else if(step.mode==='recognize'){
      content=`<p class="eyebrow">Recognise it</p><h1>What does this mean?</h1>${wordMarkup(card,false)}${renderChoices(step)}${feedbackMarkup()}`;action=p.done?nextButton:'';
    }else if(step.mode==='listen'){
      content=`<p class="eyebrow">${p.textMode?'Reading practice':'Listen for meaning'}</p><h1>${p.textMode?'What does this mean?':'What do you hear?'}</h1>${p.textMode||p.done?wordMarkup(card,false):'<div class="speak-symbol" aria-hidden="true">♪</div><p class="muted">Tap the audio, then choose its meaning. The Japanese stays hidden until you answer.</p>'}${audioMarkup(step.id)}${!p.done&&!p.textMode?button('text-mode','Can’t hear audio? Use text instead','text-button'):''}${renderChoices(step)}${feedbackMarkup()}`;action=p.done?nextButton:'';
    }else if(step.mode==='recall'){
      content=`<p class="eyebrow">${step.retry?'One more try':'Recall it'}</p><h1>How do you say this?</h1><p class="translation">${esc(card.en)}</p><form id="recall-form"><label for="recall-answer" class="small muted">Type romaji or Japanese</label><input id="recall-answer" class="recall-input" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(p.input||'')}" ${p.done?'disabled':''}>${!p.done&&!p.revealed?'<button class="primary full" type="submit">Check answer</button>':''}</form>${!p.done&&!p.revealed?button('reveal-recall','Show answer & practise','text-button'):''}${p.revealed||p.done?`<div class="reveal">${wordMarkup(card)}${audioMarkup(step.id)}</div>`:''}${feedbackMarkup()}`;
      action=p.done?nextButton:p.revealed?button('copy-answer','I said the answer aloud →','primary full'):'';
    }else if(step.mode==='repeat'){
      content=`<p class="eyebrow">Make it feel familiar</p><h1>${p.revealed?'Listen and repeat twice.':'Say it before you look.'}</h1><p class="translation">${esc(card.en)}</p>${p.revealed?`${wordMarkup(card,false)}${audioMarkup(step.id)}<p class="phrase-note">${esc(card.note)}</p><p class="small muted">Say it twice with the audio. Then look away and try it once from memory. This is self-assessed; your microphone is not used.</p>`:'<p class="muted">Try to say it aloud from memory, then check the model.</p>'}`;
      action=p.revealed?button('next','I said it twice →','primary full'):button('reveal','Check the model →','primary full');
    }else if(step.mode==='dialogue'){
      const l=C.lessons.find(x=>x.id===(step.lessonId||a.lessonId)),scene=l.scenes[step.scene];
      content=`<p class="eyebrow">A real-life reply</p><h1>What would you say?</h1><div class="scene">${esc(scene.context)}</div>${renderChoices(step,true)}${p.done?`<p class="phrase-note">Now say your reply aloud. ${esc(card.note)}</p>${audioMarkup(step.id)}`:''}${feedbackMarkup()}`;action=p.done?nextButton:'';
    }else if(step.mode==='review'){
      content=`<p class="eyebrow">${a.early?'Early practice · dates stay the same':'Spaced review'}</p><h1>Try it from memory.</h1><p class="translation">${esc(card.en)}</p><p class="muted small">Say it aloud before revealing the answer.</p>${p.revealed?`<div class="reveal">${wordMarkup(card,false)}${audioMarkup(step.id)}<p class="small muted">${esc(card.note)}</p></div><p class="small">How well did you remember?</p><div class="grade-row">${button('grade',`Again<small>${a.early?'Practice only':'10 minutes'}</small>`,'secondary', 'data-grade="again"')}${button('grade',`Almost<small>${a.early?'Practice only':'1 day'}</small>`,'secondary','data-grade="hard"')}${button('grade',`Got it<small>${a.early?'Practice only':E.schedule(state.cards[step.id],'good').intervalDays+' days'}</small>`,'primary','data-grade="good"')}</div>`:button('reveal','Reveal answer →','primary full')}`;
    }
    const title=a.kind==='lesson'?C.lessons.find(l=>l.id===a.lessonId).title:({review:'Review',speaking:'Speaking practice',dialogue:'Conversation practice'}[a.kind]);
    mount(`<div class="session-top">${button('pause','← Pause','text-button')}<progress aria-label="Session progress" value="${a.cursor}" max="${a.steps.length}"></progress><small>${a.cursor+1} / ${a.steps.length}</small></div><p class="muted small">${esc(title)}</p><section class="exercise">${content}${action?`<div class="action-row">${action}</div>`:''}</section><p class="small muted center">${step.mode==='listen'&&!p.textMode?'Listening uses your device’s Japanese voice.':'No rush. A little repetition goes a long way.'}</p>`,focus);
    const input=document.getElementById('recall-answer');if(input){input.addEventListener('input',()=>{p.input=input.value;save();});document.getElementById('recall-form').addEventListener('submit',event=>{event.preventDefault();checkRecall();});}
  }
  function choose(id){
    const a=active(),step=currentStep(),p=a.phase;if(p.done)return;if(step.mode==='listen'&&!p.heard&&!p.textMode)return;
    if(id===step.id){p.done=true;p.feedback=p.hadError?'You found it. You’ll practise this expression again.':'Yes! That’s right.';p.wrong=false;record(!p.hadError);}
    else{p.hadError=true;p.wrong=true;p.feedback='Not quite. Try another answer. This expression will return for practice.';(p.wrongIds??=[]).push(id);addRetry(step.id);}
    save();renderSession(false);
  }
  function checkRecall(){
    const a=active(),step=currentStep(),p=a.phase;if(p.done||p.revealed)return;
    const answer=document.getElementById('recall-answer').value;p.input=answer;
    if(!answer.trim()){p.feedback='Type an answer, or reveal it to practise.';p.wrong=true;}
    else if(E.accepts(answer,cards[step.id])){p.done=true;p.wrong=false;p.feedback=p.hadError?'That’s it. Keep practising this one.':'You remembered it!';record(!p.hadError);}
    else{p.hadError=true;p.wrong=true;p.feedback='Not quite. Try again, or reveal the answer. Spaces, capitals, and punctuation do not matter.';addRetry(step.id);}
    save();renderSession(false);
  }
  function next(){
    const a=active(),step=currentStep(),p=a.phase;
    if(['recognize','listen','recall','dialogue'].includes(step.mode)&&!p.done)return;
    if(step.mode==='repeat'&&!p.revealed)return;
    tick();
    if(a.cursor+1===a.steps.length){complete();return;}
    a.cursor++;a.phase={};save();renderSession();
  }
  function grade(grade){
    const a=active(),step=currentStep();if(step.mode!=='review'||!a.phase.revealed||!['again','hard','good'].includes(grade))return;
    if(!a.early)state.cards[step.id]=E.schedule(state.cards[step.id],grade);
    record(grade==='good');if(grade==='again'&&!a.errors.includes(step.id))a.errors.push(step.id);
    tick();if(a.cursor+1===a.steps.length){complete();return;}a.cursor++;a.phase={};save();renderSession();
  }
  function complete(){
    const a=active(),lesson=C.lessons.find(l=>l.id===a.lessonId);
    if(a.kind==='lesson'){
      const wasComplete=state.completed.includes(a.lessonId);
      if(!wasComplete)state.completed.push(a.lessonId);
      lesson.words.forEach(w=>{
        if(!wasComplete)state.cards[w.id]=E.schedule(state.cards[w.id]||E.introduced(),a.errors.includes(w.id)?'again':'good');
        else if(a.errors.includes(w.id))state.cards[w.id]=E.schedule(state.cards[w.id],'again');
      });
    }
    taskDone(a.kind);state.active=null;save();screen='complete';
    const title=a.kind==='lesson'?'Three expressions. A real step forward.':'A little more familiar.';
    mount(`<section class="panel center"><div class="complete-mark" aria-hidden="true">✓</div><p class="eyebrow">${a.kind==='lesson'?'Lesson complete':'Practice complete'}</p><h1>${title}</h1><p class="muted">${a.kind==='lesson'?'Your next lesson is unlocked. For today, give these expressions a little more time through speaking and conversation.':a.early?'Early practice is complete. Your scheduled review dates are unchanged.':'Your progress is saved. Repeat a round if you have more practice time today.'}</p>${a.answered?`<div class="summary-grid"><div><strong>${a.right}/${a.answered}</strong><small>recalled first try</small></div><div><strong>${a.errors.length}</strong><small>to practise again</small></div></div>`:''}${a.errors.length?'<p class="small muted">Expressions you found difficult return sooner. You do not have to get everything right at once.</p>':''}<div class="stack">${button('start-speaking','Practise speaking →')}${button('start-dialogue','Try a conversation','secondary')}${button('home','Back to today','text-button')}</div></section>${lesson?`<section class="panel"><h2>Your three expressions</h2>${lesson.words.map(w=>`<div class="word-row">${wordMarkup(w)}${button('audio','▶ Listen','secondary',`data-id="${w.id}"`)}</div>`).join('')}</section>`:''}`);
  }
  function speak(id,slow=false){
    if(!cards[id])return;lastActivity=Date.now();
    const status=document.getElementById('audio-status');const message=text=>{if(status?.isConnected)status.textContent=text;};
    if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){message('Audio is unavailable in this browser. You can use text instead.');notify('Audio is unavailable here. Use the text option for listening exercises.');return;}
    try{
      speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(cards[id].jp);utterance.lang='ja-JP';utterance.rate=slow?.62:.78;
      const voices=speechSynthesis.getVoices(),japanese=voices.find(v=>v.lang.toLowerCase()==='ja-jp')||voices.find(v=>v.lang.toLowerCase().startsWith('ja'));
      if(japanese)utterance.voice=japanese;
      const expected=active(),cursor=expected?.cursor;
      utterance.onstart=()=>{message('Playing Japanese…');if(expected&&active()===expected&&expected.cursor===cursor&&currentStep().mode==='listen'){expected.phase.heard=true;save();document.querySelectorAll('[data-action="choose"]').forEach(b=>{b.disabled=!!expected.phase.done||(expected.phase.wrongIds||[]).includes(b.dataset.id);});}};
      utterance.onend=()=>message('Tap again to listen, or try saying it aloud.');
      utterance.onerror=event=>{if(event.error!=='canceled'&&event.error!=='interrupted')message('Audio did not play. Check your volume and Japanese voice, or use text instead.');};
      message('Starting audio…');speechSynthesis.speak(utterance);
    }catch{message('Audio could not start. Tap again or use text instead.');}
  }
  function exportBackup(){
    tick();const data={app:'Japanese Every Day',version:VERSION,exportedAt:new Date().toISOString(),state,legacyOriginal:state.legacy};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`japanese-every-day-${E.localDate()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function renderSettings(){
    mount(`<p class="eyebrow">Make it yours</p><h1>Your practice, your pace.</h1><section class="panel"><h2>Reading & sound</h2><label class="setting-row"><span><strong>Show romaji</strong><br><small class="muted">Latin-letter pronunciation beside Japanese</small></span><input type="checkbox" id="romaji-toggle" ${state.settings.romaji?'checked':''}></label><p class="muted small">Audio uses the same built-in Japanese speech system as Version 0.1. Tap to play; it never starts automatically.</p>${audioMarkup('hello')}<p class="small muted">If audio is silent, check your volume and try again. Japanese voice availability and offline speech depend on your device. Listening exercises include a text fallback.</p></section><section class="panel"><h2>Keep your progress</h2><p class="small muted">${storageAvailable?'Progress saves automatically in this browser / Home Screen app.':'Device storage is currently unavailable.'} Export a backup before clearing website data or moving to a different device. A new device will not automatically have this progress.</p><div class="stack">${button('export','Export progress backup','secondary')}${button('import','Restore from backup','secondary')}</div><input type="file" id="backup-file" accept="application/json,.json" hidden><div id="import-preview"></div></section><section class="panel"><h2>Version 0.2</h2><p class="small muted">16 lessons · 48 expressions · 4 units. Fully free. No paid services, account, advertising, or tracking.</p><p class="small muted">Your existing Home Screen icon uses this same app address. If it shows an older page, close the app and reopen it while online. Do not delete website data to update.</p>${button('check-update','Check for updates','secondary')}<p id="update-status" class="small muted" role="status"></p></section>${legacyMarkup()}`);
    document.getElementById('romaji-toggle').addEventListener('change',event=>{state.settings.romaji=event.target.checked;save();});
    document.getElementById('backup-file').addEventListener('change',async event=>{
      const file=event.target.files[0];if(!file)return;
      try{if(file.size>2000000)throw new Error();const data=JSON.parse(await file.text());if(data.app!=='Japanese Every Day'||!E.validState(data.state,ids,lessonIds))throw new Error();pendingImport=data.state;
        document.getElementById('import-preview').innerHTML=`<div class="import-preview"><h3>Backup ready to restore</h3><p class="small">${pendingImport.completed.length} completed lessons · ${Object.keys(pendingImport.cards).length} expressions. Restoring replaces the current course progress. A copy of your current save will be kept on this device.</p>${button('confirm-import','Restore this backup','primary')} ${button('cancel-import','Cancel','text-button')}</div>`;
      }catch{pendingImport=null;document.getElementById('import-preview').textContent='This file is not a valid Japanese Every Day progress backup. Your current progress is unchanged.';}
    });
  }
  async function checkUpdate(){
    const status=document.getElementById('update-status');status.textContent='Checking…';
    try{await registration?.update();const response=await fetch('./version.json',{cache:'no-store'});if(!response.ok)throw new Error();const info=await response.json();if(info.version===VERSION)status.textContent='You are using the current version: 0.2.';else{status.textContent='An update is available. Your saved progress will be kept. ';const b=document.createElement('button');b.textContent='Reload update';b.onclick=()=>location.reload();status.appendChild(b);}}catch{status.textContent='Could not check while offline. You can keep practising.';}
  }
  function render(){({today:renderToday,path:renderPath,review:renderReview,settings:renderSettings,session:renderSession}[screen]||renderToday)();}
  document.addEventListener('pointerdown',()=>{lastActivity=Date.now();},{passive:true});document.addEventListener('keydown',()=>{lastActivity=Date.now();});
  document.addEventListener('click',event=>{
    const el=event.target.closest('button');if(!el||el.disabled)return;
    if(el.dataset.nav){nav(el.dataset.nav);return;}
    const action=el.dataset.action,id=el.dataset.id;if(!action)return;
    if(action==='home'){nav('today');return;}if(action==='pause'){nav('today');return;}
    if(action==='resume'){screen='session';renderSession();return;}
    if(action==='lesson-info'){lessonInfo(id);return;}
    if(action==='begin-lesson'){start('lesson',id);return;}
    if(action==='daily-lesson'){const next=E.nextLesson(state,C.lessons);if(today().tasks.includes('lesson'))lessonInfo(state.completed.at(-1)||'hello');else lessonInfo(next?.id||'hello');return;}
    if(action==='start-review'){start('review');return;}if(action==='start-speaking'){start('speaking');return;}if(action==='start-dialogue'){start('dialogue');return;}
    if(action==='audio'){speak(id,el.dataset.slow==='true');return;}
    if(action==='next'){next();return;}if(action==='choose'){choose(id);return;}
    if(action==='reveal'){active().phase.revealed=true;save();renderSession(false);return;}
    if(action==='text-mode'){active().phase.textMode=true;save();renderSession(false);return;}
    if(action==='reveal-recall'){const p=active().phase;p.revealed=true;p.hadError=true;addRetry(currentStep().id);save();renderSession(false);return;}
    if(action==='copy-answer'){active().phase.done=true;record(false);save();next();return;}
    if(action==='grade'){grade(el.dataset.grade);return;}
    if(action==='export'){exportBackup();return;}if(action==='import'){document.getElementById('backup-file').click();return;}
    if(action==='cancel-import'){pendingImport=null;document.getElementById('import-preview').innerHTML='';return;}
    if(action==='confirm-import'&&pendingImport){
      try{localStorage.setItem(E.KEY+'_before_restore',JSON.stringify(state));localStorage.setItem(E.KEY,JSON.stringify(pendingImport));state=pendingImport;pendingImport=null;protectStorage=false;notify('Backup restored. Your current progress was kept as a recovery copy.');nav('today');}catch{notify('The backup could not be saved. Your current progress is unchanged. Export it before trying again.');}return;
    }
    if(action==='check-update')checkUpdate();
  });
  document.addEventListener('visibilitychange',()=>{tick();save();if(document.hidden){if('speechSynthesis' in window)speechSynthesis.cancel();}else{lastActivity=Date.now();if(screen==='today'||screen==='review')render();if(registration&&Date.now()-lastUpdate>3600000){lastUpdate=Date.now();registration.update().catch(()=>{});}}});
  window.addEventListener('pagehide',()=>{tick();save();});
  window.addEventListener('storage',event=>{if(event.key===E.KEY&&event.newValue){try{const other=JSON.parse(event.newValue);if(E.validState(other,ids,lessonIds)){state=other;if(['today','path','review','session'].includes(screen))render();}}catch{}}});
  if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.addEventListener('voiceschanged',()=>speechSynthesis.getVoices());}
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>{registration=r;}).catch(()=>{});});}
  setInterval(tick,5000);save();render();if(!storageAvailable)notify('Device storage is unavailable. Export your progress in Settings before leaving.');
})();
