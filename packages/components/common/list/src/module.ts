import { Module } from '@tsdi/ioc';
import { ListComponent } from './list';

@Module({
    declarations: [ListComponent],
    exports: [ListComponent]
})
export class ListModule {}
