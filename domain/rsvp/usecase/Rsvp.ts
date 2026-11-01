import {randomUUID} from 'node:crypto';
import type {PlatformRepository} from '../../platform/repository/PlatformRepository';
import type {RsvpResponse,User} from '../../platform/entity/model';
export type RsvpInput={name:string;side:RsvpResponse['side'];attending:boolean;guests:number;meal:boolean};
export class Rsvp {
 constructor(private readonly repository:PlatformRepository){}
 async submit(slug:string,input:RsvpInput){const name=input.name.trim();if(!name||name.length>30||!['GROOM','BRIDE','OTHER'].includes(input.side)||typeof input.attending!=='boolean'||typeof input.meal!=='boolean'||!Number.isSafeInteger(input.guests)||input.guests<1||input.guests>20)throw new Error('참석 정보를 확인해 주세요.');return this.repository.update(s=>{const invitation=s.invitations.find(i=>i.slug===slug&&i.status==='PUBLISHED');if(!invitation)throw new Error('공개된 청첩장을 찾을 수 없습니다.');const response:RsvpResponse={id:randomUUID(),invitationId:invitation.id,name,side:input.side,attending:input.attending,guests:input.attending?input.guests:0,meal:input.attending&&input.meal,createdAt:new Date().toISOString()};s.rsvps.push(response);return response;});}
 async list(user:User,invitationId:string){const s=await this.repository.read();if(!s.invitations.some(i=>i.id===invitationId&&i.ownerId===user.id))throw new Error('청첩장을 찾을 수 없습니다.');return s.rsvps.filter(r=>r.invitationId===invitationId);}
 async remove(user:User,invitationId:string,id:string){return this.repository.update(s=>{if(!s.invitations.some(i=>i.id===invitationId&&i.ownerId===user.id))throw new Error('청첩장을 찾을 수 없습니다.');const index=s.rsvps.findIndex(r=>r.id===id&&r.invitationId===invitationId);if(index<0)throw new Error('참석 응답을 찾을 수 없습니다.');s.rsvps.splice(index,1);});}
}
