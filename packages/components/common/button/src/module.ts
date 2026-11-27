import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { ButtonComponent } from './button';
import { ButtonGroupComponent } from './button-group';
import { LinkButtonComponent } from './link-button';
import { ToggleButtonGroupComponent } from './toggle-button-group';

@Module({
    imports: [IconModule],
    declarations: [ButtonComponent, ButtonGroupComponent, LinkButtonComponent, ToggleButtonGroupComponent],
    exports: [ButtonComponent, ButtonGroupComponent, LinkButtonComponent, ToggleButtonGroupComponent]
})
export class ButtonModule {}
