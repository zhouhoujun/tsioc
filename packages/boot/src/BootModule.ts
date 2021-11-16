import { Module } from '@tsdi/core';
import { HttpRouter } from './router';

@Module({
    providedIn: 'root',
    providers:[
        HttpRouter
    ]
})
export class BootModule {}