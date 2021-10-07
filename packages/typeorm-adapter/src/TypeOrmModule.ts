import { Module } from '@tsdi/core';
import { TypeOrmHelper } from './TypeOrmHelper';
import { TypeOrmModelParser } from './TypeOrmModelParser';
import { TypeormServer } from './TypeormServer';

@Module({
    regIn: 'root',
    providers: [
        TypeormServer,
        TypeOrmHelper,
        TypeOrmModelParser
    ]
})
export class TypeOrmModule { }
