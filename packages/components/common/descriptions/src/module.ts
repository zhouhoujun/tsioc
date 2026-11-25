import { Module } from '@tsdi/ioc';
import { DescriptionsComponent } from './descriptions';

@Module({
    declarations: [DescriptionsComponent],
    exports: [DescriptionsComponent]
})
export class DescriptionsModule {}
