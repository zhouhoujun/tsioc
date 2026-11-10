import { Module } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
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
    WorkflowDesignerComponent
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
        FormsModule,
        WorkflowDesignerI18nModule
    ],
    providers: [
        VisualWorkflowService,
        VisualWorkflowBuilder,
        WorkflowNodeRegistry
    ],
    declarations: [
        WorkflowToolbarComponent,
        WorkflowPaletteComponent,
        WorkflowCanvasComponent,
        WorkflowInspectorComponent,
        WorkflowRunHistoryComponent,
        WorkflowRunLogComponent,
        WorkflowLibraryComponent,
        WorkflowDesignerComponent
    ],
    exports: [
        AopModule,
        ComponentsModule,
        BaseComponentsModule,
        FormsModule,
        WorkflowDesignerI18nModule,
        VisualWorkflowService,
        VisualWorkflowBuilder,
        WorkflowNodeRegistry,
        WorkflowToolbarComponent,
        WorkflowPaletteComponent,
        WorkflowCanvasComponent,
        WorkflowInspectorComponent,
        WorkflowRunHistoryComponent,
        WorkflowRunLogComponent,
        WorkflowLibraryComponent,
        WorkflowDesignerComponent
    ]
})
export class WorkflowDesignerModule { }
