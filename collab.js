import * as Y from 'yjs';
export function shared(value) {
  if(typeof value==='string') return new Y.Text(value);
  if(Array.isArray(value)) { const a=new Y.Array(); a.insert(0,value.map(shared));return a; }
  if(value && typeof value==='object') {const m=new Y.Map();for(const [k,v] of Object.entries(value))m.set(k,shared(v));return m;}
  return new Y.Map([['$',value]]);
}
export function seedUpdate(seed) {
  // A fixed client ID creates identical initialization operations in both browsers.
  // Concurrent first visits therefore merge the same seed rather than duplicating it.
  const d=new Y.Doc(); d.clientID=1; d.getMap('root').set('trip',shared(seed));
  const update=Y.encodeStateAsUpdate(d);d.destroy();return update;
}
export function resolve(root,path) { return path.split('.').reduce((o,k)=>o instanceof Y.Array?o.get(Number(k)):o.get(k),root); }
export function editText(text,value,origin) {
  const old=text.toString();let start=0,end=0;
  while(start<old.length && start<value.length && old[start]===value[start])start++;
  while(end<old.length-start && end<value.length-start && old[old.length-end-1]===value[value.length-end-1])end++;
  text.doc.transact(()=>{if(old.length-start-end)text.delete(start,old.length-start-end);if(value.length-start-end)text.insert(start,value.slice(start,value.length-end));},origin);
}

export function plain(node){if(node instanceof Y.Text)return node.toString();if(node instanceof Y.Array)return node.toArray().map(plain);if(node instanceof Y.Map){if(node.has('$'))return node.get('$');return Object.fromEntries([...node.entries()].map(([k,v])=>[k,plain(v)]));}return node;}
