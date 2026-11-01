import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import type {PlatformRepository} from '@/domain/platform/repository/PlatformRepository';
import type {Store} from '@/domain/platform/entity/model';
const directory=join(process.cwd(),'.tirani');
const file=join(directory,'local.json');
export function hashPassword(password:string) {const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function initial():Store {return {users:['becauseiloveu@gmail.com','jinyeongiam@gmail.com'].map((email,index)=>({id:`admin-${index+1}`,email,nickname:'관리자',role:'ADMIN',passwordHash:hashPassword('1q2w3e4r!'),emailVerified:true})),templates:[{id:'our-little-channel',name:'우리의 작은 채널',description:'봉투를 열면 시작되는, 빈티지한 우리만의 이야기',price:19900,version:1,renderer:'built-in',html:'',css:'',published:true}],invitations:[],guestbook:[],orders:[],paymentEvents:[],affiliatePolicies:[{id:'policy-1',version:1,discountPercent:5,rewardPercent:5,createdAt:new Date().toISOString(),active:true}],pointEntries:[],referrals:[],redemptions:[],notifications:[],activityEvents:[],emailTemplates:[{key:'verification',subject:'[티라니] 이메일을 인증해 주세요',html:'안녕하세요 {{nickname}}님, {{link}}에서 이메일을 인증해 주세요.'},{key:'welcome',subject:'[티라니] 환영합니다',html:'{{nickname}}님, 티라니에 오신 것을 환영합니다.'}]};}
function normalize(store:Partial<Store>):Store { return {...store,affiliatePolicies:store.affiliatePolicies??[{id:"policy-1",version:1,discountPercent:5,rewardPercent:5,createdAt:new Date().toISOString(),active:true}],pointEntries:store.pointEntries??[],referrals:store.referrals??[],redemptions:store.redemptions??[],notifications:store.notifications??[],activityEvents:store.activityEvents??[]} as Store; }
let queue:Promise<unknown>=Promise.resolve();
export class LocalPlatformRepository implements PlatformRepository {
 async read():Promise<Store>{ try{return normalize(JSON.parse(await readFile(file,'utf8')) as Partial<Store>);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await mkdir(directory,{recursive:true});const data=initial();await writeFile(file,JSON.stringify(data,null,2),{flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST') throw e;});return normalize(JSON.parse(await readFile(file,'utf8')) as Partial<Store>);} }
 update<T>(operation:(store:Store)=>T|Promise<T>):Promise<T>{const next=queue.then(async()=>{const data=await this.read();const result=await operation(data);await mkdir(directory,{recursive:true});const temp=join(directory,`local-${randomBytes(8).toString('hex')}.tmp`);await writeFile(temp,JSON.stringify(data,null,2));await rename(temp,file);return result;});queue=next.catch(()=>{});return next;}
}
