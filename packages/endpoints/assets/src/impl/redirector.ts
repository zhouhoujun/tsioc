/* eslint-disable no-case-declarations */
import { EMPTY_OBJ, Injectable, TypeExecption } from '@tsdi/ioc';
import { TransportHeaders, TransportRequest, RequestMethod, StatusCode, HeaderRecord } from '@tsdi/common';
import { BadRequestExecption, StreamAdapter, StatusAdapter, hdr, Redirector } from '@tsdi/common/transport';
import { Client } from '@tsdi/common/client';
import { Observable, Observer, Subscription, throwError } from 'rxjs';


@Injectable()
export class AssetRedirector implements Redirector {

    constructor() {
    }

    redirect<T>(req: TransportRequest, status: StatusCode, headers: HeaderRecord): Observable<T> {
        return new Observable((observer: Observer<T>) => {
            if(!req.url) return observer.error(new BadRequestExecption());

            const validator = req.context.get(StatusAdapter);
            const adapter = req.context.get(StreamAdapter);
            const rdstatus = req.context.getValueify(RedirectState, () => new RedirectState());
            // HTTP fetch step 5.2
            const location = headers[hdr.LOCATION] as string;


            // HTTP fetch step 5.3
            let locationURL = null;
            try {
                locationURL = location === null ? null : (absUrl.test(req.url) ? new URL(location, req.url).toString() : location);
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

                    let reqhdrs = req.headers instanceof TransportHeaders ? req.headers : new TransportHeaders(req.headers);
                    let method = req.method as RequestMethod;
                    let body = req.body;

                    // when forwarding sensitive headers like "Authorization",
                    // "WWW-Authenticate", and "Cookie" to untrusted targets,
                    // headers will be ignored when following a redirect to a domain
                    // that is not a subdomain match or exact match of the initial domain.
                    // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                    // will forward the sensitive headers, but a redirect to "bar.com" will not.
                    if (absUrl.test(req.url) && !isDomainOrSubdomain(req.url, locationURL)) {
                        reqhdrs.delete(hdr.AUTHORIZATION)
                            .delete(hdr.WWW_AUTHENTICATE)
                            .delete(hdr.COOKIE)
                            .delete(hdr.COOKIE2);
                    }

                    // HTTP-redirect fetch step 9
                    if (validator.redirectBodify(status) && req.body && adapter.isReadable(req.body)) {
                        observer.error(new BadRequestExecption('Cannot follow redirect with body being a readable stream'));
                        break;
                    }

                    // HTTP-redirect fetch step 11
                    if (!validator.redirectBodify(status, req.method)) {
                        method = validator.redirectDefaultMethod() as RequestMethod;
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
}

const absUrl = /\w+\/\/:/;

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

export function parseReferrerPolicyFromHeader(headers: HeaderRecord) {
    const policyTokens = (headers[hdr.REFERRER_POLICY] as string || '').split(splitReg);
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
