import { Module } from '@tsdi/ioc';
import { RadioGroupComponent } from './radio-group';

@Module({
    declarations: [RadioGroupComponent],
    exports: [RadioGroupComponent]
})
export class RadioGroupModule {}
