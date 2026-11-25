import { Module } from '@tsdi/ioc';
import { DrawerComponent } from './drawer';

@Module({
    declarations: [DrawerComponent],
    exports: [DrawerComponent]
})
export class DrawerModule {}
