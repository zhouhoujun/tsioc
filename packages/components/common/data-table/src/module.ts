import { Module } from '@tsdi/ioc';
import { DataTableComponent } from './data-table';

@Module({
    declarations: [DataTableComponent],
    exports: [DataTableComponent]
})
export class DataTableModule {}
