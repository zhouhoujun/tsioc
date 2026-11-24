import { createInjector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import {
    buildWorkflowCanvasModel,
    buildWorkflowInspectorModel,
    buildWorkflowPalette
} from '../src/visual/workflow-view-models';
import { validateWorkflowConfigs } from '../src/visual/workflow-config-validation';
import { decodeWorkflowTypedValue, resolveWorkflowTypedValue } from '../src/visual/workflow-typed-value';
import { VisualWorkflowDefinition } from '../src/visual/types';

/**
 * Activities performance harness.
 *
 * Run with: `npm run bench` in packages/activities. Numbers are host-specific;
 * compare before/after a change instead of treating them as absolute budgets.
 * Each metric runs several times and keeps the best sample, which filters most
 * scheduler interference while still moving when the code gets slower.
 */

function cpuMs(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000;
}

const results = new Map<string, number>();

function report(name: string, duration: number): void {
    const current = results.get(name);
    if (current === undefined || duration < current) {
        results.set(name, duration);
    }
}

/** Calibration loop used by the budget gate to scale for slow hosts. */
function calibration(): number {
    const items = Array.from({ length: 256 }, (_value, index) => ({ value: index, nested: { value: index * 2 } }));
    const rounds = 200_000;
    let acc = 0;
    const start = cpuMs();
    for (let round = 0; round < rounds; round++) {
        for (let index = 0; index < items.length; index++) {
            acc += items[index].value + items[index].nested.value;
        }
    }
    const duration = cpuMs() - start;
    if (acc === -1) {
        console.log('');
    }
    return duration;
}

const injector = createInjector();
InjectUtil.use(injector, WorkflowModule);
const registry = injector.get(WorkflowNodeRegistry);
const service = injector.get(VisualWorkflowService);

function chain(count: number, type: 'change' | 'function' = 'change'): VisualWorkflowDefinition {
    const nodes = Array.from({ length: count }, (_value, index) =>
        registry.createNode(type === 'change' ? 'change' : 'function', { x: index * 200, y: 100 }, {
            id: `${type}_${index}`,
            config: type === 'change'
                ? { rules: [{ action: 'set', field: `variables.n${index}`, value: String(index) }] }
                : { code: 'msg.payload = (msg.payload || 0) + 1; return msg;' }
        })
    );
    return {
        id: `bench-${type}-${count}`,
        name: 'Bench chain',
        nodes,
        connections: nodes.slice(0, -1).map((node, index) => ({
            id: `c${index}`,
            sourceNodeId: node.id,
            sourcePort: 'out',
            targetNodeId: nodes[index + 1].id,
            targetPort: 'in'
        }))
    };
}

function time(name: string, run: () => void, samples = 3): void {
    for (let sample = 0; sample < samples; sample++) {
        const start = cpuMs();
        run();
        report(name, cpuMs() - start);
    }
}

const canvasDefinition = chain(200);
const canvasDesigner = designerFor(canvasDefinition);
const inspectorDesigner = designerFor(chain(20));
inspectorDesigner.selectNode('change_0');
const validationDefinition = chain(100);
const singleDefinition = chain(1);

const definitions: Array<[string, VisualWorkflowDefinition, () => void]> = [
    ['registry lookups', singleDefinition,
        () => {
            for (let round = 0; round < 2000; round++) {
                for (const node of registry.list()) {
                    registry.get(node.type);
                }
            }
        }],
    ['palette 200x', singleDefinition,
        () => {
            for (let round = 0; round < 200; round++) {
                buildWorkflowPalette(registry, 'en');
            }
        }],
    ['canvas 200 nodes rebuild', canvasDefinition,
        () => {
            for (let round = 0; round < 20; round++) {
                buildWorkflowCanvasModel(canvasDesigner, registry, 'en');
            }
        }],
    ['canvas 200 nodes incremental', canvasDefinition,
        () => {
            let previous = buildWorkflowCanvasModel(canvasDesigner, registry, 'en');
            for (let round = 0; round < 200; round++) {
                previous = buildWorkflowCanvasModel(canvasDesigner, registry, 'en', undefined, previous);
            }
        }],
    ['inspector 1000x', singleDefinition,
        () => {
            for (let round = 0; round < 1000; round++) {
                buildWorkflowInspectorModel(inspectorDesigner, registry, 'en');
            }
        }],
    ['config validation 100 nodes', validationDefinition,
        () => {
            for (let round = 0; round < 200; round++) {
                validateWorkflowConfigs(validationDefinition, registry);
            }
        }],
    ['typed value decode 100k', singleDefinition,
        () => {
            for (let round = 0; round < 100_000; round++) {
                decodeWorkflowTypedValue({ type: 'msg', path: 'payload.items[0].total' });
            }
        }],
    ['typed value resolve 100k', singleDefinition,
        () => {
            const context = { payload: { items: [{ total: 7 }] } };
            for (let round = 0; round < 100_000; round++) {
                resolveWorkflowTypedValue({ type: 'msg', path: 'payload.items[0].total' }, context);
            }
        }]
];

function designerFor(definition: VisualWorkflowDefinition): WorkflowDesigner {
    return new WorkflowDesigner({ registry, service, definition });
}

async function benchExecute(): Promise<void> {
    for (let sample = 0; sample < 3; sample++) {
        const start = cpuMs();
        for (let run = 0; run < 100; run++) {
            await service.execute(chain(6, 'function'), { payload: 0 });
        }
        report('execute 6 function nodes 100x', cpuMs() - start);
    }
}

export function print(): void {
    for (const [name, duration] of results) {
        console.log(`${name.padEnd(34)} ${duration.toFixed(2).padStart(9)} ms`);
    }
}

async function main(): Promise<void> {
    report('calibration', calibration());
    for (const [name, , run] of definitions) {
        time(name, run);
    }
    await benchExecute();
    print();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
