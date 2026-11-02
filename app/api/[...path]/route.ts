import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextRequest,NextResponse} from 'next/server';
import {platform,repository,photos,affiliate,rsvp} from '@/presentation/platform/container';
import {hashPassword} from '@/data/local/platform/repository/LocalPlatformRepository';
import {notify,recordActivity} from '@/domain/affiliate/usecase/Affiliate';
import type {User,Template} from '@/domain/platform/entity/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const sessions=new Map<string,string>();
const publicUser=(u:User)=>({id:u.id,email:u.email,nickname:u.nickname,role:u.role,emailVerified:u.emailVerified});
function passwordMatches(password:string,hash:string){const [salt,digest]=hash.split(':');if(!salt||!digest)return false;const actual=scryptSync(password,salt,64);const expected=Buffer.from(digest,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
async function currentUser(){const token=(await cookies()).get('tirani-session')?.value;const userId=token?sessions.get(token):undefined;return (await platform.read()).users.find(u=>u.id===userId);}
function required(user:User|undefined){if(!user)throw new Error('로그인이 필요합니다.');return user;}
function admin(user:User|undefined){const u=required(user);if(u.role!=='ADMIN')throw new Error('관리자만 이용할 수 있습니다.');return u;}
function assertLocal(){if(process.env.NODE_ENV==='production')throw new Error('로컬 데모 저장소는 운영 환경에서 사용할 수 없습니다.');}
function errorResponse(error:unknown){return NextResponse.json({error:error instanceof Error?error.message:'요청을 처리하지 못했습니다.'},{status:400});}
async function route(req:NextRequest, context:{params:Promise<{path:string[]}>}) {
 try {assertLocal();const path=(await context.params).path;const key=path.join('/');const method=req.method;const user=await currentUser();
 if(method==='GET'){
  const s=await platform.read();
  if(key==='me')return NextResponse.json({user:user?publicUser(user):null});
  if(key==='referral-quote'){const owner=s.users.find(x=>x.id===req.nextUrl.searchParams.get('ref')&&x.id!==user?.id);const policy=owner?s.affiliatePolicies.find(p=>p.active):null;return NextResponse.json({discountPercent:policy?.discountPercent??0});}
  if(key==='affiliate')return NextResponse.json(await affiliate.dashboard(required(user)));
  if(key==='notifications'){const u=required(user);return NextResponse.json(s.notifications.filter(n=>n.userId===u.id).reverse());}
  if(key.startsWith('rsvp/'))return NextResponse.json(await rsvp.list(required(user),path[1]));
  if(key==='templates')return NextResponse.json(s.templates.filter(t=>t.published));
  if(key==='mine'){const u=required(user);return NextResponse.json({invitations:s.invitations.filter(i=>i.ownerId===u.id),orders:s.orders.filter(o=>o.userId===u.id)});}
  if(key.startsWith('invitation/')){const i=s.invitations.find(x=>x.id===path[1]&&x.ownerId===user?.id);if(!i)throw new Error('청첩장을 찾을 수 없습니다.');return NextResponse.json(i);}
  if(key.startsWith('public/')){const i=s.invitations.find(x=>x.slug===path[1]&&x.status==='PUBLISHED');if(!i)throw new Error('공개된 청첩장을 찾을 수 없습니다.');return NextResponse.json({invitation:i,guestbook:s.guestbook.filter(g=>g.invitationId===i.id)});}
  if(key==='admin'){admin(user);return NextResponse.json({templates:s.templates,users:s.users.map(publicUser),orders:s.orders,events:s.paymentEvents,emailTemplates:s.emailTemplates,policies:s.affiliatePolicies,referrals:s.referrals,pointEntries:s.pointEntries,redemptions:s.redemptions,activityEvents:s.activityEvents});}
  throw new Error('요청을 찾을 수 없습니다.');
 }
 if(key==='upload'){const u=required(user);const data=await req.formData();const id=String(data.get('invitationId')??'');const file=data.get('file');if(!(file instanceof File))throw new Error('사진을 선택해 주세요.');const s=await platform.read();if(!s.invitations.some(i=>i.id===id&&i.ownerId===u.id))throw new Error('청첩장을 찾을 수 없습니다.');const photo=await photos.save(Buffer.from(await file.arrayBuffer()));await repository.update(store=>{const i=store.invitations.find(x=>x.id===id&&x.ownerId===u.id);if(!i)throw new Error('청첩장을 찾을 수 없습니다.');i.photos.push(photo);});return NextResponse.json(photo);}
 const body=await req.json();
 if(key==='login'){const email=String(body.email??'').trim().toLowerCase();const s=await platform.read();const u=s.users.find(x=>x.email===email);if(!u||!passwordMatches(String(body.password??''),u.passwordHash))throw new Error('이메일 또는 비밀번호를 확인해 주세요.');const token=randomBytes(32).toString('hex');sessions.set(token,u.id);(await cookies()).set('tirani-session',token,{httpOnly:true,sameSite:'lax',secure:false,path:'/',maxAge:60*60*24});return NextResponse.json({user:publicUser(u)});}
 if(key==='logout'){const jar=await cookies();const token=jar.get('tirani-session')?.value;if(token)sessions.delete(token);jar.delete('tirani-session');return NextResponse.json({ok:true});}
 if(key==='register'){const email=String(body.email??'').trim().toLowerCase(),password=String(body.password??''),nickname=String(body.nickname??'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||!nickname)throw new Error('이메일, 닉네임, 8자 이상 비밀번호를 입력해 주세요.');await repository.update(s=>{if(s.users.some(x=>x.email===email))throw new Error('이미 등록된 이메일입니다.');s.users.push({id:randomUUID(),email,nickname,role:'USER',passwordHash:hashPassword(password),emailVerified:false});});return NextResponse.json({ok:true});}
 if(key==='account'){const u=required(user);await repository.update(s=>{const target=s.users.find(x=>x.id===u.id)!;if(!passwordMatches(String(body.currentPassword??''),target.passwordHash))throw new Error('현재 비밀번호를 확인해 주세요.');const email=String(body.email??'').trim().toLowerCase();const nickname=String(body.nickname??'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!nickname)throw new Error('이메일과 닉네임을 확인해 주세요.');if(s.users.some(x=>x.email===email&&x.id!==u.id))throw new Error('이미 등록된 이메일입니다.');if(target.email!==email)target.emailVerified=false;target.email=email;target.nickname=nickname;if(body.newPassword){if(String(body.newPassword).length<8)throw new Error('새 비밀번호는 8자 이상이어야 합니다.');target.passwordHash=hashPassword(body.newPassword);}});return NextResponse.json({ok:true});}
 if(key==='invitations'){return NextResponse.json(await platform.createInvitation(required(user),String(body.templateId)));}
 if(key==='save'){return NextResponse.json(await platform.saveInvitation(required(user),String(body.id),body));}
 if(key==='purchase')return NextResponse.json(await platform.purchase(required(user),String(body.id),String(body.referrerId??''),Number(body.points??0)));
 if(key==='affiliate/redeem')return NextResponse.json(await affiliate.redeem(required(user),Number(body.points),body.provider));
 if(key==='affiliate/cancel')return NextResponse.json(await affiliate.cancelRedemption(required(user),String(body.id)));
 if(key==='notifications/read'){await affiliate.markRead(required(user),String(body.id));return NextResponse.json({ok:true});}
 if(key==='admin/notify'){const actor=admin(user);const message=String(body.message??'').trim().slice(0,500);if(!message)throw new Error('알림 내용을 입력해 주세요.');await repository.update(s=>{const recipients=body.userId?s.users.filter(x=>x.id===body.userId):s.users;if(!recipients.length)throw new Error('수신자를 찾을 수 없습니다.');for(const recipient of recipients)notify(s,recipient.id,message);recordActivity(s,'admin_notification',actor.id,{recipients:recipients.length});});return NextResponse.json({ok:true});}
 if(key==='admin/policy'){admin(user);return NextResponse.json(await affiliate.createPolicy(Number(body.discountPercent),Number(body.rewardPercent)));}
 if(key==='claim-draft'){const u=required(user);const i=await platform.createInvitation(u,String(body.templateId));return NextResponse.json(await platform.saveInvitation(u,i.id,body.values??{}));}
 if(key==='publish')return NextResponse.json(await platform.publish(required(user),String(body.id)));
 if(key==='delete-photo'){const u=required(user);await repository.update(s=>{const i=s.invitations.find(x=>x.id===body.id&&x.ownerId===u.id);if(!i)throw new Error('청첩장을 찾을 수 없습니다.');i.photos=i.photos.filter(p=>p.id!==body.photoId);});return NextResponse.json({ok:true});}
 if(key==='rsvp'){const {slug,name,side,attending,guests,meal}=body;await rsvp.submit(String(slug??''),{name:String(name??''),side,attending,guests:Number(guests),meal});return NextResponse.json({ok:true});}
 if(key==='rsvp/delete'){await rsvp.remove(required(user),String(body.invitationId),String(body.id));return NextResponse.json({ok:true});}
 if(key==='guestbook'){const author=String(body.author??'').trim().slice(0,30),message=String(body.message??'').trim().slice(0,500);if(!author||!message)throw new Error('이름과 메시지를 입력해 주세요.');await repository.update(s=>{const i=s.invitations.find(x=>x.slug===body.slug&&x.status==='PUBLISHED');if(!i)throw new Error('청첩장을 찾을 수 없습니다.');s.guestbook.push({id:randomUUID(),invitationId:i.id,author,message,createdAt:new Date().toISOString()});});return NextResponse.json({ok:true});}
 if(key==='admin/template'){admin(user);await repository.update(s=>{const name=String(body.name??'').trim();if(!name)throw new Error('템플릿 이름을 입력해 주세요.');const previous=s.templates.find(t=>t.id===body.id);const t:Template={id:previous?.id??randomUUID(),name,description:String(body.description??''),price:Math.max(0,Math.floor(Number(body.price)||0)),version:(previous?.version??0)+1,renderer:'html',html:String(body.html??''),css:String(body.css??''),published:!!body.published};if(previous)Object.assign(previous,t);else s.templates.push(t);});return NextResponse.json({ok:true});}
 if(key==='admin/email'){admin(user);await repository.update(s=>{const t=s.emailTemplates.find(x=>x.key===body.key);if(!t)throw new Error('이메일 템플릿을 찾을 수 없습니다.');t.subject=String(body.subject??'');t.html=String(body.html??'');});return NextResponse.json({ok:true});}
 if(key==='admin/refund'){admin(user);return NextResponse.json(await platform.refund(String(body.id),Number(body.amount)));}
 throw new Error('요청을 찾을 수 없습니다.');
 }catch(e){return errorResponse(e);}
}
export const GET=route;export const POST=route;
