import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { IVisualWorkflowNode } from './types';
import { executeVisualNode, VisualNodeRuntimeHost } from './workflow-runtime';

/**
 * Adapter that exposes a visual workflow node as a standard {@link Activity}.
 *
 * This is the bridge that lets generated visual flows participate in the
 * existing AOP/interceptor pipeline (`ActivityInterceptorService`): logging,
 * tracing, retry, timeout, permissions or metrics can wrap node execution
 * without the visual engine knowing about them.
 */
export class VisualNodeActivityAdapter extends Activity {
    constructor(
        readonly node: IVisualWorkflowNode,
        protected readonly runtimeHost?: VisualNodeRuntimeHost
    ) {
        super();
    }

    get id(): string {
        return this.node.id;
    }

    get name(): string {
        return this.node.name;
    }

    get nodeType(): string {
        return this.node.type;
    }

    execute(context: ActivityContext): Promise<ActivityResult> {
        return executeVisualNode(this.node, context, this.runtimeHost);
    }
}
