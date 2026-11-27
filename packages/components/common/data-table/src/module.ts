import { Module } from '@tsdi/ioc';
import { PaginationModule } from '../../pagination/src/module';
import { DataTableComponent } from './data-table';
import { DataTableColumnChooserComponent } from './data-table.column-chooser';
import { DataTableColumnsButtonComponent } from './data-table.columns-button';

@Module({
    imports: [PaginationModule],
    declarations: [DataTableComponent, DataTableColumnChooserComponent, DataTableColumnsButtonComponent],
    exports: [DataTableComponent, DataTableColumnChooserComponent, DataTableColumnsButtonComponent]
})
export class DataTableModule {}
