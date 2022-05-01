import { Middleware, TransportContext } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, Injectable, isUndefined, Nullable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logs';

@Abstract()
export class PlayloadOptions {
    jsonLimit?: string;
    formLimit?: string;
    encoding?: string;
    enableTypes?: string[];
}

const defaults = {
    jsonLimit: '1mb',
    formLimit: '100kb',
    encoding: 'utf-8',
    enableTypes: ['json', 'form'],
} as PlayloadOptions;

// default json types
const jsonTypes = [
    'application/json',
    'application/json-patch+json',
    'application/vnd.api+json',
    'application/csp-report',
];

// default form types
const formTypes = [
    'application/x-www-form-urlencoded',
];

// default text types
const textTypes = [
    'text/plain',
];

// default xml types
const xmlTypes = [
    'text/xml',
    'application/xml',
];

@Injectable()
export class BodyparserMiddleware implements Middleware {

    private options: PlayloadOptions;
    private enableForm: boolean;
    private enableJson: boolean;
    private enableText: boolean;
    private enableXml: boolean;

    constructor(@Nullable() options: PlayloadOptions) {
        this.options = { ...defaults, ...options };
        this.enableForm = this.chkType('form');
        this.enableJson = this.chkType('json');
        this.enableText = this.chkType('text');
        this.enableXml = this.chkType('xml');
    }


    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (!isUndefined(ctx.request.body)) return await next();
        try {
            const res = await this.parseBody(ctx);
            ctx.request.body = res.body ?? {};
            if (isUndefined(ctx.request.rawBody)) ctx.request.rawBody = res.raw;
        } catch (err) {
            ctx.get(Logger)?.error(err);
            throw err;
        }
        await next();
    }

    parseBody(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        if (this.enableJson && ctx.isType(jsonTypes)) {
            return this.parseJson(ctx);
        }
        if (this.enableForm && ctx.isType(formTypes)) {
            return this.parseForm(ctx);
        }
        if (this.enableText && ctx.isType(textTypes)) {
            return this.parseText(ctx);
        }
        if (this.enableXml && ctx.isType(xmlTypes)) {
            return this.parseText(ctx);
        }

        return Promise.resolve(EMPTY_OBJ);
    }

    protected async parseJson(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        throw new Error('Method not implemented.');
    }

    protected async parseForm(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        throw new Error('Method not implemented.');
    }

    protected async parseText(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        throw new Error('Method not implemented.');
    }

    private chkType(type: string) {
        return this.options.enableTypes?.includes(type) === true;
    }
}