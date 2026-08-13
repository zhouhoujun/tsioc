import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { DesktopApp, DesktopPaths } from './DesktopApp';
import { resolveDesktopConfig } from './config';
import { ElectronHost, FileSystemLike } from './host';

const fileSystem: FileSystemLike = {
    writeTextFile(filePath: string, content: string) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
    },
    joinPath: (...parts: string[]) => path.join(...parts),
    dirname: (filePath: string) => path.dirname(filePath),
    toFileUrl: (filePath: string) => pathToFileURL(filePath).href
};

function createElectronHost(electron: unknown): ElectronHost {
    return electron as ElectronHost;
}

function resolvePaths(): DesktopPaths {
    const userDataDir = process.env.TSDI_AGENT_USER_DATA
        ?? path.join(process.env.HOME || process.env.USERPROFILE || '.', '.tsdi-agent', 'desktop');
    const bundlePath = path.join(__dirname, '..', 'resources', 'agent-console.js');
    return {
        scriptUri: pathToFileURL(bundlePath).href,
        htmlPath: path.join(userDataDir, 'console.html')
    };
}

export async function main(): Promise<void> {
    const electron = require('electron') as unknown;
    const app = new DesktopApp(
        createElectronHost(electron),
        fileSystem,
        resolveDesktopConfig(process.argv.slice(2), process.env as Record<string, string | undefined>),
        resolvePaths()
    );
    await app.start();
}

if (typeof require !== 'undefined' && require.main === module) {
    main().catch(error => {
        // tslint:disable-next-line:no-console
        console.error('TSDI Agent desktop failed to start:', error);
        process.exit(1);
    });
}
