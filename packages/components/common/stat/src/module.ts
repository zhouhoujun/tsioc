import { Module } from '@tsdi/ioc';
import { StatComponent } from './stat';

@Module({
    declarations: [StatComponent],
    exports: [StatComponent]
})
export class StatModule {}
