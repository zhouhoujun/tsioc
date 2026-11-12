import { Module } from '@tsdi/ioc';
import { DynamicFormComponent } from './dynamic-form';

@Module({
    declarations: [DynamicFormComponent],
    exports: [DynamicFormComponent]
})
export class DynamicFormModule {}
