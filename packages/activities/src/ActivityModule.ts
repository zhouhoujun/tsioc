import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { WorkflowService } from './service';
import { Activity } from './activities/Activity';
import {
    CatchActivity, ConfirmActivity, DelayActivity, DoWhileActivity, IntervalActivity,
    InvokeActivity, ParallelActivity, SequenceActivity, ThrowActivity, TimerActivity,
    TryActivity, TryCatchActivity, WhileActivity
} from './activities';



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
    ],
    declarations: [
        Activity,
        ConfirmActivity,
        DelayActivity,
        WhileActivity,
        DoWhileActivity,
        IntervalActivity,
        InvokeActivity,
        ParallelActivity,
        SequenceActivity,
        ThrowActivity,
        TimerActivity,
        TryCatchActivity,
        TryActivity,
        CatchActivity
    ],
    exports: [
        Activity,
        ConfirmActivity,
        DelayActivity,
        WhileActivity,
        DoWhileActivity,
        IntervalActivity,
        InvokeActivity,
        ParallelActivity,
        SequenceActivity,
        ThrowActivity,
        TimerActivity,
        TryCatchActivity,
        TryActivity,
        CatchActivity
    ]
})
export class ActivityModule {

}
