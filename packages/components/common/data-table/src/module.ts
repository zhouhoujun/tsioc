import { Module } from '@tsdi/ioc';
import { PaginationModule } from '../../pagination/src/module';
import { DataTableComponent } from './data-table';

@Module({
    imports: [PaginationModule],
    declarations: [DataTableComponent],
    exports: [DataTableComponent]
})
export class DataTableModule {}
