#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

function usage() {
    console.log(`Usage: node scripts/scaffold-microservice.mjs <name> [options]

Options:
  --dir <path>     output package directory (default: packages/microservices/<name>)
  --port <number>  HTTP listen port (default: 3000)
  --kind <kind>    service | gateway | transport (default: service)
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
if (args.kind !== 'service' && args.kind !== 'gateway' && args.kind !== 'transport') {
    console.error(`Invalid kind '${args.kind}': use service, gateway or transport.`);
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
const tokenPrefix = name.toUpperCase().replace(/-/g, '_');
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
    dependencies: kind === 'transport' ? {
        '@tsdi/client': '6.0.31',
        '@tsdi/common': '6.0.31',
        '@tsdi/core': '6.0.31',
        '@tsdi/ioc': '6.0.31',
        '@tsdi/logger': '6.0.31',
        '@tsdi/service': '6.0.31',
        '@tsdi/transport': '6.0.31'
    } : {
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
        src: ${kind === 'transport' ? "['src/**/*.ts']" : "['src/**/*.ts', 'main.ts']"},
        outDir: '../../dist/${name}',
        aot: true
    });
}
`);

if (kind === 'transport') {
    write(path.join(pkgDir, 'src/options.ts'), `import { InstanceOf, Provider, token, Token } from '@tsdi/ioc';
import { ListenOpts, PatternFormatter } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { ServiceOptions } from '@tsdi/service';

/**
 * ${name} server transport options.
 */
export interface ${className}ServOptions extends ServiceOptions {
    providers?: Provider[];
    listenOpts?: ListenOpts;
    formatter?: InstanceOf<PatternFormatter>;
}

/**
 * ${name} client transport options.
 */
export interface ${className}ClientOptions extends ClientOptions {
    formatter?: Token<PatternFormatter>;
}

export const ${tokenPrefix}_SERV_OPTIONS = token<${className}ServOptions>('${tokenPrefix}_SERV_OPTIONS');
export const ${tokenPrefix}_CLIENT_OPTIONS = token<${className}ClientOptions>('${tokenPrefix}_CLIENT_OPTIONS');
`);

    write(path.join(pkgDir, 'src/request.ts'), `import { BaseUrlRequest, Pattern, RequestCloneOpts, RequestInitOpts, UrlRequestOptions } from '@tsdi/common';

export class ${className}Request<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }

    clone(): ${className}Request<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): ${className}Request<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): ${className}Request<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): ${className}Request<any> {
        const opts = this.cloneOpts(update);
        return new ${className}Request(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
`);

    write(path.join(pkgDir, 'src/server.ts'), `import { Inject, Injectable } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { Service, ServiceHandler } from '@tsdi/service';
import { ${tokenPrefix}_SERV_OPTIONS, ${className}ServOptions } from './options';

@Injectable()
export class ${className}Server<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {
    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(${tokenPrefix}_SERV_OPTIONS, { nullable: true }) protected options: ${className}ServOptions
    ) {
        super();
    }

    protected async onStart(): Promise<any> {
        // TODO: open the listener and forward inbound requests:
        //   const context = createRequestContext(this.injector, [[REQUEST, request]]);
        //   this.handler.handle(request, context).subscribe(...)
        throw new Error('${className}Server.onStart: implement the ${name} wire protocol');
    }

    protected async onShutdown(): Promise<any> {
        // TODO: close the listener and release resources.
    }
}
`);

    write(path.join(pkgDir, 'src/client.ts'), `import { Context, Inject, Injectable } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, ResponseEvent, UrlRequestOptions } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { ${tokenPrefix}_CLIENT_OPTIONS, ${className}ClientOptions } from './options';
import { ${className}Request } from './request';

@Injectable()
export class ${className}Client extends AbstractClient<${className}Request<any>, ResponseEvent<any>, UrlRequestOptions> {
    constructor(
        readonly handler: ClientHandler<${className}Request<any>, ResponseEvent<any>>,
        @Inject(${tokenPrefix}_CLIENT_OPTIONS, { nullable: true }) private options: ${className}ClientOptions
    ) {
        super();
    }

    protected buildRequest(first: ${className}Request<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): ${className}Request<any> {
        if (first instanceof ${className}Request) return first;
        const url = typeof first === 'string' ? first : JSON.stringify(first);
        return new ${className}Request(url, typeof first === 'string' ? null : first, options);
    }

    protected initContext(context: Context, req: ${className}Request<any>): void {
        context.set(${className}Client, this);
        context.set(${className}Request, req);
    }

    protected async onShutdown(): Promise<void> {
        // TODO: close the client connection.
    }
}
`);

    write(path.join(pkgDir, 'src/server.factory.ts'), `import { TransferSide } from '@tsdi/common';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { ${className}Server } from './server';
import { ${tokenPrefix}_SERV_OPTIONS, ${className}ServOptions } from './options';

export function ${className}TransportFactory(option: Partial<${className}ServOptions> = {}, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: '${name}' as any,
        side: TransferSide.server,
        features: {},
        ...option
    } as ${className}ServOptions;

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: ${tokenPrefix}_SERV_OPTIONS,
        serverType: ${className}Server,
        providers: option.providers
        // TODO: add protocol-specific providers (message adapter, formatter, ...).
    });
}
`);

    write(path.join(pkgDir, 'src/client.factory.ts'), `import { asProvider } from '@tsdi/ioc';
import { TransferSide } from '@tsdi/common';
import { createClientTransportFeature, getClientBackendToken, ClientTransportFeature } from '@tsdi/client';
import { ${className}Client } from './client';
import { ${tokenPrefix}_CLIENT_OPTIONS, ${className}ClientOptions } from './options';

export function ${className}TransportClientFactory(option: Partial<${className}ClientOptions> = {}, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: '${name}' as any,
        side: TransferSide.client,
        features: {},
        ...option
    } as ${className}ClientOptions;
    const backendToken = getClientBackendToken(config);

    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: ${tokenPrefix}_CLIENT_OPTIONS,
        clientType: ${className}Client,
        backendProvider: asProvider({
            provide: backendToken,
            // TODO: replace with the transport backend that sends the request and
            // emits the response.
            useValue: () => { throw new Error('${className}Client backend is not implemented'); },
            multi: true
        })
    });
}
`);

    write(path.join(pkgDir, 'src/module.ts'), `import { Module } from '@tsdi/ioc';
import { ${className}Server } from './server';
import { ${className}Client } from './client';

@Module({
    declarations: [${className}Server, ${className}Client]
})
export class ${className}TransportModule {}
`);

    write(path.join(pkgDir, 'src/index.ts'), `export * from './options';
export * from './request';
export * from './server';
export * from './client';
export * from './server.factory';
export * from './client.factory';
export * from './module';
`);
} else if (kind === 'gateway') {
    write(path.join(pkgDir, 'src/index.ts'), `export * from './${name}.module';\n`);
    write(path.join(pkgDir, `src/${name}.module.ts`), `import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useGateway } from '@tsdi/gateway';
import { useHttpTransport } from '@tsdi/http-microservice';

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
import { useHttpTransport } from '@tsdi/http-microservice';
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

if (kind !== 'transport') {
    write(path.join(pkgDir, 'main.ts'), `import { bootstrapApplication } from '@tsdi/core';
import { ${className}Module } from './src/${name}.module';

bootstrapApplication(${className}Module).catch(err => {
    console.error(err);
    process.exit(1);
});
`);
}

write(path.join(pkgDir, 'README.md'), `# @tsdi/${name}-${kind}

Generated by \`scripts/scaffold-microservice.mjs\`.

## Run

\`\`\`bash
npm run build
node ../../dist/${name}/main.js
\`\`\`

${kind === 'gateway' ? `Routes are discovered under \`/api\`; configure \`backend-service\` discovery or replace \`targetUrl\` in \`src/${name}.module.ts\`.` : kind === 'transport' ? `Transport adapter skeleton. Next steps:\n\n- implement \`${className}Server.onStart/onShutdown\` (wire listener + request context)\n- implement the client backend in \`src/client.factory.ts\`\n- add protocol message adapter/formatter providers\n- run \`npm run build\` (AOT) and \`npm test\`` : `The service listens on \`http://0.0.0.0:${args.port}/${name}\`.`}
`);

console.log(`Created ${path.relative(root, pkgDir)} (${kind})`);
console.log(`Next: cd ${path.relative(root, pkgDir)} && npm run build`);
