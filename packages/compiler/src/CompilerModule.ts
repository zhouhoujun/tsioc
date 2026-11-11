import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '@tsdi/activities';
import { CompilerActivity } from './CompilerActivity';
import {
    SourceFilesActivity,
    EsbuildBuildActivity,
    DeclarationGenerateActivity,
    ComponentParseActivity,
    MetadataGenerateActivity,
    AotAspectCompileActivity,
    AotCompileActivity
} from './activities';

@Module({
    imports: [
        ComponentsModule,
        WorkflowModule
    ],
    declarations: [
        CompilerActivity,
        SourceFilesActivity,
        EsbuildBuildActivity,
        DeclarationGenerateActivity,
        ComponentParseActivity,
        MetadataGenerateActivity,
        AotAspectCompileActivity,
        AotCompileActivity
    ],
    exports: [
        CompilerActivity,
        SourceFilesActivity,
        EsbuildBuildActivity,
        DeclarationGenerateActivity,
        ComponentParseActivity,
        MetadataGenerateActivity,
        AotCompileActivity
    ]
})
export class CompilerModule {}
