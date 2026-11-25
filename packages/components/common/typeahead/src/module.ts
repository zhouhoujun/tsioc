import { Module } from '@tsdi/ioc';
import { TypeaheadComponent } from './typeahead';

@Module({
    declarations: [TypeaheadComponent],
    exports: [TypeaheadComponent]
})
export class TypeaheadModule {}
