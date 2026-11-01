import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import sharp from 'sharp';
import type {Photo} from '@/domain/platform/entity/model';
export interface PhotoStorage { save(bytes:Buffer):Promise<Photo> }
export class LocalPhotoStorage implements PhotoStorage {
 async save(bytes:Buffer):Promise<Photo> { if(bytes.length>15*1024*1024)throw new Error('사진은 15MB 이하여야 합니다.');const id=randomUUID();const folder=join(process.cwd(),'public','uploads');await mkdir(folder,{recursive:true});const image=sharp(bytes,{limitInputPixels:40000000}).rotate();const metadata=await image.metadata();if(!['jpeg','png','webp'].includes(metadata.format??''))throw new Error('JPG, PNG, WebP만 업로드할 수 있습니다.');await Promise.all([writeFile(join(folder,`${id}-display.webp`),await image.clone().resize({width:1200,withoutEnlargement:true}).webp({quality:74}).toBuffer()),writeFile(join(folder,`${id}-original.${metadata.format==='jpeg'?'jpg':metadata.format}`),bytes)]);return {id,displayUrl:`/uploads/${id}-display.webp`,originalUrl:`/uploads/${id}-original.${metadata.format==='jpeg'?'jpg':metadata.format}`}; }
}
