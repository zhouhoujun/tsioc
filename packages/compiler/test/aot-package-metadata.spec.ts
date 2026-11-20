import expect = require('expect');
import * as ts from 'typescript';
import { getClassRef } from '@tsdi/ioc';
import { transpileAot } from '../src/activities/AotTransform';

function compile(source: string): string {
    return transpileAot('aot-package-metadata.ts', source, { module: ts.ModuleKind.CommonJS });
}

function load(source: string): Record<string, any> {
    const output = compile(source);
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/core'
        ? nodeRequire('../../core/src')
        : id === '@tsdi/ioc'
            ? nodeRequire('../../ioc/src')
            : id === '@tsdi/logger'
                ? nodeRequire('../../logger/src')
                : id === '@tsdi/aop'
                    ? nodeRequire('../../aop/src')
                    : id === '@tsdi/repository'
                        ? nodeRequire('../../repository/src')
                        : nodeRequire(id);
    const execute = new Function('exports', 'require', 'module', output);
    execute(module.exports, localRequire, module);
    return module.exports;
}

describe('AOT package metadata', () => {
    it('keeps security configuration and aspect metadata precompiled', () => {
        const output = compile(`
import { Configuration, Injectable } from '@tsdi/ioc';
import { Bean } from '@tsdi/core';
import { Aspect, Before } from '@tsdi/aop';

@Injectable()
@Configuration()
export class SecurityBasicConfig {
    @Bean('security.basic')
    basic() { return {}; }
}

@Aspect()
export class AuthorizationAspect {
    @Before('@annotation(Authorization)')
    authProcess() {}
}
`);
        expect(output).toContain('__aotType(SecurityBasicConfig');
        expect(output).toContain('__aotAspect(AuthorizationAspect');
        expect(output).not.toContain('__decorate');
    });

    it('keeps repository aspect metadata and module pipelines precompiled', () => {
        const output = compile(`
import { Module } from '@tsdi/ioc';
import { Aspect, Before, AfterReturning, AfterThrowing } from '@tsdi/aop';

@Aspect({ static: true })
export class TransactionalAspect {
    @Before('@annotation(Transactional)')
    begin() {}
    @AfterReturning('@annotation(Transactional)', 'returning')
    commit() {}
    @AfterThrowing('@annotation(Transactional)', 'error')
    rollback() {}
}

@Module({})
export class RepositoryTransactionModule {}
`);
        expect(output).toContain('__aotAspect(TransactionalAspect');
        expect(output).toContain('__aotType(RepositoryTransactionModule');
        expect(output).not.toContain('__decorate');
    });

    it('replays lifecycle method records into ClassRef', () => {
        const exported = load(`
import { Static } from '@tsdi/ioc';
import { Startup, Dispose } from '@tsdi/core';

@Static()
export class LifecycleAdapter {
    @Startup()
    start() {}

    @Dispose()
    stop() {}
}
`);
        const ref = getClassRef(exported.LifecycleAdapter as any);
        expect(ref.hasMetadata('@Startup', 'method')).toBe(true);
        expect(ref.hasMetadata('@Dispose', 'method')).toBe(true);
        expect(ref.methodDecors.some(decor => decor.decorator === '@Startup')).toBe(true);
    });

    it('replays event and exception handler method records', () => {
        const output = compile(`
import { Injectable } from '@tsdi/ioc';
import { EventHandler, ExceptionHandler } from '@tsdi/core';

@Injectable()
export class HandlerService {
    @EventHandler(Error)
    onError() {}

    @ExceptionHandler(TypeError)
    onTypeError() {}
}
`);
        expect(output).toContain('__aotType(HandlerService');
        expect(output).not.toContain('__aotDeco(HandlerService');
        const exported = load(`
import { Injectable } from '@tsdi/ioc';
import { EventHandler, ExceptionHandler } from '@tsdi/core';

@Injectable()
export class HandlerService {
    @EventHandler(Error)
    onError() {}

    @ExceptionHandler(TypeError)
    onTypeError() {}
}
`);
        const ref = getClassRef(exported.HandlerService as any);
        expect(ref.methodDecors.length).toBe(2);
        expect(ref.getDefines(ref.methodDecors[0]).length).toBe(1);
        expect(ref.getDefines(ref.methodDecors[1]).length).toBe(1);
    });

    it('precompiles InjectLog resolver metadata', () => {
        const source = `
import { Injectable } from '@tsdi/ioc';
import { InjectLog } from '@tsdi/logger';

@Injectable()
export class LoggerService {
    @InjectLog() logger: any;

    write(@InjectLog('audit') audit: any) {}
}
`;
        const output = compile(source);
        expect(output).toContain('__aotType(LoggerService');
        expect(output).toContain('__aotLoggerResolvers');
        const exported = load(source);
        const ref = getClassRef(exported.LoggerService as any);
        expect((ref.getAnnotation().propMetadatas.get('logger')?.[0] as any)?.resolver?.length).toBeGreaterThan(0);
        expect((ref.getParameters('write')?.[0] as any)?.logname).toBe('audit');
    });

    it('precompiles Repository resolver metadata', () => {
        const source = `
import { Injectable } from '@tsdi/ioc';
import { Repository } from '@tsdi/repository';

export class UserModel {}

@Injectable()
export class RepositoryService {
    @Repository(UserModel)
    users: any;

    load(@Repository(UserModel) repository: any) {}
}
`;
        const output = compile(source);
        expect(output).toContain('__aotType(RepositoryService');
        expect(output).toContain('__aotRepositoryResolver');
        const exported = load(source);
        const ref = getClassRef(exported.RepositoryService as any);
        expect((ref.getAnnotation().propMetadatas.get('users')?.[0] as any)?.model).toBe(exported.UserModel);
        const params = ref.getParameters('load') as any[];
        expect(params[0].resolver?.[0]).toBeDefined();
    });

    it('precompiles Param token metadata', () => {
        const source = `
import { Injectable, Param } from '@tsdi/ioc';

@Injectable()
export class ParamService {
    receive(@Param('TOKEN') token: any) {}
}
`;
        const output = compile(source);
        expect(output).toContain('__aotType(ParamService');
        const exported = load(source);
        const ref = getClassRef(exported.ParamService as any);
        const params = ref.getParameters('receive') as any[];
        expect(params[0].provider).toBe('TOKEN');
    });

    it('precompiles transport request parameter metadata', () => {
        const source = `
import { Injectable } from '@tsdi/ioc';
import { RequestBody, RequestParam } from '@tsdi/service';

@Injectable()
export class RequestHandlerService {
    receive(@RequestBody() body: any, @RequestParam('page') page: number) {}
}
`;
        const output = compile(source);
        expect(output).toContain('__aotType(RequestHandlerService');
        expect(output).not.toContain('__aotDeco(RequestHandlerService');
        const exported = load(source);
        const ref = getClassRef(exported.RequestHandlerService as any);
        const params = ref.getParameters('receive') as any[];
        expect(params.length).toBe(2);
        expect(params[0].scope).toBe('body');
        expect(params[0].flags & 128).toBe(128);
        expect(params[1].scope).toBe('query');
        expect(params[1].field).toBe('page');
    });

    it('replays Runner method records as runnables', () => {
        const source = `
import { Injectable } from '@tsdi/ioc';
import { Runner } from '@tsdi/core';

@Injectable()
export class RunnableService {
    @Runner()
    run() {}
}
`;
        const output = compile(source);
        expect(output).toContain('__aotType(RunnableService');
        expect(output).not.toContain('__aotDeco(RunnableService');
        const exported = load(source);
        const ref = getClassRef(exported.RunnableService as any);
        expect(ref.runnables.some(runnable => runnable.propertyKey === 'run' && !runnable.auto)).toBe(true);
    });

    it('keeps supported class metadata when lifecycle decorators are present', () => {
        const output = compile(`
import { Static, Injectable } from '@tsdi/ioc';
import { Startup, Dispose, Pipe, Inject } from '@tsdi/core';
import { InjectLog } from '@tsdi/logger';

@Static()
export class TypeormAdapter {
    @Startup()
    start() {}

    @Dispose()
    stop() {}
}

@Injectable()
export class SwaggerService {
    @InjectLog() logger: any;

    @Startup()
    setup() {}
}

@Pipe('objectId')
export class ParseObjectIdPipe {
    constructor(@Inject('TYPE') protected type: any) {}
}
`);
        expect(output).toContain('__aotType(TypeormAdapter');
        expect(output).toContain('__aotType(SwaggerService');
        expect(output).toContain('__aotType(ParseObjectIdPipe');
        expect(output).not.toContain('__aotDeco(');
        expect(output).not.toContain('__decorate');
    });
});
