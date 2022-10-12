import { AopModule } from '@tsdi/aop';
import { Module } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { WorkflowService } from './service';



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
    providers: [
        WorkflowService,
        RunAspect
    ]
})
export class ActivityModule {

}
