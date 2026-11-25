import { Module } from '@tsdi/ioc';
import { CascaderComponent } from './cascader';

@Module({
    declarations: [CascaderComponent],
    exports: [CascaderComponent]
})
export class CascaderModule {}
