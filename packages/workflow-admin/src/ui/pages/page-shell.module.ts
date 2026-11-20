import { Module } from '@tsdi/ioc';
import { ToastModule } from '@tsdi/components/common/toast';
import { WorkflowAdminPageComponent } from './page-shell';

/**
 * Shared chrome for the workflow-admin feature pages (Plugins / Sessions /
 * Audit). The toast queue is provided here so each page only renders content.
 */
@Module({
    imports: [ToastModule],
    declarations: [WorkflowAdminPageComponent],
    exports: [WorkflowAdminPageComponent]
})
export class WorkflowAdminPageModule { }
