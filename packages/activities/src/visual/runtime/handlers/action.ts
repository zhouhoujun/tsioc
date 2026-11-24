import type { ActivityContext, ActivityNodeStatus, ActivityResult } from '../../../activities/Activity';
import { evaluateWorkflowExpression } from '../../workflow-expression';
import { parseYaml, stringifyYaml } from '../../workflow-yaml';
import type { IVisualWorkflowNode } from '../../types';
import { registerWorkflowNodeHandlers, WorkflowNodeHandlerInput } from '../workflow-node-handlers';
import { templateText } from '../template';
import { pause, waitForWorkflowEvent } from '../timing';
import { resolveWorkflowMarkersAsync } from '../../workflow-typed-value';
import {
    coerceJson,
    resolveCompareValueAsync,
    resolveCredentialValue,
    resolveWorkflowValue,
    resolveWorkflowValueAsync
} from '../values';

/** Node-RED status fills map onto the semantic levels used by the canvas. */
const STATUS_FILL_LEVELS: Record<string, ActivityNodeStatus['level']> = {
    red: 'error',
    green: 'success',
    yellow: 'warn',
    blue: 'info',
    grey: 'info',
    gray: 'info'
};

async function runTask(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    if (config.fail === true) {
        return {
            success: false,
            error: new Error(String(config.error || `Task "${node.name}" failed`)),
            data: { nodeId: node.id, failed: true }
        };
    }
    const action = config.action;
    const actions = (context as any).actions || {};
    if (typeof action === 'function') {
        return { success: true, data: { nodeId: node.id, result: await action(context) } };
    }
    if (typeof action === 'string' && action && typeof actions[action] === 'function') {
        return { success: true, data: { nodeId: node.id, result: await actions[action](context) } };
    }
    if (config.execute && typeof config.execute === 'function') {
        return { success: true, data: { nodeId: node.id, result: await config.execute(context) } };
    }
    if (config.result !== undefined) {
        const result = coerceJson(config.result);
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            return { success: true, data: { ...result, nodeId: node.id } };
        }
        return { success: true, data: { nodeId: node.id, result } };
    }
    return { success: true, data: { nodeId: node.id, config } };
}

const logOrDebug = async ({ node, context }: WorkflowNodeHandlerInput): Promise<ActivityResult> => {
        const config = node.config || {};
                    if (node.type === 'debug' && config.active === false) {
                        return { success: true, data: { nodeId: node.id, skipped: true } };
                    }
                    const level = String(config.level || 'info');
                    const field = config.field === undefined || config.field === null
                        ? ''
                        : String(config.field).trim();
                    const value = config.complete === true
                        ? { ...context }
                        : field
                            ? await resolveWorkflowValueAsync(field, context)
                            : await resolveWorkflowValueAsync(config.message, context);
                    let message: string;
                    if (value !== null && typeof value === 'object') {
                        try {
                            message = JSON.stringify(value);
                        } catch {
                            message = String(value);
                        }
                    } else {
                        message = String(value ?? '');
                    }
                    const logger = (context as any).logger;
                    if (logger && typeof logger[level] === 'function') {
                        logger[level](message);
                    }
                    if (node.type === 'debug' && config.console === true && typeof console !== 'undefined') {
                        const write = (console as any)[level] || console.log;
                        write.call(console, message);
                    }
                    // Node-RED `tostatus`: mirror the message on the node itself.
                    const showInStatus = node.type === 'debug' && config.tostatus === true && message;
                    return {
                        success: true,
                        data: { nodeId: node.id, level, message },
                        ...(showInStatus
                            ? {
                                status: {
                                    text: message.length > 80 ? `${message.slice(0, 77)}…` : message,
                                    level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'
                                }
                            }
                            : {})
                    };
};

/** Trigger/action nodes: task, logging, injection, trigger, delay, code, template. */
registerWorkflowNodeHandlers({
    task: async ({ node, context }) => runTask(node, context),
    log: logOrDebug,
    debug: logOrDebug,
    delay: async ({ node, context, host, extras }) => {
        const config = node.config || {};
                    const mode = String(config.mode || 'fixed');
                    if (mode === 'rate') {
                        const limit = Math.max(1, Number(config.rateCount) || 1);
                        const windowMs = Math.max(0, Number(config.rateWindow) || 0);
                        const state = extras?.nodeState || {};
                        const stamps: number[] = Array.isArray(state.rateStamps) ? state.rateStamps : [];
                        const now = Date.now();
                        let recent = stamps
                            .filter(stamp => windowMs <= 0 || now - stamp < windowMs)
                            .sort((a, b) => a - b);
                        if (recent.length >= limit) {
                            const action = String(config.rateAction || 'drop');
                            if (action === 'queue' && windowMs > 0) {
                                const wait = Math.max(0, recent[0] + windowMs - now);
                                if (!(await pause(wait, extras?.cancelled))) {
                                    return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                                }
                                const after = Date.now();
                                recent = recent.filter(stamp => windowMs <= 0 || after - stamp < windowMs);
                            }
                            if (recent.length >= limit) {
                                if (action === 'queue') {
                                    // A concurrent waiter filled the last slot; queue this message too.
                                    const wait = Math.max(0, (recent[0] + windowMs) - Date.now());
                                    if (!(await pause(wait, extras?.cancelled))) {
                                        return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                                    }
                                    recent = recent.filter(stamp => windowMs <= 0 || Date.now() - stamp < windowMs);
                                }
                                if (recent.length >= limit) {
                                    state.rateStamps = recent;
                                    return {
                                        success: true,
                                        data: { nodeId: node.id, dropped: true, rateLimited: true, mode: 'rate' }
                                    };
                                }
                            }
                        }
                        recent.push(Date.now());
                        state.rateStamps = recent;
                        return {
                            success: true,
                            data: {
                                nodeId: node.id,
                                delayed: 0,
                                mode: 'rate',
                                rateRemaining: Math.max(0, limit - recent.length)
                            }
                        };
                    }
                    const unit = String(config.unit || 'ms');
                    const factor = unit === 's' ? 1000 : unit === 'min' ? 60000 : 1;
                    let delay = Math.max(0, Number(config.delay ?? config.duration ?? 0) || 0) * factor;
                    if (mode === 'fixed' && config.override === true) {
                        const override = Number(resolveWorkflowValue('delay', context));
                        if (Number.isFinite(override) && override >= 0) {
                            delay = override;
                        }
                    }
                    if (mode === 'random') {
                        const min = Math.max(0, Number(config.randomMin) || 0) * factor;
                        const max = Math.max(min, (Number(config.randomMax) || 0) * factor || min);
                        delay = min + Math.random() * (max - min);
                    }
                    if (!(await pause(delay, extras?.cancelled))) {
                        return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                    }
                    return { success: true, data: { nodeId: node.id, delayed: delay, mode } };
    },
    inject: async ({ node, context, host, extras }) => {
        const config = node.config || {};
                    const trigger = String(config.trigger || 'manual');
                    const onceDelay = Math.max(0, Number(config.onceDelay) || 0) * 1000;
                    if (onceDelay) {
                        await new Promise(resolve => setTimeout(resolve, onceDelay));
                    }
                    const payloadType = String(config.payloadType || 'json');
                    let payload: any;
                    if (payloadType === 'string') {
                        const text = config.payloadValue === undefined ? config.payload : config.payloadValue;
                        payload = text === undefined || text === null ? '' : String(text);
                    } else if (payloadType === 'number') {
                        payload = Number(config.payloadValue === undefined ? config.payload : config.payloadValue);
                    } else if (payloadType === 'boolean') {
                        const bool = config.payloadValue === undefined ? config.payload : config.payloadValue;
                        payload = bool === true || bool === 'true' || bool === 1 || bool === '1';
                    } else if (payloadType === 'expression') {
                        payload = await evaluateWorkflowExpression(String(config.payloadExpression ?? ''), context);
                    } else if (payloadType === 'timestamp') {
                        payload = Date.now();
                    } else if (payloadType === 'env') {
                        const name = String(config.payloadValue ?? '').trim();
                        payload = name ? (context as any).env?.[name] : undefined;
                        if (payload === undefined) {
                            return {
                                success: false,
                                error: new Error(`Environment variable "${name || '(empty)'}" is not available.`),
                                data: { nodeId: node.id }
                            };
                        }
                    } else {
                        payload = coerceJson(config.payload ?? {});
                    }
                    if (trigger === 'event') {
                        const event = String(config.event || '').trim();
                        if (!event) {
                            return { success: false, error: new Error('Event injection requires an event name'), data: { nodeId: node.id } };
                        }
                        const timeoutMs = Math.max(0, Number(config.timeout) || 0) * 1000;
                        const eventValue = await waitForWorkflowEvent(context, event, timeoutMs);
                        if (eventValue !== undefined) {
                            payload = eventValue;
                        }
                    }
                    const topic = config.topic === undefined || config.topic === null
                        ? ''
                        : String(config.topic);
                    const extra: Record<string, any> = {};
                    // Properties can reference the payload being injected, so resolve
                    // them against a context that already carries it.
                    const propertyContext: any = {
                        ...context,
                        payload,
                        msg: { ...((context as any).msg || {}), payload, ...(topic ? { topic } : {}) }
                    };
                    for (const rule of Array.isArray(config.properties) ? config.properties : []) {
                        const key = String(rule?.key || '').trim();
                        if (!key) {
                            continue;
                        }
                        const resolved = await resolveCompareValueAsync(rule.value, propertyContext);
                        const value = typeof resolved === 'string' ? coerceJson(resolved) : resolved;
                        const target = String(rule.target || 'msg');
                        if (target === 'flow' || target === 'global') {
                            // Node-RED inject properties can write context stores.
                            const scope = target === 'flow' ? 'flow' : 'global';
                            const store = (context as any)[scope] || ((context as any)[scope] = {});
                            store[key] = value;
                            continue;
                        }
                        extra[key] = value;
                    }
                    const finalPayload = extra.payload !== undefined ? extra.payload : payload;
                    const base = topic ? { topic } : {};
                    const data: Record<string, any> = { nodeId: node.id, ...base, ...extra };
                    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                        Object.assign(data, payload);
                    }
                    data.payload = finalPayload;
                    if (topic || Object.keys(extra).length) {
                        data.msg = { ...(topic ? { topic } : {}), ...extra, payload: finalPayload };
                    }
                    return { success: true, data };
    },
    trigger: async ({ node, context, host, extras }) => {
        const config = node.config || {};
                    const delay = Math.max(0, Number(config.delay) || 0);
                    const state = extras?.nodeState || {};
                    const mode = String(config.newMessage || 'parallel');
                    const resetVersion = Number(state.triggerResetVersion) || 0;
                    if (resolveWorkflowValue('reset', context) === true) {
                        state.triggerResetVersion = resetVersion + 1;
                        state.triggerGeneration = (Number(state.triggerGeneration) || 0) + 1;
                        state.triggerDeadline = 0;
                        return {
                            success: true,
                            data: { nodeId: node.id, dropped: true, reset: true, triggered: false }
                        };
                    }
                    const generation = (Number(state.triggerGeneration) || 0) + 1;
                    state.triggerGeneration = generation;
                    let deadline = Date.now() + delay;
                    if (mode === 'extend') {
                        const existing = Number(state.triggerDeadline) || 0;
                        if (existing > Date.now()) {
                            deadline = existing + delay;
                        }
                        state.triggerDeadline = deadline;
                    }
                    let superseded = false;
                    let reset = false;
                    const stopped = !(await pause(Math.max(0, deadline - Date.now()), () => {
                        if (extras?.cancelled?.()) {
                            return true;
                        }
                        if ((Number(state.triggerResetVersion) || 0) !== resetVersion) {
                            reset = true;
                            superseded = true;
                            return true;
                        }
                        if ((mode === 'restart' || mode === 'extend') && Number(state.triggerGeneration) !== generation) {
                            superseded = true;
                            return true;
                        }
                        return false;
                    }));
                    if (stopped) {
                        if (superseded) {
                            return {
                                success: true,
                                data: { nodeId: node.id, dropped: true, superseded: true, reset, triggered: false }
                            };
                        }
                        return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                    }
                    const payload = coerceJson(config.payload ?? {});
                    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                        return {
                            success: true,
                            data: { ...payload, payload, nodeId: node.id, triggered: true }
                        };
                    }
                    return { success: true, data: { nodeId: node.id, triggered: true, payload } };
    },
    'event-emit': async ({ node, context }) => {
        const config = node.config || {};
    const event = String(config.event || 'workflow.event');
    const payload = await resolveWorkflowMarkersAsync(coerceJson(config.payload), context);
    const bus = (context as any).eventBus || (context as any).events;
    if (bus && typeof bus.emit === 'function') {
        bus.emit(event, payload);
        return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
    }
    if (typeof (context as any).emit === 'function') {
        (context as any).emit(event, payload);
        return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
    }
    return { success: true, data: { nodeId: node.id, event, emitted: false, payload } };
    },
    'event-wait': async ({ node, context }) => {
        const config = node.config || {};
    const event = String(config.event || 'workflow.event');
    const timeout = Math.max(0, Number(config.timeout) || 0);
    const bus = (context as any).eventBus || (context as any).events;
    try {
        if (bus && typeof bus.wait === 'function') {
            const value = await bus.wait(event, timeout);
            return { success: true, data: { nodeId: node.id, event, value, waited: true } };
        }
        if (typeof (context as any).waitEvent === 'function') {
            const value = timeout
                ? await Promise.race([
                    Promise.resolve((context as any).waitEvent(event)),
                    new Promise(resolve => setTimeout(() => resolve(undefined), timeout))
                ])
                : await (context as any).waitEvent(event);
            return { success: true, data: { nodeId: node.id, event, value, waited: true } };
        }
        return { success: true, data: { nodeId: node.id, event, waited: false } };
    } catch (error) {
        return { success: false, error: error as Error, data: { nodeId: node.id, event } };
    }
    },
    command: async ({ node, context }) => {
        const config = node.config || {};
    const command = String(config.command || '');
    const rawArgs = config.args;
    const args = Array.isArray(rawArgs)
        ? rawArgs.map(item => item && typeof item === 'object' && 'value' in item ? item.value : item)
        : coerceJson(rawArgs);
    const executor = (context as any).exec
        || (context as any).runCommand
        || (context as any).commands?.[command];
    if (typeof executor === 'function') {
        try {
            const result = await executor(command, args, context);
            return {
                success: true,
                data: result && typeof result === 'object'
                    ? { ...result, nodeId: node.id, command }
                    : { nodeId: node.id, command, result }
            };
        } catch (error) {
            return { success: false, error: error as Error, data: { nodeId: node.id, command } };
        }
    }
    return { success: true, data: { nodeId: node.id, command, skipped: true, args } };
    },
    function: async ({ node, context, host, extras }) => {
        const config = node.config || {};
                    // Node-RED `node.status`/`node.warn`/... helpers captured by the
                    // sandbox and attached to the result.
                    let pendingStatus: ActivityNodeStatus | undefined;
                    const setStatus = (
                        text: any,
                        level: ActivityNodeStatus['level'] = 'info',
                        shape?: ActivityNodeStatus['shape'],
                        fill?: string
                    ): void => {
                        const value = String(text ?? '').trim();
                        if (!value) {
                            return;
                        }
                        pendingStatus = {
                            text: value.length > 80 ? `${value.slice(0, 77)}…` : value,
                            level,
                            ...(shape ? { shape } : {}),
                            ...(fill ? { fill } : {})
                        };
                    };
                    const logger = (context as any).logger;
                    /** Node-RED style `flow.get/set` on the shared scope objects. */
                    const scoped = (target: Record<string, any>) => new Proxy(target, {
                        get(store, key) {
                            if (key === 'get') {
                                return (name: string, fallback?: any) =>
                                    store[name as any] === undefined ? fallback : store[name as any];
                            }
                            if (key === 'set') {
                                return (name: string, value: any) => {
                                    store[name as any] = value;
                                    return value;
                                };
                            }
                            return store[key as any];
                        },
                        set(store, key, value) {
                            store[key as any] = value;
                            return true;
                        }
                    });
                    /** Messages passed to `node.send`; DAG runs forward one result. */
                    const sent: any[] = [];
                    /** Node-RED node context: persisted per workflow + node. */
                    const nodeState = extras?.nodeState || {};
                    const nodeApi = {
                        id: node.id,
                        name: node.name,
                        get: (key: string, fallback?: any) =>
                            nodeState[key] === undefined ? fallback : nodeState[key],
                        set: (key: string, value: any) => {
                            nodeState[key] = value;
                            return value;
                        },
                        has: (key: string) => Object.prototype.hasOwnProperty.call(nodeState, key),
                        send: (value: any) => {
                            sent.push(value);
                            return nodeApi;
                        },
                        status: (value: any) => {
                            if (value && typeof value === 'object') {
                                const fill = String(value.fill || '').trim();
                                const shape = value.shape === 'ring' ? 'ring' : value.shape === 'dot' ? 'dot' : undefined;
                                const named = STATUS_FILL_LEVELS[fill.toLowerCase()];
                                const level = String(value.level || named || 'info');
                                setStatus(
                                    value.text,
                                    level === 'success' || level === 'warn' || level === 'error' ? level : 'info',
                                    shape,
                                    fill || undefined
                                );
                            } else {
                                setStatus(value);
                            }
                            return nodeApi;
                        },
                        info: (message: any) => {
                            logger?.info?.(String(message));
                            setStatus(message, 'info');
                        },
                        warn: (message: any) => {
                            logger?.warn?.(String(message));
                            setStatus(message, 'warn');
                        },
                        debug: (message: any) => {
                            logger?.debug?.(String(message));
                        },
                        error: (message: any) => {
                            logger?.error?.(String(message));
                            setStatus(message, 'error');
                            throw new Error(String(message));
                        }
                    };
                    try {
                        const source = String(config.code || 'return input;');
                        const msg = (context as any).msg || { payload: (context as any).payload };
                        const flow = scoped((context as any).flow || {});
                        const global = scoped((context as any).global || {});
                        // `env` already carries non-enumerable get/has helpers from the
                        // service environment scope.
                        const env = (context as any).env || {};
                        const run = async (code: string) => {
                            // Trusted-code node: same trust level as a Node-RED function node.
                            const fn = new Function(
                                'context',
                                'input',
                                'msg',
                                'flow',
                                'global',
                                'env',
                                'node',
                                `"use strict"; return (async () => { ${code}\n })();`
                            ) as (
                                ctx: any, input: any, msg: any, flow: any, global: any, env: any, nodeApi: any
                            ) => Promise<any>;
                            const value = await fn(context, context, msg, flow, global, env, nodeApi);
                            // Function nodes may mutate msg directly; keep the branch
                            // context payload/topic in sync before the next node runs.
                            (context as any).msg = msg;
                            (context as any).payload = msg.payload;
                            return value;
                        };
                        if (String(config.initialize || '').trim()) {
                            const initial = await run(String(config.initialize));
                            if (initial && typeof initial === 'object' && !Array.isArray(initial)) {
                                Object.assign(context, initial);
                            }
                        }
                        let value = await run(source);
                        if ((value === undefined || value === null) && sent.length) {
                            // `node.send(msg)` without a return keeps the last message.
                            value = sent[sent.length - 1];
                        }
                        if (String(config.finalize || '').trim()) {
                            const finalized = await run(String(config.finalize));
                            if (finalized && typeof finalized === 'object' && !Array.isArray(finalized)) {
                                Object.assign(context, finalized);
                            }
                        }
                        const outputCount = Math.max(1, Math.min(8, Number(config.outputs) || 1));
                        if (outputCount > 1 && Array.isArray(value)) {
                            // Multi-output: one message per port (`out`, `out-2`, ...).
                            const ids = ['out', ...Array.from({ length: outputCount - 1 }, (_, index) => `out-${index + 2}`)];
                            const messages: Record<string, any> = {};
                            value.slice(0, outputCount).forEach((item: any, index: number) => {
                                if (item !== undefined && item !== null) {
                                    messages[ids[index]] = item;
                                }
                            });
                            return {
                                success: true,
                                data: { nodeId: node.id, outputs: value, messages },
                                ...(pendingStatus ? { status: pendingStatus } : {})
                            };
                        }
                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                            const isMessage = 'payload' in value
                                || 'topic' in value
                                || 'parts' in value
                                || 'meta' in value;
                            return {
                                success: true,
                                data: { ...value, nodeId: node.id, ...(isMessage ? { msg: value } : {}) },
                                ...(pendingStatus ? { status: pendingStatus } : {})
                            };
                        }
                        return {
                            success: true,
                            data: { nodeId: node.id, result: value },
                            ...(pendingStatus ? { status: pendingStatus } : {})
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error as Error,
                            data: { nodeId: node.id },
                            ...(pendingStatus ? { status: pendingStatus } : {})
                        };
                    }
    },
    template: async ({ node, context, host, extras }) => {
        const config = node.config || {};
                    const template = String(config.template ?? '');
                    const syntax = String(config.syntax || 'mustache');
                    const rendered = syntax === 'plain' ? template : templateText(template, context);
                    const output = String(config.output || 'text');
                    let text: any = rendered;
                    if (output === 'json') {
                        try {
                            text = rendered.trim() ? JSON.parse(rendered) : null;
                        } catch (error) {
                            return {
                                success: false,
                                error: new Error(`Invalid JSON template output: ${(error as Error).message}`),
                                data: { nodeId: node.id }
                            };
                        }
                    } else if (output === 'yaml') {
                        try {
                            text = rendered.trim() ? parseYaml(rendered) : null;
                        } catch (error) {
                            return {
                                success: false,
                                error: new Error(`Invalid YAML template output: ${(error as Error).message}`),
                                data: { nodeId: node.id }
                            };
                        }
                    }
                    const target = String(config.target || 'message');
                    return { success: true, data: { nodeId: node.id, [target]: text, value: text } };
    }
});
