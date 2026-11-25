import { Module } from '@tsdi/ioc';
import { TreeModule } from '../../tree/src/module';
import { TreeSelectComponent } from './tree-select';

@Module({
    imports: [TreeModule],
    declarations: [TreeSelectComponent],
    exports: [TreeSelectComponent]
})
export class TreeSelectModule {}
