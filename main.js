import { createClient } from '@liveblocks/client';
import { getYjsProviderForRoom } from '@liveblocks/yjs';
import * as Y from 'yjs';
import { shared, seedUpdate, resolve, editText, plain } from './collab.js';

let client, S, trip, doc, room, provider, me, ready=false, composing=false, queued=false;
let remoteFocus, composition;
let flt='all';
const bindings=new WeakMap();
const ST=['待订','已订','无需'],MD=[['transit','🚇'],['walking','🚶'],['driving','🚗']],TABS=[['plan','行程'],['book','预订'],['check','清单'],['todo','待决定']];
const $=s=>document.querySelector(s);
const H=()=>{const p=(location.hash||'#plan').slice(1).split('-');return{tab:TABS.some(x=>x[0]==p[0])?p[0]:'plan',open:p[1]===undefined?-1:+p[1]}};
let cur=H();
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const gm=l=>'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(l[0])+'&destination='+encodeURIComponent(l[1])+'&travelmode='+(l[2]||'transit');
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2500)}
function sel(p,v,o,r){return '<select data-p="'+p+'"'+(typeof v=='number'?' data-n="1"':'')+' data-r="1">'+o.map((x,i)=>{const val=Array.isArray(x)?x[0]:i,lb=Array.isArray(x)?x[1]:x;return '<option value="'+val+'"'+(val==v?' selected':'')+'>'+lb+'</option>'}).join('')+'</select>'}
function ta(p,v){return '<textarea data-p="'+p+'" rows="'+Math.max(1,String(v||'').split('\n').length)+'">'+esc(v)+'</textarea>'}
function render(){
$('#nav').innerHTML=TABS.map(t=>'<a href="#'+t[0]+'" class="'+(t[0]==cur.tab?'on':'')+'">'+t[1]+'</a>').join('');

let h='';const tab=cur.tab;
if(tab=='plan')S.days.forEach((d,i)=>{
h+='<details data-i="'+i+'"'+(cur.open==i?' open':'')+'><summary><span class="d">'+esc(d.d)+'</span><span class="c">'+esc(d.c)+'</span><span class="b s'+d.st+'">'+ST[d.st]+'</span></summary><div class="body">'
+'<div><label>标题 · 购票状态</label><div style="display:flex;gap:6px"><input type="text" data-p="days.'+i+'.c" data-r="1" value="'+esc(d.c)+'">'+sel('days.'+i+'.st',d.st,ST)+'</div></div>'
+'<div><label>🏨 住宿</label><input type="text" data-p="days.'+i+'.stay" value="'+esc(d.stay)+'"></div>'
+'<div><label>✈️ 大交通</label>'+ta('days.'+i+'.fly',d.fly)+'</div>'
+'<div><label>🗺️ 路线（点按钮用 Google 地图看路线）</label>'+d.legs.map((l,j)=>{const p='days.'+i+'.legs.'+j;return '<div class="leg"><input type="text" data-p="'+p+'.0" data-r="1" placeholder="起点" value="'+esc(l[0])+'"><span>→</span><input type="text" data-p="'+p+'.1" data-r="1" placeholder="终点" value="'+esc(l[1])+'"><div class="r2">'+sel(p+'.2',l[2],MD)+'<input type="text" data-p="'+p+'.3" placeholder="时间/备注" value="'+esc(l[3])+'"><a class="map" href="'+esc(gm(l))+'" target="_blank" rel="noopener">地图</a><button class="x" data-del="'+p+'">×</button></div></div>'}).join('')+'<button data-add="leg.'+i+'">＋ 添加路线</button></div>'
+'<div><label>🎫 票务</label>'+ta('days.'+i+'.tix',d.tix)+'</div><div><label>📝 备注</label>'+ta('days.'+i+'.note',d.note)+'</div></div></details>'});
if(tab=='book'){const n=S.book.filter(b=>b[2]==1).length;h+='<div class="card"><b>已订 '+n+' / '+S.book.length+'</b><div class="bar"><i style="width:'+(n/S.book.length*100)+'%"></i></div></div><div class="row hd"><span>项目</span><span>日期</span><span>状态</span><span>负责人</span><span>订单号 / 链接</span><span></span></div>';
S.book.forEach((b,i)=>{const p='book.'+i;h+='<div class="row"><input type="text" class="wide" data-p="'+p+'.0" value="'+esc(b[0])+'"><input type="text" data-p="'+p+'.1" value="'+esc(b[1])+'">'+sel(p+'.2',b[2],ST)+'<input type="text" data-p="'+p+'.3" placeholder="谁订" value="'+esc(b[3])+'"><input type="text" class="wide" data-p="'+p+'.4" placeholder="订单号/链接" value="'+esc(b[4])+'"><button class="x" data-del="'+p+'">×</button></div>'});
h+='<button data-add="book">＋ 添加</button>'}
if(tab=='check'){const N=S.names,W=[['both','每人各带'],['me',N[0]],['fr',N[1]],['tbd','待分配']];
const cnt=[[0,0],[0,0]];let un=0;S.chk.forEach(g=>g[1].forEach(x=>{if(x[2]=='tbd')un++;if(x[2]=='both'||x[2]=='me'){cnt[0][1]++;cnt[0][0]+=x[1]}if(x[2]=='both'){cnt[1][1]++;cnt[1][0]+=x[3]}else if(x[2]=='fr'){cnt[1][1]++;cnt[1][0]+=x[1]}}));
h+='<div class="card"><div style="display:flex;gap:6px"><input type="text" data-p="names.0" data-r="1" value="'+esc(N[0])+'"><input type="text" data-p="names.1" data-r="1" value="'+esc(N[1])+'"></div>'+[0,1].map(k=>'<div style="margin-top:6px"><b>'+esc(N[k])+' '+cnt[k][0]+' / '+cnt[k][1]+'</b><div class="bar"><i style="width:'+(cnt[k][1]?cnt[k][0]/cnt[k][1]*100:0)+'%"></i></div></div>').join('')+(un?'<div class="note">还有 '+un+' 项待分配：选一个人，或选“每人各带”</div>':'')+'<div class="flt">'+[['all','全部'],[0,N[0]],[1,N[1]]].map(f=>'<a href="#" data-f="'+f[0]+'" class="'+(flt==f[0]?'on':'')+'">'+esc(f[1])+'</a>').join('')+'</div></div>';
S.chk.forEach((g,gi)=>{const vis=g[1].map((it,i)=>[it,i]).filter(v=>flt=='all'||v[0][2]=='both'||v[0][2]=='tbd'||v[0][2]==(flt==0?'me':'fr'));if(!vis.length)return;
h+='<div class="card"><h3>'+esc(g[0])+'</h3>'+vis.map(v=>{const it=v[0],p='chk.'+gi+'.1.'+v[1],both=it[2]=='both',ok=both?it[1]&&it[3]:it[1];
return '<div class="it'+(ok?' done':'')+'"><div class="t"><input type="text" data-p="'+p+'.0" value="'+esc(it[0])+'"><button class="x" data-del="'+p+'">×</button></div><div class="w">'+sel(p+'.2',it[2],W)+'<label class="cb"><input type="checkbox" data-p="'+p+'.1" data-c="1" '+(it[1]?'checked':'')+'>'+(both?esc(N[0]):'已带')+'</label>'+(both?'<label class="cb"><input type="checkbox" data-p="'+p+'.3" data-c="1" '+(it[3]?'checked':'')+'>'+esc(N[1])+'</label>':'')+'</div></div>'}).join('')+'<button data-add="chk.'+gi+'">＋ 添加</button></div>'})}
if(tab=='todo')h+='<div class="card">'+S.todo.map((x,i)=>'<div class="ck'+(x[1]?' done':'')+'"><input type="checkbox" data-p="todo.'+i+'.1" data-c="1" '+(x[1]?'checked':'')+'><input type="text" data-p="todo.'+i+'.0" value="'+esc(x[0])+'"><button class="x" data-del="todo.'+i+'">×</button></div>').join('')+'<button data-add="todo">＋ 添加</button></div>';
$('#root').innerHTML=h;
bindFields()}

function status(){
  const connected=room?.getStatus()==='connected';
  const saved=client?.getSyncStatus()==='synchronized';
  document.querySelector('#mode').textContent=!ready?'正在连接共同手册…':!connected?'连接中断 · 请保持页面打开，等待重新连接':saved?'已同步 · 自动保存':'正在同步 · 请勿关闭页面';
}
function bindFields(){
  document.querySelectorAll('[data-p]').forEach(el=>bindings.set(el,resolve(trip,el.dataset.p)));
  paintPeople();
}
function snapshotFocus(){
  const el=document.activeElement, node=bindings.get(el);
  if(!(node instanceof Y.Text) || typeof el.selectionStart!=='number')return null;
  return {node,start:Y.createRelativePositionFromTypeIndex(node,Math.min(el.selectionStart,node.length)),end:Y.createRelativePositionFromTypeIndex(node,Math.min(el.selectionEnd,node.length)),direction:el.selectionDirection};
}
function refresh(){
  if(composing){queued=true;return;}
  const focus=remoteFocus||snapshotFocus();remoteFocus=null;const scroll=window.scrollY;
  const opened=[...document.querySelectorAll('details[open]')].map(e=>e.dataset.i);
  S=plain(trip);render();
  document.querySelectorAll('details').forEach(e=>{e.open=opened.includes(e.dataset.i)});
  if(focus){const el=[...document.querySelectorAll('[data-p]')].find(e=>bindings.get(e)===focus.node);if(el){el.focus({preventScroll:true});const a=Y.createAbsolutePositionFromRelativePosition(focus.start,doc),b=Y.createAbsolutePositionFromRelativePosition(focus.end,doc);if(a&&b)el.setSelectionRange(a.index,b.index,focus.direction);}}
  window.scrollTo(0,scroll);status();
}
function paintPeople(){
  if(!room||!S)return;
  const users=[{id:me.id,presence:room.getPresence()},...room.getOthers().map(u=>({id:Number(u.id?.replace('editor-','')),presence:u.presence}))];
  document.querySelector('#people').replaceChildren(...users.map(u=>{const span=document.createElement('span');span.className='person';span.textContent=(S.names[u.id-1]||'旅伴')+(u.id===me.id?'（你）':'')+(u.presence.field?' · 正在编辑':' · 在线');return span;}));
  document.querySelectorAll('[data-peer]').forEach(el=>{delete el.dataset.peer;el.removeAttribute('title')});
  for(const u of users.filter(u=>u.id!==me.id&&u.presence.field)){const el=[...document.querySelectorAll('[data-p]')].find(el=>el.dataset.p===u.presence.field);if(el){el.dataset.peer=S.names[u.id-1]||'旅伴';el.title=el.dataset.peer+' 正在编辑此处';}}
}
document.addEventListener('focusin',e=>{if(ready&&e.target.dataset.p)room.updatePresence({field:e.target.dataset.p});});
document.addEventListener('focusout',()=>{if(ready)room.updatePresence({field:null});});
document.addEventListener('compositionstart',e=>{
  composing=true;const node=bindings.get(e.target);
  if(node instanceof Y.Text)composition={node,before:node.toString(),positions:Array.from({length:node.length},(_,i)=>[Y.createRelativePositionFromTypeIndex(node,i,0),Y.createRelativePositionFromTypeIndex(node,i+1,-1)])};
});
document.addEventListener('compositionend',e=>{
  composing=false;
  if(composition){
    const {node,before,positions}=composition,value=e.target.value;let a=0,b=0;
    while(a<before.length&&a<value.length&&before[a]===value[a])a++;
    while(b<before.length-a&&b<value.length-a&&before[before.length-b-1]===value[value.length-b-1])b++;
    const anchor=positions[a]?.[0]||Y.createRelativePositionFromTypeIndex(node,node.length);
    doc.transact(()=>{
      for(let i=before.length-b-1;i>=a;i--){const start=Y.createAbsolutePositionFromRelativePosition(positions[i][0],doc),end=Y.createAbsolutePositionFromRelativePosition(positions[i][1],doc);if(start&&end&&end.index>start.index)node.delete(start.index,end.index-start.index);}
      const at=Y.createAbsolutePositionFromRelativePosition(anchor,doc);if(value.length-a-b&&at)node.insert(at.index,value.slice(a,value.length-b));
    },'typing');
    e.target.value=node.toString();composition=null;
  }else writeText(e.target);
  if(queued){queued=false;refresh();}
});
function writeText(el){
  if(!ready||!el.dataset?.p||composing)return;
  const node=bindings.get(el);if(node instanceof Y.Text)editText(node,el.value,'typing');
}
document.addEventListener('input',e=>writeText(e.target));
document.addEventListener('change',e=>{
  const el=e.target,p=el.dataset?.p;if(!ready||!p)return;
  const node=bindings.get(el);
  if(node instanceof Y.Text){writeText(el);refresh();return;}
  const parts=p.split('.'),key=parts.pop(),parent=resolve(trip,parts.join('.'));
  // An array slot can move while another user inserts/deletes a row. The binding's
  // parent is captured on render, and renders run after every remote transaction.
  const value=el.dataset.c?(el.checked?1:0):el.dataset.n?Number(el.value):el.value;
  doc.transact(()=>{node.set('$',value);},'control');
});
document.addEventListener('click',e=>{
  const el=e.target;
  if(el.dataset?.f!==undefined){e.preventDefault();flt=el.dataset.f==='all'?'all':Number(el.dataset.f);render();return;}
  if(!ready)return;
  if(el.dataset?.del){const parts=el.dataset.del.split('.'),key=Number(parts.pop()),arr=resolve(trip,parts.join('.'));arr.delete(key,1);}
  if(el.dataset?.add){const a=el.dataset.add;let target,value;
    if(a==='book'){target=trip.get('book');value=['新项目','',0,'',''];}
    else if(a==='todo'){target=trip.get('todo');value=['新事项',0];}
    else if(a.startsWith('leg.')){target=trip.get('days').get(Number(a.split('.')[1])).get('legs');value=['','','transit',''];}
    else {target=trip.get('chk').get(Number(a.split('.')[1])).get(1);value=['新项目',0,'tbd',0];}
    target.push([shared(value)]);
  }
});
document.addEventListener('toggle',e=>{const el=e.target;if(el.tagName==='DETAILS'&&el.open){const i=Number(el.dataset.i);if(cur.open!==i){cur.open=i;location.hash='plan-'+i;}}},true);
window.addEventListener('hashchange',()=>{const n=H(),changed=n.tab!==cur.tab;cur=n;if(changed&&ready)render();});
document.querySelector('#logout').onclick=async()=>{await fetch('/api/session',{method:'DELETE'});location.reload();};
document.querySelector('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='europe-trip-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
async function enter(user){
  me=user;document.querySelector('#login').hidden=true;document.querySelector('#logout').hidden=false;
  client=createClient({authEndpoint:'/api/liveblocks-auth',preventUnsavedChanges:true});
  ({room}=client.enterRoom('europe-trip-v1',{initialPresence:{field:null}}));
  provider=getYjsProviderForRoom(room);doc=provider.getYDoc();
  room.subscribe('status',status);room.subscribe('others',paintPeople);room.subscribe('error',()=>{document.querySelector('#mode').textContent='连接失败，请检查服务配置或退出后重新登录';});
  client.events?.syncStatus?.subscribe(status);setInterval(status,500);status();
  const seedResponse=await fetch('/api/seed');if(!seedResponse.ok)throw new Error('无法读取行程，请重新登录');
  const seed=await seedResponse.json();
  const initialize=()=>{
    if(!provider.synced||ready)return;
    if(!doc.getMap('root').has('trip'))Y.applyUpdate(doc,seedUpdate(seed),'initialize');
    trip=doc.getMap('root').get('trip');ready=true;
    doc.on('beforeTransaction',tx=>{if(!tx.local&&!composing)remoteFocus=snapshotFocus();});
    doc.on('afterTransaction',tx=>{
      if(tx.origin==='typing'){S=plain(trip);status();return;}
      refresh();
    });
    S=plain(trip);render();document.querySelector('#export').hidden=false;status();
  };
  provider.on('sync',initialize);initialize();
}
document.querySelector('#login-form').onsubmit=async e=>{
  e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
  try{const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(document.querySelector('#account').value),password:document.querySelector('#password').value})});const data=await response.json();if(!response.ok)throw new Error(data.error);document.querySelector('#password').value='';await enter(data);}
  catch(err){document.querySelector('#error').textContent=err.message;document.querySelector('#login').hidden=false;}
  finally{btn.disabled=false;}
};
fetch('/api/session').then(async r=>{if(r.ok)await enter(await r.json());}).catch(()=>{document.querySelector('#mode').textContent='连接失败，请刷新重试';});
