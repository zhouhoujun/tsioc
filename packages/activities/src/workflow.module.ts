import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { TabBarModule } from '@tsdi/components/common/tab-bar';
import { MenuBarModule } from '@tsdi/components/common/menu-bar';
import { IconModule } from '@tsdi/components/common/icon';
import { DynamicFormModule } from '@tsdi/components/common/dynamic-form';
import { WorkspaceLayoutModule } from '@tsdi/components/common/layout';
import { EmptyStateModule } from '@tsdi/components/common/empty-state';
import { StatModule } from '@tsdi/components/common/stat';
import { BadgeModule } from '@tsdi/components/common/badge';
import { ButtonModule } from '@tsdi/components/common/button';
import { KeymapPanelModule } from '@tsdi/components/common/keymap';
import { ProgressModule } from '@tsdi/components/common/progress';
import { DataTableModule } from '@tsdi/components/common/data-table';
import { BreadcrumbModule } from '@tsdi/components/common/breadcrumb';
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
    WorkflowCredentialPanelComponent,
    WorkflowAuditPanelComponent,
    WorkflowMetricsPanelComponent,
    WorkflowDeploymentsPanelComponent,
    WorkflowSettingsPanelComponent,
    WorkflowPublishPanelComponent,
    WorkflowRenamePanelComponent,
    WorkflowVersionPanelComponent,
    WorkflowDesignerComponent,
    WorkflowDesignerPreviewComponent,
    WorkflowConfigDialogComponent,
    WorkflowConfigNodesComponent,
    WorkflowGroupSettingsComponent,
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
        TabBarModule,
        MenuBarModule,
        IconModule,
        DynamicFormModule,
        WorkspaceLayoutModule,
        EmptyStateModule,
        StatModule,
        BadgeModule,
        ButtonModule,
        KeymapPanelModule,
        ProgressModule,
        DataTableModule,
        BreadcrumbModule,
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
        WorkflowCredentialPanelComponent,
        WorkflowAuditPanelComponent,
        WorkflowMetricsPanelComponent,
        WorkflowDeploymentsPanelComponent,
        WorkflowSettingsPanelComponent,
        WorkflowPublishPanelComponent,
        WorkflowRenamePanelComponent,
        WorkflowVersionPanelComponent,
        WorkflowDesignerPreviewComponent,
        WorkflowConfigDialogComponent,
        WorkflowConfigNodesComponent,
        WorkflowGroupSettingsComponent,
        WorkflowManagementMenuComponent,
        WorkflowDesignerComponent
    ],
    exports: [
        AopModule,
        ComponentsModule,
        BaseComponentsModule,
        TabBarModule,
        MenuBarModule,
        IconModule,
        DynamicFormModule,
        WorkspaceLayoutModule,
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
        WorkflowCredentialPanelComponent,
        WorkflowAuditPanelComponent,
        WorkflowVersionPanelComponent,
        WorkflowDesignerPreviewComponent,
        WorkflowConfigDialogComponent,
        WorkflowConfigNodesComponent,
        WorkflowGroupSettingsComponent,
        WorkflowManagementMenuComponent,
        WorkflowDesignerComponent,
        ActivityInterceptorService,
        ActivityLogAspect,
        ActivityDebugService
    ]
})
export class WorkflowModule {

}
