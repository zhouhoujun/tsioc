import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { TimelineComponent } from './timeline';

@Module({
    imports: [IconModule],
    declarations: [TimelineComponent],
    exports: [TimelineComponent]
})
export class TimelineModule {}
