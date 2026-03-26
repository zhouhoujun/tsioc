import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { WorkflowService } from './services/workflow.service';
import {
    ConfirmActivity, DelayActivity, DoWhileActivity, EndActivity, IntervalActivity,
    InvokeActivity, ParallelActivity, SequenceActivity, StartActivity, ThrowActivity, TimerActivity,
    TryCatchActivity, WhileActivity,
    AssignActivity, LogActivity, ForEachActivity, TransformActivity, MapActivity, FilterActivity,
    ReduceActivity, ValidateActivity, RequiredActivity, RangeActivity, PatternActivity,
    EmitActivity, WaitActivity, BatchActivity, MergeActivity, SplitActivity
} from './activities';
import { VisualWorkflowService, VisualWorkflowBuilder } from './visual';



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
        RunAspect,
        VisualWorkflowService,
        VisualWorkflowBuilder
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
        TryCatchActivity,
        AssignActivity,
        LogActivity,
        ForEachActivity,
        TransformActivity,
        MapActivity,
        FilterActivity,
        ReduceActivity,
        ValidateActivity,
        RequiredActivity,
        RangeActivity,
        PatternActivity,
        EmitActivity,
        WaitActivity,
        BatchActivity,
        MergeActivity,
        SplitActivity
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
        TryCatchActivity,
        AssignActivity,
        LogActivity,
        ForEachActivity,
        TransformActivity,
        MapActivity,
        FilterActivity,
        ReduceActivity,
        ValidateActivity,
        RequiredActivity,
        RangeActivity,
        PatternActivity,
        EmitActivity,
        WaitActivity,
        BatchActivity,
        MergeActivity,
        SplitActivity,
        VisualWorkflowService,
        VisualWorkflowBuilder
    ]
})
export class WorkflowModule {

}
