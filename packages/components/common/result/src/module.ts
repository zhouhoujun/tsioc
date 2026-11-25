import { Module } from '@tsdi/ioc';
import { ResultComponent } from './result';

@Module({
    declarations: [ResultComponent],
    exports: [ResultComponent]
})
export class ResultModule {}
