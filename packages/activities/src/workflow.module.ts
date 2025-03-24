import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { WorkflowService } from './services/workflow.service';
import {
    ConfirmActivity, DelayActivity, DoWhileActivity, EndActivity, IntervalActivity,
    InvokeActivity, ParallelActivity, SequenceActivity, StartActivity, ThrowActivity, TimerActivity,
    TryCatchActivity, WhileActivity
} from './activities';



/**
 * setup wokflow activity module for application.
 *
 * @export
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
        StartActivity,
        EndActivity,
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
        TryCatchActivity
    ],
    exports: [
        StartActivity,
        EndActivity,
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
        TryCatchActivity
    ]
})
export class WorkflowModule {

}
