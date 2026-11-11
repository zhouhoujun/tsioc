import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { FormsModule } from '@tsdi/components/forms';
import { RunAspect } from './aop/RunAspect';
import { ActivityInterceptorService, ActivityLogAspect, ActivityDebugService } from './aop';
import { WorkflowService } from './services/workflow.service';
import { WorkflowServiceRegistry } from './plugins/service-registry';
import { WorkflowActionBus } from './visual/workflow-action-bus';
import { WorkflowPluginRegistry } from './plugins/plugin-registry';
import {
    ConfirmActivity, DelayActivity, DoWhileActivity, EndActivity, IntervalActivity,
    InvokeActivity, ParallelActivity, SequenceActivity, StartActivity, ThrowActivity, TimerActivity,
    TryCatchActivity, WhileActivity,
    AssignActivity, LogActivity, ForEachActivity, TransformActivity, MapActivity, FilterActivity,
    ReduceActivity, ValidateActivity, RequiredActivity, RangeActivity, PatternActivity,
    EmitActivity, WaitActivity, BatchActivity, MergeActivity, SplitActivity,
    CodeActivity, SubProcessActivity, HttpRequestActivity
} from './activities';
import {
    VisualWorkflowService,
    VisualWorkflowBuilder,
    WorkflowNodeRegistry,
    WorkflowDesignerI18nModule,
    WorkflowToolbarComponent,
    WorkflowPaletteComponent,
    WorkflowCanvasComponent,
    WorkflowInspectorComponent,
    WorkflowRunHistoryComponent,
    WorkflowRunLogComponent,
    WorkflowLibraryComponent,
    WorkflowDesignerComponent,
    WorkflowDesignerPreviewComponent,
    WorkflowManagementMenuComponent
} from './visual';



/**
 * setup wokflow activity module for application.
 *
 * @export
 */
@Module({
    imports: [
        AopModule,
        ComponentsModule,
        BaseComponentsModule,
        FormsModule,
        WorkflowDesignerI18nModule
    ],
    providers: [
        WorkflowService,
        RunAspect,
        ActivityInterceptorService,
        ActivityLogAspect,
        ActivityDebugService,
        VisualWorkflowService,
        VisualWorkflowBuilder,
        WorkflowNodeRegistry,
        WorkflowServiceRegistry,
        WorkflowActionBus,
        WorkflowPluginRegistry
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
        HttpRequestActivity,
        WorkflowToolbarComponent,
        WorkflowPaletteComponent,
        WorkflowCanvasComponent,
        WorkflowInspectorComponent,
        WorkflowRunHistoryComponent,
        WorkflowRunLogComponent,
        WorkflowLibraryComponent,
        WorkflowDesignerPreviewComponent,
        WorkflowManagementMenuComponent,
        WorkflowDesignerComponent
    ],
    exports: [
        AopModule,
        ComponentsModule,
        BaseComponentsModule,
        FormsModule,
        WorkflowDesignerI18nModule,
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
        WorkflowNodeRegistry,
        WorkflowServiceRegistry,
        WorkflowPluginRegistry,
        WorkflowToolbarComponent,
        WorkflowPaletteComponent,
        WorkflowCanvasComponent,
        WorkflowInspectorComponent,
        WorkflowRunHistoryComponent,
        WorkflowRunLogComponent,
        WorkflowLibraryComponent,
        WorkflowDesignerPreviewComponent,
        WorkflowManagementMenuComponent,
        WorkflowDesignerComponent,
        ActivityInterceptorService,
        ActivityLogAspect,
        ActivityDebugService
    ]
})
export class WorkflowModule {

}
