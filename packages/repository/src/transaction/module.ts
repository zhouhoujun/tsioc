import { Module } from '@tsdi/core';
import { TransactionalAspect } from './aspect';

@Module({
    providers:[
        TransactionalAspect
    ]
})
export class TransactionModule {

} 