import { Module } from '@tsdi/ioc';
import { DynamicFormComponent } from './dynamic-form';
import { DynamicFieldWidgetComponent } from './dynamic-field-widget';

@Module({
    declarations: [DynamicFormComponent, DynamicFieldWidgetComponent],
    exports: [DynamicFormComponent, DynamicFieldWidgetComponent]
})
export class DynamicFormModule {}
