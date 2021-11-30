import { Module } from '@tsdi/core';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeOrmHelper } from './helper';
import { TypeormServer } from './TypeormServer';
import { TypeormTransactionManager } from './transaction';

@Module({
    providers: [
        TypeormServer,
        TypeOrmHelper,
        ParseObjectIdPipe,
        TypeormTransactionManager
    ]
})
export class TypeOrmModule { }
