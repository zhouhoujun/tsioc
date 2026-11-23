import { Module } from '@tsdi/ioc';
import { WorkflowServiceRegistry } from './plugins/service-registry';
import { WorkflowActionBus } from './visual/workflow-action-bus';
import { WorkflowPluginRegistry } from './plugins/plugin-registry';
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
import { DataTableModule } from '@tsdi/components/common/data-table';
import { BreadcrumbModule } from '@tsdi/components/common/breadcrumb';
import { KeymapPanelModule } from '@tsdi/components/common/keymap';
import { ToastModule } from '@tsdi/components/common/toast';
import { ProgressModule } from '@tsdi/components/common/progress';
import { FormsModule } from '@tsdi/components/forms';
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
 * Slim module for embedding the visual workflow designer in a browser product.
 *
 * It contains the designer UI, the generic visual execution engine and the
 * shared component/form/AOP infrastructure. The full `WorkflowModule` keeps
 * declaring every Activity class for server-side workflow authors; product
 * shells that only run registry-defined visual nodes use this module to keep
 * browser payloads small.
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
        DataTableModule,
        BreadcrumbModule,
        KeymapPanelModule,
        ToastModule,
        ProgressModule,
        FormsModule,
        WorkflowDesignerI18nModule
    ],
    providers: [
        VisualWorkflowService,
        VisualWorkflowBuilder,
        WorkflowNodeRegistry,
        WorkflowServiceRegistry,
        WorkflowActionBus,
        WorkflowPluginRegistry
    ],
    declarations: [
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
        MenuBarModule,
        IconModule,
        DynamicFormModule,
        WorkspaceLayoutModule,
        FormsModule,
        WorkflowDesignerI18nModule,
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
    ]
})
export class WorkflowDesignerModule { }
