import { Module } from '@tsdi/ioc';
import { FieldComponent } from './field';

@Module({
    declarations: [FieldComponent],
    exports: [FieldComponent]
})
export class FieldModule {}
