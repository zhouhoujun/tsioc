import { Module } from '@tsdi/ioc';
import { DividerComponent } from './divider';

@Module({
    declarations: [DividerComponent],
    exports: [DividerComponent]
})
export class DividerModule {}
