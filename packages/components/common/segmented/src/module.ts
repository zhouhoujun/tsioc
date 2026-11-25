import { Module } from '@tsdi/ioc';
import { SegmentedComponent } from './segmented';

@Module({
    declarations: [SegmentedComponent],
    exports: [SegmentedComponent]
})
export class SegmentedModule {}
