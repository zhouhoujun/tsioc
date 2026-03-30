import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '@tsdi/activities';
import { CompileActivity } from './CompileActivity';
import { ComponentCompileActivity } from './ComponentCompileActivity';
import { TestGenerateActivity } from './TestGenerateActivity';
import { EsbuildCompileActivity } from './EsbuildCompileActivity';
import { AnnotationCompileActivity } from './AnnotationCompileActivity';
import {
    SourceFilesActivity,
    EsbuildBuildActivity,
    DeclarationGenerateActivity,
    ComponentParseActivity,
    MetadataGenerateActivity,
    EsbuildComponentCompilerActivity
} from './activities';

@Module({
    imports: [
        ComponentsModule,
        WorkflowModule
    ],
    declarations: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        EsbuildCompileActivity,
        AnnotationCompileActivity,
        SourceFilesActivity,
        EsbuildBuildActivity,
        DeclarationGenerateActivity,
        ComponentParseActivity,
        MetadataGenerateActivity,
        EsbuildComponentCompilerActivity
    ],
    exports: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        EsbuildCompileActivity,
        AnnotationCompileActivity,
        SourceFilesActivity,
        EsbuildBuildActivity,
        DeclarationGenerateActivity,
        ComponentParseActivity,
        MetadataGenerateActivity,
        EsbuildComponentCompilerActivity
    ]
})
export class CompilerModule {}
