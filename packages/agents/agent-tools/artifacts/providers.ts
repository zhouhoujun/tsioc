import { ArtifactCreateTool, ArtifactDeleteTool, ArtifactReadTool, ArtifactUpdateTool } from './artifact.tools';

/** P2.1: artifact tool providers shared by the module and `provideTools`. */
export const artifactToolProviders = [ArtifactCreateTool, ArtifactReadTool, ArtifactUpdateTool, ArtifactDeleteTool];

export const artifactToolItems = {
    artifact_create: ArtifactCreateTool,
    artifact_read: ArtifactReadTool,
    artifact_update: ArtifactUpdateTool,
    artifact_delete: ArtifactDeleteTool
};
