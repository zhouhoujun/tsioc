import { Module } from '@tsdi/ioc';
import { SkeletonComponent } from './skeleton';

@Module({
    declarations: [SkeletonComponent],
    exports: [SkeletonComponent]
})
export class SkeletonModule {}
