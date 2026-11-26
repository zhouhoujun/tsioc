import type { ActivityContext, ActivityResult } from '../../activities/Activity';
import type { IVisualWorkflowNode } from '../types';
import type { NodeExecutionState } from '../types';

/**
 * Context handed to complete/catch/status lifecycle nodes.
 *
 * Keeps the established `failedNodeId`/`errorMessage` fields and adds the
 * Node-RED-shaped `msg.error`/`msg.status`/`msg.complete` objects with the
 * source node identity.
 */
export function buildLifecycleContext(
    type: string,
    runtimeContext: ActivityContext,
    result: ActivityResult,
    sourceRecord: NodeExecutionState | undefined,
    sourceNode: IVisualWorkflowNode | undefined
): ActivityContext {
    const eventSource = sourceRecord ? {
        id: sourceRecord.nodeId,
        name: sourceNode?.name || sourceRecord.nodeId,
        type: sourceNode?.type || ''
    } : undefined;
    const errorInfo = type === 'catch' && sourceRecord?.error
        ? { message: sourceRecord.error, source: eventSource }
        : undefined;
    const statusInfo = type === 'status' ? {
        text: result.success ? 'completed' : 'failed',
        source: eventSource
    } : undefined;
    const completeInfo = type === 'complete'
        ? { result: sourceRecord?.result, source: eventSource }
        : undefined;
    const lifecycleMsg = {
        ...((runtimeContext as any).msg || {}),
        ...(errorInfo ? { error: errorInfo } : {}),
        ...(statusInfo ? { status: statusInfo } : {}),
        ...(completeInfo ? { complete: completeInfo } : {})
    };
    return {
        ...runtimeContext,
        workflowStatus: result.success ? 'completed' : 'failed',
        workflowError: result.error?.message,
        workflowResult: result,
        eventSource,
        msg: lifecycleMsg,
        ...(sourceRecord ? {
            failedNodeId: type === 'catch' ? sourceRecord.nodeId : undefined,
            errorMessage: type === 'catch' ? sourceRecord.error : undefined,
            error: type === 'catch' && sourceRecord.error ? new Error(sourceRecord.error) : undefined,
            errorSource: errorInfo?.source,
            completedNodeId: type === 'complete' ? sourceRecord.nodeId : undefined,
            completedResult: type === 'complete' ? sourceRecord.result : undefined,
            statusNodeId: sourceRecord.nodeId,
            statusResult: sourceRecord.result,
            statusSource: statusInfo?.source
        } : {})
    };
}
