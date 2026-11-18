import { Module } from '@tsdi/ioc';
import { ProgressComponent } from './progress';

@Module({
    declarations: [ProgressComponent],
    exports: [ProgressComponent]
})
export class ProgressModule {}
