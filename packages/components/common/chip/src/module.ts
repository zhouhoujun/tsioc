import { Module } from '@tsdi/ioc';
import { ChipComponent } from './chip';

@Module({
    declarations: [ChipComponent],
    exports: [ChipComponent]
})
export class ChipModule {}
