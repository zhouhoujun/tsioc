import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '@tsdi/activities';
import { CompileActivity } from './CompileActivity';
import { ComponentCompileActivity } from './ComponentCompileActivity';
import { TestGenerateActivity } from './TestGenerateActivity';
import { EsbuildCompileActivity } from './EsbuildCompileActivity';
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
        TestGenerateActivity,
        EsbuildCompileActivity
    ],
    exports: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        EsbuildCompileActivity,
        CompilerService
    ]
})
export class CompilerModule {}