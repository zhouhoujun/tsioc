import { Module } from '@tsdi/ioc';
import { WorkflowCodeMirrorDirective } from './code-editor';

@Module({
    declarations: [WorkflowCodeMirrorDirective],
    exports: [WorkflowCodeMirrorDirective]
})
export class WorkflowCodeEditorModule { }

export * from './code-editor';
