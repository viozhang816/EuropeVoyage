import { Liveblocks } from '@liveblocks/node';
import { currentUser, sameOrigin } from './session.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).end();
  if(!sameOrigin(req)) return res.status(403).end();
  const user=currentUser(req);
  if(!user) return res.status(401).json({error:'请重新登录'});
  if(req.body?.room!=='europe-trip-v1') return res.status(403).end();
  try {
    const liveblocks=new Liveblocks({secret:process.env.LIVEBLOCKS_SECRET_KEY});
    const session=liveblocks.prepareSession('editor-'+user.id,{userInfo:{name:'旅伴 '+user.id}});
    session.allow('europe-trip-v1',session.FULL_ACCESS);
    const {body,status}=await session.authorize();
    res.setHeader('Content-Type','application/json');
    return res.status(status).send(body);
  } catch { return res.status(503).json({error:'协作服务未配置或暂时不可用'}); }
}
