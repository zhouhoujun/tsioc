/**
 * In-process benchmarks for the `@tsdi/ioc` and `@tsdi/aop` hot paths.
 *
 * Usage (from the repository root):
 *   npx ts-node -r tsconfig-paths/register packages/ioc/benchmarks/run.ts
 *   npx ts-node -r tsconfig-paths/register packages/ioc/benchmarks/run.ts --rounds 9 --samples 200000 --json out.json
 *
 * The harness reports the *best* round instead of a single average: container
 * and AOP micro-benchmarks are dominated by JIT/GC noise, and a single average
 * swings by tens of percent between runs, which makes before/after comparison
 * useless. Each round is preceded by a warm-up batch.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
    createInjector, InjectUtil, Injectable, Singleton, getClassRef, InjectFlags,
} from '@tsdi/ioc';
import { AopModule, Aspect, Before, JoinPoint, Advisor } from '@tsdi/aop';

interface BenchmarkResult {
    scenario: string;
    group: string;
    samples: number;
    rounds: number;
    bestNsPerOp: number;
    medianNsPerOp: number;
    opsPerSecond: number;
}

interface BenchmarkReport {
    generatedAt: string;
    node: string;
    platform: string;
    results: BenchmarkResult[];
}

@Singleton()
class LeafService {
    value = 1;
}

@Singleton()
class MidService {
    constructor(readonly leaf: LeafService) { }
}

@Singleton()
class RootService {
    constructor(readonly mid: MidService) { }
    pick() {
        return this.mid.leaf.value;
    }
}

@Injectable()
class PlainTarget {
    name = 'plain';
    doWork(n: number) {
        return n + 1;
    }
}

@Injectable()
class AdvisedTarget {
    name = 'advised';
    doWork(n: number) {
        return n + 1;
    }
}

@Injectable()
class NoArgAdvisedTarget {
    doWork(n: number) {
        return n + 1;
    }
}

@Aspect({ static: true })
class BenchAspect {
    @Before('execution(AdvisedTarget.doWork)')
    before(_joinPoint: JoinPoint) { }

    @Before('execution(NoArgAdvisedTarget.doWork)')
    beforeNoArg() { }
}

function argValue(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function bench(group: string, scenario: string, samples: number, rounds: number, fn: () => void): BenchmarkResult {
    const warmup = Math.min(samples, 2000);
    for (let i = 0; i < warmup; i++) fn();

    const perRound: number[] = [];
    for (let round = 0; round < rounds; round++) {
        const started = process.hrtime.bigint();
        for (let i = 0; i < samples; i++) fn();
        perRound.push(Number(process.hrtime.bigint() - started) / samples);
    }
    const sorted = perRound.slice(0).sort((a, b) => a - b);
    const best = sorted[0];
    const median = sorted[Math.floor(sorted.length / 2)];
    return {
        scenario,
        group,
        samples,
        rounds,
        bestNsPerOp: Number(best.toFixed(2)),
        medianNsPerOp: Number(median.toFixed(2)),
        opsPerSecond: Math.round(1e9 / best)
    };
}

function main(): void {
    const rounds = Number(argValue('rounds') ?? 7);
    const samples = Number(argValue('samples') ?? 50000);
    const jsonPath = resolve(argValue('json') ?? resolve(__dirname, 'results/baseline.json'));

    const container = createInjector();
    InjectUtil.use(container, AopModule);
    InjectUtil.register(container, BenchAspect, PlainTarget, AdvisedTarget, NoArgAdvisedTarget, LeafService, MidService, RootService);

    const plain = container.get(PlainTarget);
    const advised = container.get(AdvisedTarget);
    const noArgAdvised = container.get(NoArgAdvisedTarget);
    const child = createInjector(container, []);
    const runtime = container.getRuntime();
    const advisor = runtime.get(Advisor);
    const advisedRef = getClassRef(AdvisedTarget);
    const rootRef = getClassRef(RootService);

    const results: BenchmarkResult[] = [
        bench('ioc', 'injector.get singleton (same injector)', samples, rounds, () => container.get(LeafService)),
        bench('ioc', 'injector.get singleton (child -> parent)', samples, rounds, () => child.get(LeafService)),
        bench('ioc', 'injector.get transient (same injector)', samples, rounds, () => container.get(LeafService, undefined, InjectFlags.NonSingleton)),
        bench('ioc', 'injector.get transient (deps chain)', samples, rounds, () => container.get(MidService, undefined, InjectFlags.NonSingleton)),
        bench('ioc', 'injector.has singleton', samples, rounds, () => container.has(LeafService)),
        bench('ioc', 'injector.resolve token', samples, rounds, () => container.resolve(LeafService as any)),
        bench('ioc', 'ClassRef.getParameters(ctor)', samples, rounds, () => rootRef.getParameters('constructor')),
        bench('ioc', 'ClassRef.hasMetadata(@Injectable)', samples, rounds, () => rootRef.hasMetadata('@Injectable')),
        bench('ioc', 'ClassRef.getDefines(@Injectable)', samples, rounds, () => rootRef.getDefines(rootRef.classDecors[0])),
        bench('ioc', 'ClassRef.getMethodDefines(doWork)', samples, rounds, () => advisedRef.getMethodDefines('doWork')),
        bench('ioc', 'ClassRef.resolveArguments(doWork)', samples, rounds, () => advisedRef.resolveArguments('doWork', container)),
        bench('ioc', 'JoinPoint.create', samples, rounds, () => JoinPoint.create(container, {
            targetRef: advisedRef,
            propertyKey: 'doWork',
            target: advised,
            advisor,
            args: [1]
        })),
        bench('aop', 'plain method call', samples, rounds, () => plain.doWork(1)),
        bench('aop', 'advisor.match(doWork)', samples, rounds, () => advisor.match('doWork', 'AdvisedTarget.doWork', advisedRef, advised)),
        bench('aop', 'advisor.getBefore(doWork)', samples, rounds, () => advisor.getBefore('doWork', 'AdvisedTarget.doWork', advisedRef, advised)),
        bench('aop', 'advised property read', samples, rounds, () => advised.name),
        bench('aop', 'advised method call (before)', Math.max(1000, Math.floor(samples / 5)), rounds, () => advised.doWork(1)),
        bench('aop', 'advised method call (no-arg before)', Math.max(1000, Math.floor(samples / 5)), rounds, () => noArgAdvised.doWork(1))
    ];

    const report: BenchmarkReport = {
        generatedAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        results
    };

    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 4)}\n`);

    console.log(`# ioc/aop benchmarks (${report.platform}, node ${report.node})`);
    console.log('');
    console.log('| group | scenario | best ns/op | median ns/op | best ops/sec |');
    console.log('|---|---|---|---|---|');
    for (const result of results) {
        console.log(`| ${result.group} | ${result.scenario} | ${result.bestNsPerOp} | ${result.medianNsPerOp} | ${result.opsPerSecond} |`);
    }
    console.log('');
    console.log(`report: ${jsonPath}`);
}

main();
