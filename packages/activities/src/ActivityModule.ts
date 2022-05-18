import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { Module } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { ActivityExecutor } from './core/ActivityExecutor';



/**
 * setup wokflow activity module for boot application.
 *
 * @export
 * @param {IContainer} container
 */
@Module({
    imports: [
        AopModule,
        ComponentsModule
    ],
    declarations:[
        
    ],
    providers: [
        ActivityExecutor,
        RunAspect
    ]
})
export class ActivityModule {

}
