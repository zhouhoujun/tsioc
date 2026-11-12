import { Module } from '@tsdi/ioc';
import { SelectComponent } from './select';

@Module({
    declarations: [SelectComponent],
    exports: [SelectComponent]
})
export class SelectModule {}
