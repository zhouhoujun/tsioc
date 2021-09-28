import { Module } from '@tsdi/core';
import { HttpRouter } from './router';

@Module({
    regIn: 'root',
    providers:[
        HttpRouter
    ]
})
export class BootModule {}