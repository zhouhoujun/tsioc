import { Module } from '@tsdi/ioc';
import { InlineInputComponent } from './inline-input';

@Module({
    declarations: [InlineInputComponent],
    exports: [InlineInputComponent]
})
export class InlineInputModule {}
