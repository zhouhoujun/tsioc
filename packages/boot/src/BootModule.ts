import { Module } from '@tsdi/ioc';
import { HttpRouter } from './router';

@Module({
    providedIn: 'root',
    providers:[
        HttpRouter
    ]
})
export class BootModule {}