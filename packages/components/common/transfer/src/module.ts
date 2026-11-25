import { Module } from '@tsdi/ioc';
import { TransferComponent } from './transfer';

@Module({
    declarations: [TransferComponent],
    exports: [TransferComponent]
})
export class TransferModule {}
