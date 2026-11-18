import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { BadgeComponent } from './badge';

@Module({
    imports: [IconModule],
    declarations: [BadgeComponent],
    exports: [BadgeComponent]
})
export class BadgeModule {}
