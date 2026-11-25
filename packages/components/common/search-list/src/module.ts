import { Module } from '@tsdi/ioc';
import { SearchListComponent } from './search-list';

@Module({
    declarations: [SearchListComponent],
    exports: [SearchListComponent]
})
export class SearchListModule {}
