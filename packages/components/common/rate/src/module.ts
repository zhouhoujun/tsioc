import { Module } from '@tsdi/ioc';
import { RateComponent } from './rate';

@Module({
    declarations: [RateComponent],
    exports: [RateComponent]
})
export class RateModule {}
