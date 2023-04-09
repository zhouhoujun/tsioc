import { Injectable } from '@tsdi/ioc'
import { StatusVaildator } from '@tsdi/transport'

@Injectable()
export class HttpStatusVaildator implements StatusVaildator<number> {
    isOk(status: number): boolean {
        return status == 200;
    }
    isEmpty(status: number): boolean {
        return emptyStatus[status];
    }
    isRedirect(status: number): boolean {
        return redirectStatus[status];
    }
    isRequestFailed(status: number): boolean {
        return status >= 400 && status < 500;
    }
    isServerError(status: number): boolean {
        return status >= 500;
    }
    isRetry(status: number): boolean {
        return retryStatus[status];
    }

}


/**
 * status codes for redirects
 */
const redirectStatus: Record<number | string, boolean> = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number | string, boolean> = {
    204: true,
    205: true,
    304: true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number | string, boolean> = {
    502: true,
    503: true,
    504: true
}
