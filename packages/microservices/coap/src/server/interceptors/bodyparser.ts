import { Injectable } from '@tsdi/ioc';
import { Incoming, RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable, from, mergeMap } from 'rxjs';

@Injectable()
export class CoapBodyParserInterceptor implements RequestInterceptor<any> {
    intercept(input: any, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        return from(this.normalize(input)).pipe(
            mergeMap(request => next.handle(request, context))
        );
    }

    private async normalize(input: Incoming & Record<string, any>) {
        if (Buffer.isBuffer(input.body)) {
            input.body = this.parseText(input.body.toString('utf8'));
        } else if (typeof input.body === 'string') {
            input.body = this.parseText(input.body);
        }

        if (input.payload === undefined) {
            input.payload = input.body;
        }
        return input;
    }

    private parseText(value: string): any {
        const text = value.trim();
        if (!text) {
            return value;
        }
        if (/^[\[{]/.test(text)) {
            try {
                return JSON.parse(text);
            } catch {
            }
        }
        return value;
    }
}
