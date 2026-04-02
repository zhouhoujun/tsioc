import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { RunAspect } from './aop/RunAspect';
import { ActivityInterceptorService, ActivityLogAspect, ActivityDebugService } from './aop';
import { WorkflowService } from './services/workflow.service';
import {
    ConfirmActivity, DelayActivity, DoWhileActivity, EndActivity, IntervalActivity,
    InvokeActivity, ParallelActivity, SequenceActivity, StartActivity, ThrowActivity, TimerActivity,
    TryCatchActivity, WhileActivity,
    AssignActivity, LogActivity, ForEachActivity, TransformActivity, MapActivity, FilterActivity,
    ReduceActivity, ValidateActivity, RequiredActivity, RangeActivity, PatternActivity,
    EmitActivity, WaitActivity, BatchActivity, MergeActivity, SplitActivity,
    CodeActivity, SubProcessActivity, HttpRequestActivity
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
        ActivityInterceptorService,
        ActivityLogAspect,
        ActivityDebugService,
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
        SplitActivity,
        CodeActivity,
        SubProcessActivity,
        HttpRequestActivity
    ],
    exports: [
        AopModule,
        ComponentsModule,
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
        CodeActivity,
        SubProcessActivity,
        HttpRequestActivity,
        VisualWorkflowService,
        VisualWorkflowBuilder,
        ActivityInterceptorService,
        ActivityLogAspect,
        ActivityDebugService
    ]
})
export class WorkflowModule {

}
