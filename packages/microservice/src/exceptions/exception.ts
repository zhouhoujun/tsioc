import { Exception, Injectable } from '@tsdi/ioc';
import { Observable, throwError } from 'rxjs';

export class MicroserviceException extends Exception {
    constructor(private readonly error: string | object) {
        super(typeof error === 'string' ? error : '');
        if (typeof this.error === 'object' && 'message' in this.error) {
            this.message = String((this.error as any).message);
        }
    }

    getError(): string | object {
        return this.error;
    }
}

export class MicroserviceTimeoutException extends MicroserviceException {
    constructor(timeout: number) {
        super(`Timeout after ${timeout}ms`);
    }
}

export class MicroserviceNotFoundException extends MicroserviceException {
    constructor(pattern: string) {
        super(`No handler found for pattern: ${pattern}`);
    }
}

@Injectable({ static: true })
export class DefaultMicroserviceExceptionFilter {
    
    handleException(err: any): Observable<any> {
        if (err instanceof MicroserviceException) {
            return throwError(() => err);
        }
        return throwError(() => new MicroserviceException(err));
    }
}
