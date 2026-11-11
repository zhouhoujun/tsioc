#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

function usage() {
    console.log(`Usage: node scripts/scaffold-microservice.mjs <name> [options]

Options:
  --dir <path>     output package directory (default: packages/microservices/<name>)
  --port <number>  HTTP listen port (default: 3000)
  --kind <kind>    service | gateway (default: service)
  --force          overwrite an existing directory
  --help           show this help
`);
}

function parseArgs(argv) {
    const args = { name: '', dir: '', port: 3000, force: false, kind: 'service' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') {
            usage();
            process.exit(0);
        }
        if (arg === '--force') {
            args.force = true;
            continue;
        }
        if (arg === '--dir') {
            args.dir = argv[++i] ?? '';
            continue;
        }
        if (arg === '--port') {
            args.port = Number(argv[++i] ?? 3000);
            continue;
        }
        if (arg === '--kind') {
            args.kind = argv[++i] ?? 'service';
            continue;
        }
        if (!args.name) {
            args.name = arg;
        }
    }
    return args;
}

function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf-8');
}

const args = parseArgs(process.argv.slice(2));
if (!args.name) {
    usage();
    process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(args.name)) {
    console.error(`Invalid service name '${args.name}': use lowercase letters, numbers and dashes.`);
    process.exit(1);
}
if (args.kind !== 'service' && args.kind !== 'gateway') {
    console.error(`Invalid kind '${args.kind}': use service or gateway.`);
    process.exit(1);
}
if (!Number.isInteger(args.port) || args.port <= 0 || args.port > 65535) {
    console.error(`Invalid port '${args.port}'.`);
    process.exit(1);
}

const root = process.cwd();
const name = args.name;
const kind = args.kind;
const className = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
const pkgDir = path.resolve(root, args.dir || path.join('packages/microservices', name));
const relToRoot = path.relative(pkgDir, root).replace(/\\/g, '/') || '.';

if (fs.existsSync(pkgDir)) {
    if (!args.force) {
        console.error(`Directory already exists: ${pkgDir}. Use --force to overwrite.`);
        process.exit(1);
    }
    fs.rmSync(pkgDir, { recursive: true, force: true });
}

write(path.join(pkgDir, 'package.json'), JSON.stringify({
    name: `@tsdi/${name}-${kind}`,
    version: '0.1.0',
    description: `${className} ${kind}`,
    scripts: {
        build: 'ts-node -r tsconfig-paths/register taskfile.ts',
        test: 'ts-node -r tsconfig-paths/register unit.ts'
    },
    dependencies: {
        '@tsdi/common': '6.0.31',
        '@tsdi/core': '6.0.31',
        '@tsdi/http-microservice': '6.0.31',
        ...(kind === 'gateway' ? { '@tsdi/gateway': '6.0.31' } : {}),
        '@tsdi/ioc': '6.0.31',
        '@tsdi/logger': '6.0.31',
        '@tsdi/service': '6.0.31'
    },
    devDependencies: {
        '@tsdi/compiler': '6.0.31',
        '@tsdi/unit': '6.0.31',
        'ts-node': '^10.9.2',
        'tsconfig-paths': '^4.2.0',
        typescript: '^5.8.2'
    }
}, null, 2) + '\n');

write(path.join(pkgDir, 'tsconfig.json'), JSON.stringify({
    extends: path.posix.join(relToRoot, 'tsconfig.json')
}, null, 2) + '\n');

write(path.join(pkgDir, 'unit.ts'), `/// <reference types="node" />
import { runTest } from '@tsdi/unit';
runTest('./test/**/*.spec.ts', { baseURL: __dirname });
`);

write(path.join(pkgDir, 'taskfile.ts'), `import { runCompiler } from '@tsdi/compiler';

if (process.cwd() === __dirname) {
    runCompiler({
        baseURL: __dirname,
        src: ['src/**/*.ts', 'main.ts'],
        outDir: '../../dist/${name}',
        aot: true
    });
}
`);

if (kind === 'gateway') {
    write(path.join(pkgDir, 'src/index.ts'), `export * from './${name}.module';\n`);
    write(path.join(pkgDir, `src/${name}.module.ts`), `import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useGateway } from '@tsdi/gateway';
import { useHttpTransport } from '@tsdi/http';

@Module({
    imports: [LoggerModule],
    providers: [
        provideService(
            useRouter(),
            useGateway({
                discovery: true,
                routes: [{
                    path: '/api',
                    service: 'backend-service',
                    targetUrl: 'http://127.0.0.1:3001',
                    stripPrefix: true
                }]
            }),
            useHttpTransport({
                listenOpts: { host: '0.0.0.0', port: ${args.port} },
                asDefault: true
            })
        )
    ]
})
export class ${className}Module {}
`);
} else {
    write(path.join(pkgDir, 'src/index.ts'), `export * from './${name}.controller';
export * from './${name}.module';
`);
    write(path.join(pkgDir, `src/${name}.controller.ts`), `import { Controller, Get } from '@tsdi/service';

@Controller('/${name}')
export class ${className}Controller {
    @Get('/')
    health() {
        return { service: '${name}', ok: true };
    }
}
`);
    write(path.join(pkgDir, `src/${name}.module.ts`), `import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http';
import { ${className}Controller } from './${name}.controller';

@Module({
    imports: [LoggerModule],
    declarations: [${className}Controller],
    providers: [
        provideService(
            useRouter(),
            useJson(),
            useHttpTransport({
                listenOpts: { host: '0.0.0.0', port: ${args.port} },
                asDefault: true
            })
        )
    ]
})
export class ${className}Module {}
`);
}

write(path.join(pkgDir, 'main.ts'), `import { bootstrapApplication } from '@tsdi/core';
import { ${className}Module } from './src/${name}.module';

bootstrapApplication(${className}Module).catch(err => {
    console.error(err);
    process.exit(1);
});
`);

write(path.join(pkgDir, 'README.md'), `# @tsdi/${name}-${kind}

Generated by \`scripts/scaffold-microservice.mjs\`.

## Run

\`\`\`bash
npm run build
node ../../dist/${name}/main.js
\`\`\`

${kind === 'gateway' ? `Routes are discovered under \`/api\`; configure \`backend-service\` discovery or replace \`targetUrl\` in \`src/${name}.module.ts\`.` : `The service listens on \`http://0.0.0.0:${args.port}/${name}\`.`}
`);

console.log(`Created ${path.relative(root, pkgDir)} (${kind})`);
console.log(`Next: cd ${path.relative(root, pkgDir)} && npm run build`);
