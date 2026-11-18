import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { AvatarComponent } from './avatar';

@Module({
    imports: [IconModule],
    declarations: [AvatarComponent],
    exports: [AvatarComponent]
})
export class AvatarModule {}
