import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TrustedProjectStore } from '@tsdi/agent';
import { resolveCliConfig } from './config';

interface TrustCommandOptions {
    root?: string;
    workspace?: string;
    untrust?: boolean;
}

function resolveAgentRoot(explicit?: string): string {
    if (explicit?.trim()) {
        return path.resolve(explicit.trim());
    }
    return path.join(os.homedir(), '.tsdi-agent');
}

export function runAgentTrustCommand(dir: string | undefined, options: TrustCommandOptions): void {
    const config = resolveCliConfig({ ...options, root: options.root });
    const target = options.workspace
        ? path.resolve(options.workspace)
        : (dir?.trim() ? path.resolve(dir.trim()) : config.workspace);
    if (!target) {
        process.stdout.write('No workspace to trust. Pass a directory, --workspace, or configure settings.workspace.\n');
        return;
    }
    const root = resolveAgentRoot(options.root);
    const store = new TrustedProjectStore({
        fileAdapter: {
            isAbsolute: p => path.isAbsolute(p),
            normalize: p => path.normalize(p),
            join: (...p) => path.join(...p),
            resolve: (...p) => path.resolve(...p),
            extname: p => path.extname(p),
            existsSync: p => fs.existsSync(p),
            read: (p, o) => fs.createReadStream(p, o) as any,
            find: async () => null,
            readText: async (p, e = 'utf-8') => (await fs.promises.readFile(p, e)).toString(),
            readTextSync: (p, e = 'utf-8') => fs.readFileSync(p, e).toString(),
            readJSON: async (p) => JSON.parse(fs.readFileSync(p, 'utf-8')),
            readJSONSync: (p) => JSON.parse(fs.readFileSync(p, 'utf-8')),
            writeText: async (p, c) => { fs.writeFileSync(p, c); },
            mkdir: async (p, o) => { fs.mkdirSync(p, o); },
            remove: async (p, o) => { fs.rmSync(p, o); },
            stat: async () => null,
            list: async () => []
        },
        root
    });
    if (options.untrust) {
        const removed = store.untrust(target);
        process.stdout.write(removed
            ? `Untrusted workspace: ${target}\n`
            : `Workspace was not trusted: ${target}\n`);
        return;
    }
    store.trust(target);
    process.stdout.write(`Trusted workspace: ${target}\n`);
    process.stdout.write(`Store: ${store.list().length} project(s) in ${root}/trusted-projects.json\n`);
}
