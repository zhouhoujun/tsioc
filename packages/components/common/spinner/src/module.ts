import { Module } from '@tsdi/ioc';
import { SpinnerComponent } from './spinner';

@Module({
    declarations: [SpinnerComponent],
    exports: [SpinnerComponent]
})
export class SpinnerModule {}
