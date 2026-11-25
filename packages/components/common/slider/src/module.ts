import { Module } from '@tsdi/ioc';
import { SliderComponent } from './slider';

@Module({
    declarations: [SliderComponent],
    exports: [SliderComponent]
})
export class SliderModule {}
