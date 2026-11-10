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
    AopCompileActivity
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
        AopCompileActivity
    ],
    exports: [
        CompilerActivity,
        SourceFilesActivity,
        EsbuildBuildActivity,
        DeclarationGenerateActivity,
        ComponentParseActivity,
        MetadataGenerateActivity
    ]
})
export class CompilerModule {}
