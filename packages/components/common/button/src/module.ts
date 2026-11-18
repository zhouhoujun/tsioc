import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { ButtonComponent } from './button';

@Module({
    imports: [IconModule],
    declarations: [ButtonComponent],
    exports: [ButtonComponent]
})
export class ButtonModule {}
