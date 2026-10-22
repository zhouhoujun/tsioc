import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const bundleState = require('../bin/bundle-state.js') as {
    BUNDLE_VERSION: number;
    resolveBundleState(options?: { packageRoot?: string }): { mode: 'bundle' | 'source'; reason: string; inputs?: number };
    resolveBundle(options?: { packageRoot?: string }): { mode: 'bundle' | 'source'; reason: string };
};

interface Fixture {
    root: string;
    cleanup(): void;
    writeInput(name: string, content: string): string;
    writeManifest(inputs: Array<{ file: string; mtimeMs: number; size: number }>, version?: number): void;
    writeBundle(content?: string): void;
}

function fixture(): Fixture {
    const root = mkdtempSync(join(tmpdir(), 'tsdi-bundle-state-'));
    mkdirSync(join(root, 'bundle'), { recursive: true });
    mkdirSync(join(root, 'src'), { recursive: true });
    return {
        root,
        cleanup: () => rmSync(root, { recursive: true, force: true }),
        writeInput(name, content) {
            const file = join(root, name);
            writeFileSync(file, content);
            return file;
        },
        writeManifest(inputs, version = bundleState.BUNDLE_VERSION) {
            writeFileSync(join(root, 'bundle', 'manifest.json'), JSON.stringify({
                version,
                entry: 'src/cli-entry.ts',
                output: 'bundle/tsdi-agent.cjs',
                inputs
            }));
        },
        writeBundle(content = '// stub bundle\n') {
            writeFileSync(join(root, 'bundle', 'tsdi-agent.cjs'), content);
        }
    };
}

function stamp(root: string, name: string) {
    const info = statSync(join(root, name));
    return { file: name, mtimeMs: info.mtimeMs, size: info.size };
}

@Suite('CLI bundle freshness')
export class BundleStateTest {

    private previous: string | undefined;

    private before() {
        this.previous = process.env.TSDI_AGENT_BUNDLE;
        delete process.env.TSDI_AGENT_BUNDLE;
    }

    private after() {
        if (this.previous === undefined) {
            delete process.env.TSDI_AGENT_BUNDLE;
        } else {
            process.env.TSDI_AGENT_BUNDLE = this.previous;
        }
    }

    @Test('uses a fresh bundle whose manifest matches every source')
    freshBundleIsUsed() {
        const f = fixture();
        this.before();
        try {
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            const state = bundleState.resolveBundleState({ packageRoot: f.root });
            expect(state.mode).toBe('bundle');
            expect(state.inputs).toBe(1);
        } finally {
            this.after();
            f.cleanup();
        }
    }

    @Test('falls back to source when a source changed size or mtime')
    editedSourceFallsBack() {
        const f = fixture();
        this.before();
        try {
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            f.writeInput('src/cli-entry.ts', 'export const version = 2;\n');
            const state = bundleState.resolveBundleState({ packageRoot: f.root });
            expect(state.mode).toBe('source');
            expect(state.reason).toContain('stale: src/cli-entry.ts');
        } finally {
            this.after();
            f.cleanup();
        }
    }

    @Test('a touched-but-identical source also invalidates the bundle (mtime is part of the stamp)')
    touchedSourceFallsBack() {
        const f = fixture();
        this.before();
        try {
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            const future = new Date(Date.now() + 5000);
            utimesSync(input, future, future);
            const state = bundleState.resolveBundleState({ packageRoot: f.root });
            expect(state.mode).toBe('source');
            expect(state.reason).toContain('stale: src/cli-entry.ts');
        } finally {
            this.after();
            f.cleanup();
        }
    }

    @Test('falls back to source when a recorded input no longer exists')
    missingSourceFallsBack() {
        const f = fixture();
        this.before();
        try {
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            rmSync(input);
            const state = bundleState.resolveBundleState({ packageRoot: f.root });
            expect(state.mode).toBe('source');
            expect(state.reason).toContain('missing src/cli-entry.ts');
        } finally {
            this.after();
            f.cleanup();
        }
    }

    @Test('never uses a bundle without a matching manifest version, inputs or output file')
    unusableBundleFallsBack() {
        this.before();
        const cases: Array<(f: Fixture) => void> = [
            f => { f.writeBundle(); f.writeManifest([], bundleState.BUNDLE_VERSION); },
            f => { f.writeBundle(); f.writeManifest([], bundleState.BUNDLE_VERSION - 1); },
            f => { f.writeManifest([]); }
        ];
        try {
            for (const setup of cases) {
                const f = fixture();
                try {
                    setup(f);
                    const state = bundleState.resolveBundleState({ packageRoot: f.root });
                    expect(state.mode).toBe('source');
                } finally {
                    f.cleanup();
                }
            }
            const f = fixture();
            try {
                const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
                f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
                const state = bundleState.resolveBundleState({ packageRoot: f.root });
                expect(state.mode).toBe('source');
                expect(state.reason).toBe('missing bundle');
            } finally {
                f.cleanup();
            }
        } finally {
            this.after();
        }
    }

    @Test('TSDI_AGENT_BUNDLE=0 forces the source path')
    disabledByEnv() {
        const f = fixture();
        this.before();
        try {
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            process.env.TSDI_AGENT_BUNDLE = '0';
            const state = bundleState.resolveBundle({ packageRoot: f.root });
            expect(state.mode).toBe('source');
            expect(state.reason).toContain('TSDI_AGENT_BUNDLE');
        } finally {
            this.after();
            f.cleanup();
        }
    }

    @Test('TSDI_AGENT_BUNDLE=1 fails loudly instead of silently running stale sources')
    forcedBundleMustBeUsable() {
        const f = fixture();
        this.before();
        try {
            process.env.TSDI_AGENT_BUNDLE = '1';
            expect(() => bundleState.resolveBundle({ packageRoot: f.root })).toThrow(/TSDI_AGENT_BUNDLE=1/);
            const input = f.writeInput('src/cli-entry.ts', 'export const version = 1;\n');
            f.writeBundle();
            f.writeManifest([stamp(f.root, 'src/cli-entry.ts')]);
            expect(bundleState.resolveBundle({ packageRoot: f.root }).mode).toBe('bundle');
        } finally {
            this.after();
            f.cleanup();
        }
    }
}
