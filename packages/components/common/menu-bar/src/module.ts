import { Module } from '@tsdi/ioc';
import { MenuBarComponent } from './menu-bar';

@Module({
    declarations: [MenuBarComponent],
    exports: [MenuBarComponent]
})
export class MenuBarModule {}
