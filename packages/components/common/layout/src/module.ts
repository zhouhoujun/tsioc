import { Module } from '@tsdi/ioc';
import { WorkspaceLayoutComponent } from './workspace-layout';

@Module({
    declarations: [WorkspaceLayoutComponent],
    exports: [WorkspaceLayoutComponent]
})
export class WorkspaceLayoutModule {}
