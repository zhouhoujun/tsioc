import { AbstractType, Injector, InterceptingHandler } from '@tsdi/ioc';
import { ConfigableHandler, createRunContext, HandlerFn, Interceptor, InterceptorResolver, InterceptorLike } from '@tsdi/core';
import { ActivityContext, ActivityResult } from '../activities/Activity';
import {
    IVisualWorkflowNode,
    NodeExecutionState,
    WorkflowExecutionEventType,
    WorkflowExecutionOptions,
    WorkflowExecutionState
} from './types';
import { VisualNodeActivityAdapter } from './VisualNodeActivityAdapter';
import { executeVisualNode, VisualNodeRuntimeHost } from './workflow-runtime';

/**
 * Input of the visual node handler chain. It carries both the node and the
 * execution document so interceptors can inspect/annotate a node without the
 * engine holding cross-cutting logic.
 */
export interface VisualNodeExecutionInput {
    node: IVisualWorkflowNode;
    context: ActivityContext;
    host?: VisualNodeRuntimeHost;
    state: WorkflowExecutionState;
    options: WorkflowExecutionOptions;
    emit: (partial: {
        type: WorkflowExecutionEventType;
        nodeId?: string;
        connectionId?: string;
        status?: any;
        result?: ActivityResult;
        error?: Error;
    }) => void;
}

/**
 * Core-interceptor based handler for generated visual nodes.
 *
 * The handler uses the framework's `ConfigableHandler`/`InterceptorResolver`
 * chain, so the same `Interceptor` contract used by HTTP handlers, events and
 * services also wraps every generated node execution.
 */
export class VisualNodeHandler extends ConfigableHandler<VisualNodeExecutionInput, any> {
    constructor(injector: Injector) {
        super(injector, {
            enableTypeChain: false
        });
    }

    protected getHandlerType(): AbstractType {
        return VisualNodeActivityAdapter;
    }

    protected getBackend(): HandlerFn<VisualNodeExecutionInput, any> {
        return (input: VisualNodeExecutionInput) =>
            executeVisualNode(input.node, input.context, input.host);
    }

    handleNode(input: VisualNodeExecutionInput): Promise<ActivityResult> {
        return Promise.resolve(
            this.handle(input, createRunContext(this.injector))
        );
    }
}

export interface VisualNodeHandlerLike {
    handleNode(input: VisualNodeExecutionInput): Promise<ActivityResult>;
}

/**
 * Build the node handler for one workflow execution.
 *
 * - When the application exposes the core `InterceptorResolver` (the normal
 *   `Application.run` path), generated nodes go through `ConfigableHandler`
 *   and the framework's global interceptor chain.
 * - In a bare injector (unit tests, embedded engines) the same `Interceptor`
 *   objects are composed locally with `InterceptingHandler`, so interception
 *   semantics do not depend on the host application wiring.
 */
export function createVisualNodeHandler(
    injector: Injector,
    interceptors: InterceptorLike<VisualNodeExecutionInput, any>[]
): VisualNodeHandlerLike {
    const resolver = injector.get(InterceptorResolver, null);
    if (resolver) {
        interceptors.forEach(interceptor =>
            resolver.addInterceptor(VisualNodeActivityAdapter, interceptor)
        );
        return new VisualNodeHandler(injector);
    }
    const handler = new InterceptingHandler<VisualNodeExecutionInput, any>(
        (input: VisualNodeExecutionInput) =>
            executeVisualNode(input.node, input.context, input.host),
        () => interceptors
    );
    return {
        handleNode: (input: VisualNodeExecutionInput) =>
            Promise.resolve(handler.handle(input, createRunContext(injector)))
    };
}

function createNodeRecord(nodeId: string): NodeExecutionState {
    return { nodeId, status: 'pending' };
}

/**
 * Built-in interceptor that records the execution path and streams events to
 * the designer. It is registered against {@link VisualNodeActivityAdapter} via
 * the core `InterceptorResolver`.
 */
export class VisualExecutionPathInterceptor implements Interceptor<VisualNodeExecutionInput, any> {
    intercept(
        input: VisualNodeExecutionInput,
        next: { handle: (value: VisualNodeExecutionInput, context?: any) => any },
        context: any
    ): any {
        const { node, state, emit } = input;
        const record: NodeExecutionState = state.nodeStates?.get(node.id) || createNodeRecord(node.id);
        record.status = 'running';
        record.startedAt = Date.now();
        state.nodeStates?.set(node.id, record);
        state.currentNodeId = node.id;
        state.activeNodeIds = [...(state.activeNodeIds || []), node.id];
        emit({ type: 'node-start', nodeId: node.id, status: 'running' });

        return Promise.resolve(next.handle(input, context)).then(
            result => {
                this.finish(input, record, result);
                return result;
            },
            error => {
                const result: ActivityResult = {
                    success: false,
                    error: error as Error,
                    data: { nodeId: node.id }
                };
                this.finish(input, record, result);
                return result;
            }
        );
    }

    private finish(
        input: VisualNodeExecutionInput,
        record: NodeExecutionState,
        result: ActivityResult
    ): void {
        const { node, state, emit } = input;
        record.finishedAt = Date.now();
        record.durationMs = record.startedAt !== undefined ? record.finishedAt - record.startedAt : undefined;
        record.status = result.success ? 'success' : 'failed';
        record.result = result;
        record.error = result.error?.message;
        state.nodeStates?.set(node.id, record);
        state.nodeResults.set(node.id, result);
        state.activeNodeIds = (state.activeNodeIds || []).filter(id => id !== node.id);
        emit({
            type: 'node-end',
            nodeId: node.id,
            status: record.status,
            result
        });
    }
}
