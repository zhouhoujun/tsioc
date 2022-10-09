import { AopModule } from '@tsdi/aop';
import { Module } from '@tsdi/core';
import { ModuleWithProviders } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { Workflow } from './Workflow';
import { ActivityOption } from './refs/activity';



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
        Workflow,
        RunAspect
    ]
})
export class ActivityModule {

    static withOptions(option: ActivityOption): ModuleWithProviders {
        return {
            module: ActivityModule,
            providers: [
                { provide: ActivityOption, useValue: option }
            ]
        }
    }

}
