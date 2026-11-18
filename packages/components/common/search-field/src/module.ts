import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { SearchFieldComponent } from './search-field';

@Module({
    imports: [IconModule],
    declarations: [SearchFieldComponent],
    exports: [SearchFieldComponent]
})
export class SearchFieldModule {}
