import type { ActivityContext } from '../activities/Activity';

/**
 * Evaluates a user expression against the workflow context.
 *
 * The default implementation uses JSONata, loaded on demand (`await import`)
 * so the dependency stays an optional package and the designer bundle keeps it
 * in a lazy chunk. Hosts can install a different evaluator (sandboxing, a
 * shared expression cache, a different language) with
 * {@link setWorkflowExpressionEvaluator}.
 */
export interface WorkflowExpressionEvaluator {
    evaluate(expression: string, scope: Record<string, any>): Promise<any>;
}

let evaluator: WorkflowExpressionEvaluator | undefined;
let jsonataModule: any;
/** Compiled expressions are reusable; the cap keeps a long session bounded. */
const compiled = new Map<string, any>();
const COMPILED_LIMIT = 200;

async function loadJsonata(): Promise<any> {
    if (jsonataModule !== undefined) {
        return jsonataModule;
    }
    try {
        const module: any = await import('jsonata');
        jsonataModule = module.default ?? module;
    } catch {
        throw new Error(
            'Expression values need the optional "jsonata" package. '
            + 'Install it (npm install jsonata) or register a host evaluator.'
        );
    }
    return jsonataModule;
}

const jsonataEvaluator: WorkflowExpressionEvaluator = {
    async evaluate(expression: string, scope: Record<string, any>): Promise<any> {
        const text = String(expression ?? '').trim();
        if (!text) {
            return undefined;
        }
        const jsonata = await loadJsonata();
        let compiledExpression = compiled.get(text);
        if (!compiledExpression) {
            // `jsonata(text)` throws on syntax errors with position details.
            compiledExpression = jsonata(text);
            if (compiled.size >= COMPILED_LIMIT) {
                compiled.clear();
            }
            compiled.set(text, compiledExpression);
        }
        return await compiledExpression.evaluate(scope);
    }
};

/** Replace (or reset with `undefined`) the evaluator used for expressions. */
export function setWorkflowExpressionEvaluator(next?: WorkflowExpressionEvaluator): void {
    evaluator = next;
}

/** Drop cached compiled expressions (tests, hot reload). */
export function clearWorkflowExpressions(): void {
    compiled.clear();
}

/**
 * Scope an expression sees: message fields at the root (Node-RED style), plus
 * explicit `msg`/`flow`/`global`/`env` handles.
 */
export function workflowExpressionScope(context: ActivityContext): Record<string, any> {
    const anyContext = context as any;
    const rawMessage = anyContext.msg;
    const msg = rawMessage && typeof rawMessage === 'object'
        ? rawMessage
        : { payload: anyContext.payload };
    return {
        ...(msg && typeof msg === 'object' ? msg : { payload: msg }),
        payload: (msg as any)?.payload ?? anyContext.payload,
        msg,
        flow: anyContext.flow || {},
        global: anyContext.global || {},
        env: anyContext.env || {}
    };
}

/** Evaluate one expression with the configured (default JSONata) evaluator. */
export async function evaluateWorkflowExpression(
    expression: string,
    context: ActivityContext
): Promise<any> {
    const current = evaluator || jsonataEvaluator;
    return current.evaluate(expression, workflowExpressionScope(context));
}
