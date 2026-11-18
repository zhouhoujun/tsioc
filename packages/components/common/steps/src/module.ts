import { Module } from '@tsdi/ioc';
import { StepsComponent } from './steps';

@Module({
    declarations: [StepsComponent],
    exports: [StepsComponent]
})
export class StepsModule {}
