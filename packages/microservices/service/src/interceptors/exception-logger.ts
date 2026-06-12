import { Inject, Injectable } from '@tsdi/ioc';
import { Level, Logger } from '@tsdi/logger';
import { RequestContext, RequestExceptionFilter } from '@tsdi/common';
import { Observable, throwError } from 'rxjs';
import { ExecptionLoggerOptions, SERVICE_EXECEPTION_LOGGER_OPTIONS } from '../options';

const defaultOptions: ExecptionLoggerOptions = {
    level: 'error'
};

/**
 * Service-side exception logger.
 *
 * This filter is intentionally narrower than the old common logger: it only
 * records exceptions raised while request/transfer chains execute, leaving
 * terminal/request lifecycle formatting to transport-specific loggers.
 */
@Injectable()
export class ExecptionLogger<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends RequestExceptionFilter<TInput, TOutput, TContext> {

    constructor(
        @Inject(Logger) private logger: Logger,
        @Inject(SERVICE_EXECEPTION_LOGGER_OPTIONS as any, { nullable: true }) private options?: ExecptionLoggerOptions
    ) {
        super();
    }

    catchError(_input: TInput, err: any, _context: TContext): Observable<TOutput> {
        const level = (this.options?.level ?? defaultOptions.level) as Level;
        (this.logger[level] ?? this.logger.error).call(this.logger, err);
        return throwError(() => err);
    }
}
