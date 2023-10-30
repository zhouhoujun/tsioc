import { Module } from '@tsdi/ioc';
import { ViewContainerRef } from '../refs/container';
import { ViewContainerRefImpl } from './container';

@Module({
    providers: [
        { provide: ViewContainerRef, useClass: ViewContainerRefImpl }
    ]
})
export class RendererModule {

}
