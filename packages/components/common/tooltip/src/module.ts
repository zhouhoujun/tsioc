import { Module } from '@tsdi/ioc';
import { TooltipComponent } from './tooltip';

@Module({
    declarations: [TooltipComponent],
    exports: [TooltipComponent]
})
export class TooltipModule {}
