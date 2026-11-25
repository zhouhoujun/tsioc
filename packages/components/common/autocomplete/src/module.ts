import { Module } from '@tsdi/ioc';
import { AutoCompleteComponent } from './autocomplete';

@Module({
    declarations: [AutoCompleteComponent],
    exports: [AutoCompleteComponent]
})
export class AutoCompleteModule {}
