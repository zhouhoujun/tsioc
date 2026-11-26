import { Module } from '@tsdi/ioc';
import { PaginationModule } from '../../pagination/src/module';
import { DataTableComponent } from './data-table';
import { DataTableColumnChooserComponent } from './data-table.column-chooser';

@Module({
    imports: [PaginationModule],
    declarations: [DataTableComponent, DataTableColumnChooserComponent],
    exports: [DataTableComponent, DataTableColumnChooserComponent]
})
export class DataTableModule {}
