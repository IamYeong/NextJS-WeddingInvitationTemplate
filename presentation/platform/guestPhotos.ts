/** Local guest draft images stay in IndexedDB until the owner signs in. */
type DraftPhoto = { id:string; draftId:string; file:File };
const DATABASE='tirani-guest-drafts';
const STORE='photos';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transact<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason?:unknown)=>void)=>void):Promise<T>{const db=await database();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(STORE,mode);let value:T;work(tx.objectStore(STORE),result=>{value=result},reject);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export function guestDraftId():string{let id=sessionStorage.getItem('tirani-draft-id');if(!id){id=crypto.randomUUID();sessionStorage.setItem('tirani-draft-id',id);}return id;}
export function addGuestPhoto(file:File):Promise<DraftPhoto>{const photo={id:crypto.randomUUID(),draftId:guestDraftId(),file};return transact('readwrite',(store,resolve,reject)=>{const request=store.put(photo);request.onsuccess=()=>resolve(photo);request.onerror=()=>reject(request.error)});}
export function listGuestPhotos():Promise<DraftPhoto[]>{const draftId=guestDraftId();return transact('readonly',(store,resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve((request.result as DraftPhoto[]).filter(photo=>photo.draftId===draftId));request.onerror=()=>reject(request.error)});}
export function removeGuestPhoto(id:string):Promise<void>{return transact('readwrite',(store,resolve,reject)=>{const request=store.delete(id);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});}
