import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { TreeComponent } from './tree';

@Module({
    imports: [IconModule],
    declarations: [TreeComponent],
    exports: [TreeComponent]
})
export class TreeModule {}
