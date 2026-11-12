import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { MenuBarComponent } from './menu-bar';

@Module({
    imports: [IconModule],
    declarations: [MenuBarComponent],
    exports: [MenuBarComponent]
})
export class MenuBarModule {}
