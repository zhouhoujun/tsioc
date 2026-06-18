import { Application, ApplicationContext } from '@tsdi/core';
import { HttpClient } from '@tsdi/http';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { Http2TransBootTest, MockBootHttpTest } from './app';

async function asResponse<T = any>(promise: Promise<any>): Promise<any> {
    return promise as Promise<T>;
}

@Suite('typeorm request validation http')
export class RequestValidationHttpTest {

    private ctx!: ApplicationContext;
    private client!: HttpClient;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: MockBootHttpTest,
            baseURL: __dirname
        });
        this.client = this.ctx.resolve(HttpClient);
    }

    @Test()
    async shouldConvertQueryParams() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query', {
            observe: 'response',
            params: { age: '25', enabled: 'true' }
        })));
        expect(response.status).toEqual(200);
        expect(response.body.age).toEqual(25);
        expect(response.body.enabled).toEqual(true);
        expect(response.body.types).toEqual({ age: 'number', enabled: 'boolean' });
    }

    @Test()
    async shouldApplyQueryDefaults() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/defaults', {
            observe: 'response'
        })));
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ page: 1, sort: 'name' });
    }

    @Test()
    async shouldRejectMissingQueryParam() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/int-required', {
            observe: 'response'
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @Test()
    async shouldRejectInvalidQueryParam() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/int-required', {
            observe: 'response',
            params: { val: 'bad' }
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @Test()
    async shouldConvertBooleanQueryParamFalse() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/check', {
            observe: 'response',
            params: { check: 'false' }
        })));
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ check: false, type: 'boolean' });
    }

    @Test()
    async shouldConvertBodyParams() {
        const response = await asResponse(lastValueFrom(this.client.post('/request-checks/body', {
            age: '30',
            enabled: 'false'
        }, {
            observe: 'response'
        })));
        expect(response.status).toEqual(200);
        expect(response.body.age).toEqual(30);
        expect(response.body.enabled).toEqual(false);
        expect(response.body.types).toEqual({ age: 'number', enabled: 'boolean' });
    }

    @Test()
    async shouldRejectMissingBodyParam() {
        const response = await asResponse(lastValueFrom(this.client.post('/request-checks/body', {}, {
            observe: 'response'
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @Test()
    async shouldRejectInvalidBodyParam() {
        const response = await asResponse(lastValueFrom(this.client.post('/request-checks/body', {
            age: 'bad',
            enabled: 'true'
        }, {
            observe: 'response'
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @After()
    async after() {
        await this.ctx.destroy();
    }
}

@Suite('typeorm request validation http2')
export class RequestValidationHttp2Test {

    private ctx!: ApplicationContext;
    private client!: HttpClient;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: Http2TransBootTest,
            baseURL: __dirname
        });
        this.client = this.ctx.resolve(HttpClient);
    }

    @Test()
    async shouldConvertQueryParams() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query', {
            observe: 'response',
            params: { age: '41', enabled: 'true' }
        })));
        expect(response.status).toEqual(200);
        expect(response.body.age).toEqual(41);
        expect(response.body.enabled).toEqual(true);
        expect(response.body.types).toEqual({ age: 'number', enabled: 'boolean' });
    }

    @Test()
    async shouldRejectInvalidQueryParam() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/int-required', {
            observe: 'response',
            params: { val: 'bad' }
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @Test()
    async shouldConvertBooleanQueryParamFalse() {
        const response = await asResponse(lastValueFrom(this.client.get('/request-checks/query/check', {
            observe: 'response',
            params: { check: 'false' }
        })));
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ check: false, type: 'boolean' });
    }

    @Test()
    async shouldConvertBodyParams() {
        const response = await asResponse(lastValueFrom(this.client.post('/request-checks/body', {
            age: '18',
            enabled: 'false'
        }, {
            observe: 'response'
        })));
        expect(response.status).toEqual(200);
        expect(response.body.age).toEqual(18);
        expect(response.body.enabled).toEqual(false);
        expect(response.body.types).toEqual({ age: 'number', enabled: 'boolean' });
    }

    @Test()
    async shouldRejectMissingBodyParam() {
        const response = await asResponse(lastValueFrom(this.client.post('/request-checks/body', {}, {
            observe: 'response'
        }).pipe(catchError(err => of(err)))));
        expect(response.status).toEqual(400);
    }

    @After()
    async after() {
        await this.ctx.destroy();
    }
}
