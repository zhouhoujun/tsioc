import { Module } from '@tsdi/ioc';
import { WorkspaceLayoutComponent } from './workspace-layout';

@Module({
    declarations: [WorkspaceLayoutComponent],
    exports: [WorkspaceLayoutComponent]
})
export class WorkspaceLayoutModule {}

/** Short entry-point alias: `@tsdi/components/common/layout` exports both. */
export const LayoutModule = WorkspaceLayoutModule;
