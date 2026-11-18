import { Module } from '@tsdi/ioc';
import { KbdComponent } from './kbd';

@Module({
    declarations: [KbdComponent],
    exports: [KbdComponent]
})
export class KbdModule {}
