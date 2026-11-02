import {randomUUID} from 'node:crypto';
import {balance,notify,recordActivity} from '../../affiliate/usecase/Affiliate';
import type {PlatformRepository} from '../repository/PlatformRepository';
import type {Invitation, User} from '../entity/model';
export class Platform {
  constructor(private readonly repository:PlatformRepository) {}
  read() { return this.repository.read(); }
  async createInvitation(user:User, templateId:string) { return this.repository.update(s=>{const t=s.templates.find(x=>x.id===templateId&&x.published); if(!t) throw new Error('템플릿을 찾을 수 없습니다.'); const invitation:Invitation={id:randomUUID(),ownerId:user.id,templateId:t.id,templateVersion:t.version,slug:randomUUID(),status:'DRAFT',title:'우리 결혼합니다',partner1:'',partner2:'',eventDate:'',venue:'',address:'',greeting:'서로의 곁에서 함께할 새로운 시작에 초대합니다.',account:'',photos:[],templateSnapshot:{renderer:t.renderer,html:t.html,css:t.css},createdAt:new Date().toISOString()}; s.invitations.push(invitation); return invitation;}); }
  async saveInvitation(user:User,id:string,values:Partial<Invitation>) { return this.repository.update(s=>{const i=s.invitations.find(x=>x.id===id&&x.ownerId===user.id); if(!i) throw new Error('청첩장을 찾을 수 없습니다.'); for(const key of ['title','partner1','partner2','eventDate','venue','address','greeting','account'] as const) if(typeof values[key]==='string') i[key]=values[key].slice(0,2000); return i;}); }
  async purchase(user:User,id:string,referrerId?:string,requestedPoints=0) { return this.repository.update(s=>{
    const i=s.invitations.find(x=>x.id===id&&x.ownerId===user.id);if(!i)throw new Error('청첩장을 찾을 수 없습니다.');
    const existing=s.orders.find(x=>x.invitationId===id&&(x.status==='PAID'||x.status==='PARTIALLY_REFUNDED'));if(existing)return existing;
    const t=s.templates.find(x=>x.id===i.templateId);if(!t)throw new Error('템플릿을 찾을 수 없습니다.');
    if(!Number.isSafeInteger(requestedPoints)||requestedPoints<0)throw new Error('포인트 금액을 확인해 주세요.');
    const referrer=s.users.find(x=>x.id===referrerId&&x.id!==user.id);const policy=referrer?s.affiliatePolicies.find(x=>x.active):undefined;
    const discount=policy?Math.floor(t.price*policy.discountPercent/100):0;const available=Math.max(0,balance(s,user.id));
    if(requestedPoints>available||requestedPoints>t.price-discount)throw new Error('사용 가능한 포인트를 확인해 주세요.');
    const amount=t.price-discount-requestedPoints;const now=new Date().toISOString();const order={id:randomUUID(),userId:user.id,invitationId:id,originalAmount:t.price,referralDiscount:discount,pointsUsed:requestedPoints,policyId:policy?.id,amount,status:'PAID' as const,createdAt:now,provider:'LOCAL_MOCK' as const,refundedAmount:0};s.orders.push(order);
    s.paymentEvents.push({id:randomUUID(),orderId:order.id,type:'MOCK_PAYMENT_SUCCEEDED',amount,createdAt:now});
    if(requestedPoints)s.pointEntries.push({id:randomUUID(),userId:user.id,orderId:order.id,kind:'PURCHASE_SPEND',amount:-requestedPoints,createdAt:now});
    if(referrer&&policy){const reward=Math.floor(amount*policy.rewardPercent/100);s.referrals.push({id:randomUUID(),ownerId:referrer.id,buyerId:user.id,orderId:order.id,policyId:policy.id,buyerEmail:user.email,cashPaid:amount,discount,reward,createdAt:now});if(reward)s.pointEntries.push({id:randomUUID(),userId:referrer.id,orderId:order.id,kind:'REFERRAL_REWARD',amount:reward,createdAt:now});notify(s,referrer.id,`추천 결제로 ${reward.toLocaleString('ko-KR')} 포인트가 적립되었습니다.`);}
    notify(s,user.id,'모의 결제가 완료되었습니다. 청첩장을 발행할 수 있어요.');recordActivity(s,'mock_purchase',user.id,{amount,discount,points:requestedPoints});return order;
  }); }
  async refund(orderId:string,amount:number) {return this.repository.update(s=>{const o=s.orders.find(x=>x.id===orderId);if(!o||o.status==='REFUNDED'||!Number.isSafeInteger(amount)||amount<0||amount>o.amount-o.refundedAmount||(amount===0&&o.amount!==0))throw new Error('환불 금액을 확인해 주세요.');
    o.refundedAmount+=amount;const full=o.refundedAmount===o.amount;o.status=full?'REFUNDED':'PARTIALLY_REFUNDED';const now=new Date().toISOString();s.paymentEvents.push({id:randomUUID(),orderId:o.id,type:'MOCK_REFUND',amount,createdAt:now});
    const referral=s.referrals.find(r=>r.orderId===o.id);if(referral&&o.amount){const previous=-s.pointEntries.filter(p=>p.orderId===o.id&&p.kind==='REFUND_REWARD_REVERSAL').reduce((sum,p)=>sum+p.amount,0);const target=Math.floor(referral.reward*o.refundedAmount/o.amount);const delta=target-previous;if(delta)s.pointEntries.push({id:randomUUID(),userId:referral.ownerId,orderId:o.id,kind:'REFUND_REWARD_REVERSAL',amount:-delta,createdAt:now});}
    if(o.pointsUsed){const previous=s.pointEntries.filter(p=>p.orderId===o.id&&p.kind==='REFUND_POINT_RETURN').reduce((sum,p)=>sum+p.amount,0);const target=o.amount===0?o.pointsUsed:Math.floor(o.pointsUsed*o.refundedAmount/o.amount);const delta=target-previous;if(delta)s.pointEntries.push({id:randomUUID(),userId:o.userId,orderId:o.id,kind:'REFUND_POINT_RETURN',amount:delta,createdAt:now});}
    if(full){const i=s.invitations.find(x=>x.id===o.invitationId);if(i)i.status='DRAFT';}notify(s,o.userId,`${amount.toLocaleString('ko-KR')}원 모의 환불이 처리되었습니다.`);recordActivity(s,'mock_refund',o.userId,{amount});return o;});}
  async publish(user:User,id:string) {return this.repository.update(s=>{const i=s.invitations.find(x=>x.id===id&&x.ownerId===user.id);if(!i) throw new Error('청첩장을 찾을 수 없습니다.');if(!s.orders.some(x=>x.invitationId===id&&(x.status==='PAID'||x.status==='PARTIALLY_REFUNDED')))throw new Error('발행하려면 결제가 필요합니다.');if(!i.partner1||!i.partner2||!i.eventDate||!i.venue)throw new Error('두 분의 이름, 예식 일시와 장소를 입력해 주세요.');i.status='PUBLISHED';return i;});}
}
