import { Module } from '@tsdi/ioc';
import { PopoverComponent } from './popover';

@Module({
    declarations: [PopoverComponent],
    exports: [PopoverComponent]
})
export class PopoverModule {}
