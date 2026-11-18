import { Module } from '@tsdi/ioc';
import { SwitchComponent } from './switch';

@Module({
    declarations: [SwitchComponent],
    exports: [SwitchComponent]
})
export class SwitchModule {}
