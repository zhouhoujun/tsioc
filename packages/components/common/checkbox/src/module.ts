import { Module } from '@tsdi/ioc';
import { CheckboxComponent } from './checkbox';

@Module({
    declarations: [CheckboxComponent],
    exports: [CheckboxComponent]
})
export class CheckboxModule {}
