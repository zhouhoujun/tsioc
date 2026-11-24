import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { ArtifactStoreAdapter } from '@tsdi/agent';

/** Node adapter for the agent ArtifactStore (artifact tools run in the workspace). */
export const nodeArtifactAdapter: ArtifactStoreAdapter = {
    join: (...paths) => path.join(...paths),
    readText: filePath => fs.readFile(filePath, 'utf8'),
    writeText: async (filePath, content) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
    },
    mkdir: async (dir, options) => { await fs.mkdir(dir, options); },
    remove: async (target, options) => { await fs.rm(target, options); },
    existsSync: target => fsSync.existsSync(target),
    list: async dir => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.map(entry => ({ name: entry.name, kind: entry.isDirectory() ? 'directory' as const : 'file' as const }));
    }
};
