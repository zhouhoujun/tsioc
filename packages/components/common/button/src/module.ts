import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { ButtonComponent } from './button';
import { ButtonGroupComponent } from './button-group';
import { LinkButtonComponent } from './link-button';

@Module({
    imports: [IconModule],
    declarations: [ButtonComponent, ButtonGroupComponent, LinkButtonComponent],
    exports: [ButtonComponent, ButtonGroupComponent, LinkButtonComponent]
})
export class ButtonModule {}
