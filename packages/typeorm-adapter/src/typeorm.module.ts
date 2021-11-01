import { Module } from '@tsdi/core';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeOrmHelper } from './helper';
import { TypeormServer } from './TypeormServer';

@Module({
    regIn: 'root',
    providers: [
        TypeormServer,
        TypeOrmHelper,
        ParseObjectIdPipe,
    ]
})
export class TypeOrmModule { }
