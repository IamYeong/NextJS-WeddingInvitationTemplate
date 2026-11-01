import {Affiliate} from '@/domain/affiliate/usecase/Affiliate';
import {Platform} from '@/domain/platform/usecase/Platform';
import {LocalPlatformRepository} from '@/data/local/platform/repository/LocalPlatformRepository';
import {LocalPhotoStorage} from '@/data/storage/PhotoStorage';
export const repository=new LocalPlatformRepository();
export const platform=new Platform(repository);
export const photos=new LocalPhotoStorage();

export const affiliate=new Affiliate(repository);
