import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { ButtonComponent } from './button';
import { ButtonGroupComponent } from './button-group';

@Module({
    imports: [IconModule],
    declarations: [ButtonComponent, ButtonGroupComponent],
    exports: [ButtonComponent, ButtonGroupComponent]
})
export class ButtonModule {}
