/* eslint-disable no-case-declarations */
import { BadRequestExecption, Client, RequestMethod, Redirector, ReqHeaders, ResHeaders, HeaderSet, TransportRequest, GET, POST } from '@tsdi/core';
import { EMPTY_OBJ, Injectable, TypeExecption } from '@tsdi/ioc';
import { Observable, Observer, Subscription } from 'rxjs';
import { Readable } from 'stream';
import { hdr } from '../consts';

@Injectable()
export class AssetRedirector extends Redirector {

    redirect<T>(req: TransportRequest, status: string|number, headers: ResHeaders): Observable<T> {
        return new Observable((observer: Observer<T>) => {
            const rdstatus = req.context.getValueify(RedirectState, () => new RedirectState());
            // HTTP fetch step 5.2
            const location = headers.get(hdr.LOCATION) as string;


            // HTTP fetch step 5.3
            let locationURL = null;
            try {
                locationURL = location === null ? null : new URL(location, req.url).toString();
            } catch {
                // error here can only be invalid URL in Location: header
                // do not throw when options.redirect == manual
                // let the user extract the errorneous redirect URL
                if (rdstatus.redirect !== 'manual') {
                    observer.error(new BadRequestExecption(`uri requested responds with an invalid redirect URL: ${location}`));
                }
            }

            let sub: Subscription;
            // HTTP fetch step 5.5
            switch (rdstatus.redirect) {
                case 'error':
                    observer.error(new BadRequestExecption(`uri requested responds with a redirect, redirect mode is set to error: ${req.url}`));
                    break;
                case 'manual':
                    // Nothing to do
                    break;
                case 'follow':
                    // HTTP-redirect fetch step 2
                    if (locationURL === null) {
                        break;
                    }

                    // HTTP-redirect fetch step 5
                    if (rdstatus.counter >= rdstatus.follow) {
                        observer.error(new BadRequestExecption(`maximum redirect reached at: ${req.url}`));
                        break;
                    }

                    rdstatus.counter += 1;

                    // HTTP-redirect fetch step 6 (counter increment)
                    // Create a new Request object.

                    let reqhdrs = req.headers instanceof HeaderSet ? req.headers : new ReqHeaders(req.headers);
                    let method = req.method as RequestMethod;
                    let body = req.body;

                    // when forwarding sensitive headers like "Authorization",
                    // "WWW-Authenticate", and "Cookie" to untrusted targets,
                    // headers will be ignored when following a redirect to a domain
                    // that is not a subdomain match or exact match of the initial domain.
                    // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                    // will forward the sensitive headers, but a redirect to "bar.com" will not.
                    if (!isDomainOrSubdomain(req.url, locationURL)) {
                        reqhdrs.delete(hdr.AUTHORIZATION)
                            .delete(hdr.WWW_AUTHENTICATE)
                            .delete(hdr.COOKIE)
                            .delete(hdr.COOKIE2);
                    }

                    // HTTP-redirect fetch step 9
                    if (this.redirectBodify(status) && req.body && req.body instanceof Readable) {
                        observer.error(new BadRequestExecption('Cannot follow redirect with body being a readable stream'));
                        break;
                    }

                    // HTTP-redirect fetch step 11
                    if (!this.redirectBodify(status, req.method)) {
                        method = this.redirectDefaultMethod() as RequestMethod;
                        body = undefined;
                        reqhdrs = reqhdrs.delete(hdr.CONTENT_LENGTH);
                    }

                    // HTTP-redirect fetch step 14
                    const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                    if (responseReferrerPolicy) {
                        reqhdrs = reqhdrs.set(hdr.REFERRER_POLICY, responseReferrerPolicy);
                    }
                    // HTTP-redirect fetch step 15
                    sub = req.context.get(Client).send(locationURL, {
                        method,
                        headers: reqhdrs,
                        body,
                        context: req.context,
                        observe: 'response'
                    }).subscribe(observer as any);

                    break;

                default:
                    observer.error(new TypeExecption(`Redirect option '${rdstatus.redirect}' is not a valid value of RequestRedirect`));
                    break;
            }

            return () => {
                sub && sub.unsubscribe();
            }
        });
    }

    protected redirectBodify(status: string | number, method?: string | undefined): boolean {
        if(!method) return status === 303;
        return status === 303 || ((status === 301 || status === 302) && method === POST)
    }

    protected redirectDefaultMethod(): string {
        return GET;
    }


}

const isDomainOrSubdomain = (destination: string | URL, original: string | URL) => {
    const orig = new URL(original).hostname;
    const dest = new URL(destination).hostname;

    return orig === dest || orig.endsWith(`.${dest}`);
}


export const referPolicys = new Set([
    '',
    'no-referrer',
    'no-referrer-when-downgrade',
    'same-origin',
    'origin',
    'strict-origin',
    'origin-when-cross-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
]);

const splitReg = /[,\s]+/;

export function parseReferrerPolicyFromHeader(headers: ResHeaders) {
    const policyTokens = (headers.get(hdr.REFERRER_POLICY) as string || '').split(splitReg);
    let policy = '';
    for (const token of policyTokens) {
        if (token && referPolicys.has(token)) {
            policy = token;
        }
    }
    return policy;
}



export class RedirectState {
    public follow: number;
    public counter: number;
    public redirect: 'manual' | 'error' | 'follow' | '';
    constructor(init: {
        follow?: number;
        counter?: number;
        redirect?: 'manual' | 'error' | 'follow' | '';
    } = EMPTY_OBJ) {
        this.follow = init.follow ?? 20;
        this.counter = init.counter ?? 0;
        this.redirect = init.redirect ?? 'follow';
    }
}
