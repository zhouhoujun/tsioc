import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '@tsdi/activities';
import { CompileActivity } from './CompileActivity';
import { ComponentCompileActivity } from './ComponentCompileActivity';
import { TestGenerateActivity } from './TestGenerateActivity';
import { CompilerService } from './CompilerService';

@Module({
    imports: [
        ComponentsModule,
        WorkflowModule
    ],
    providers: [
        CompilerService
    ],
    declarations: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity
    ],
    exports: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        CompilerService
    ]
})
export class CompilerModule {}