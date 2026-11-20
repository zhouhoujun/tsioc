import expect = require('expect');
import * as ts from 'typescript';
import { transpileAot } from '../src/activities/AotTransform';

function compile(source: string): string {
    return transpileAot('aot-package-metadata.ts', source, { module: ts.ModuleKind.CommonJS });
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
        expect(output).toContain('__aotDeco(');
        expect(output).not.toContain('__decorate');
    });
});
