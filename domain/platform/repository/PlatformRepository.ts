import type {Store} from '../entity/model';
export interface PlatformRepository { read():Promise<Store>; update<T>(operation:(store:Store)=>T|Promise<T>):Promise<T> }
