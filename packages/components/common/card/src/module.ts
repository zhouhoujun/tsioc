import { Module } from '@tsdi/ioc';
import { CardComponent } from './card';

@Module({
    declarations: [CardComponent],
    exports: [CardComponent]
})
export class CardModule {}
