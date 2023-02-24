import { Module } from '@tsdi/ioc';
import { TransactionalAspect } from './aspect';

@Module({
    providers:[
        TransactionalAspect
    ]
})
export class TransactionModule {

} 