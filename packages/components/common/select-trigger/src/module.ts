import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { SelectTriggerComponent } from './select-trigger';

@Module({
    imports: [IconModule],
    declarations: [SelectTriggerComponent],
    exports: [SelectTriggerComponent]
})
export class SelectTriggerModule {}
