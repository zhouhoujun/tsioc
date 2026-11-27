import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { TabBarModule } from '@tsdi/components/common/tab-bar';
import { AccordionModule } from '@tsdi/components/common/accordion';
import { MenuBarModule } from '@tsdi/components/common/menu-bar';
import { IconModule } from '@tsdi/components/common/icon';
import { DYNAMIC_FORM_WIDGETS, DynamicFormModule } from '@tsdi/components/common/dynamic-form';
import { WorkflowReferenceWidgetComponent } from './visual/components/workflow-reference-widget';
import { WorkflowReferenceMultiWidgetComponent } from './visual/components/workflow-reference-multi-widget';
import { WorkflowTypedValueWidgetComponent } from './visual/components/workflow-typed-value-widget';
import { DEFAULT_WORKFLOW_NODE_EDITORS } from './visual/components/workflow-node-editor-sections-default';
import { WORKFLOW_NODE_EDITORS } from './visual/workflow-node-editors';
import { WorkspaceLayoutModule } from '@tsdi/components/common/layout';
import { EmptyStateModule } from '@tsdi/components/common/empty-state';
import { StatModule } from '@tsdi/components/common/stat';
import { BadgeModule } from '@tsdi/components/common/badge';
import { ButtonModule } from '@tsdi/components/common/button';
import { KeymapPanelModule } from '@tsdi/components/common/keymap';
import { ToastModule } from '@tsdi/components/common/toast';
import { ProgressModule } from '@tsdi/components/common/progress';
import { DataTableModule } from '@tsdi/components/common/data-table';
import { BreadcrumbModule } from '@tsdi/components/common/breadcrumb';
import { CommandPaletteModule } from '@tsdi/components/common/command-palette';
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
    WorkflowQuickAddComponent,
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
    WorkflowExpressionPanelComponent,
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
        AccordionModule,
        MenuBarModule,
        IconModule,
        DynamicFormModule,
        WorkspaceLayoutModule,
        EmptyStateModule,
        StatModule,
        BadgeModule,
        ButtonModule,
        KeymapPanelModule,
        ToastModule,
        ProgressModule,
        DataTableModule,
        BreadcrumbModule,
        CommandPaletteModule,
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
        WorkflowPluginRegistry,
        { provide: DYNAMIC_FORM_WIDGETS, useValue: [
            { type: 'workflow-reference', component: WorkflowReferenceWidgetComponent },
            { type: 'workflow-reference-multi', component: WorkflowReferenceMultiWidgetComponent },
            { type: 'workflow-typed-value', component: WorkflowTypedValueWidgetComponent }
        ] },
        { provide: WORKFLOW_NODE_EDITORS, useValue: DEFAULT_WORKFLOW_NODE_EDITORS }
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
        WorkflowQuickAddComponent,
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
        WorkflowExpressionPanelComponent,
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
        AccordionModule,
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
        WorkflowQuickAddComponent,
        WorkflowCanvasComponent,
        WorkflowInspectorComponent,
        WorkflowRunHistoryComponent,
        WorkflowRunLogComponent,
        WorkflowLibraryComponent,
        WorkflowCredentialPanelComponent,
        WorkflowAuditPanelComponent,
        WorkflowVersionPanelComponent,
        WorkflowExpressionPanelComponent,
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
