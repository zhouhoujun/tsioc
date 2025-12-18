// import { Abstract, Exception, Inject, InjectFlags, Injectable, Nullable, isNumber } from '@tsdi/ioc';
// import { Incoming, Outgoing, ReadableLike, RequestContext, RequestHandler, RequestInterceptor, StatusAdapter, WritableLike } from '@tsdi/common';
// import { Filter, BytesFormatPipe, HrtimeFormatter } from '@tsdi/core';
// import { Level, InjectLog, Logger, matchLevel, ConsoleLog } from '@tsdi/logger';
// import { Observable, map } from 'rxjs';


// /**
//  * status formater.
//  */
// @Abstract()
// export abstract class ResponseStatusFormater {

//     @Inject()
//     protected bytes!: BytesFormatPipe;
//     @Inject()
//     readonly htime!: HrtimeFormatter;

//     abstract get incoming(): string;
//     abstract get outgoing(): string;

//     constructor() {

//     }

//     abstract format(adapter: StatusAdapter, withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[];

//     protected formatSize(size?: number | null, precise = 2) {
//         if (!isNumber(size)) return ''
//         return this.bytes.transform(size, precise)
//     }


//     protected cleanZero(num: string) {
//         return num.replace(clrZReg, '');
//     }
// }

// @Abstract()
// export abstract class LoggerOptions {
//     abstract get level(): Level;
// }

// const defopts = {
//     level: 'debug'
// } as LoggerOptions;

// /**
//  * Logger interceptor, filter.
//  */
// @Injectable()
// export class LoggerInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, Filter<Incoming, Outgoing, RequestContext> {

//     private options: LoggerOptions;

//     @InjectLog()
//     private logger!: Logger;

//     constructor(private formatter: ResponseStatusFormater, @Nullable() options: LoggerOptions) {
//         this.options = { ...defopts, ...options } as LoggerOptions;
//     }

//     doFilter(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
//         return this.intercept(req, next, context);
//     }

//     intercept(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
//         const logger = context.getInjector().get(Logger, this.logger, InjectFlags.Self);
//         const statusAdapter = context.get(StatusAdapter);
//         const level = this.options.level;
//         if (!matchLevel(logger.level, level)) {
//             return next.handle(req, context);
//         }
//         //todo console log and other. need to refactor formater.
//         const withColor = logger instanceof ConsoleLog;
//         const start = this.formatter.htime.hrtime();
//         logger[level](...this.formatter.format(statusAdapter, withColor, req.path ?? req.pattern, req.method));
//         return next.handle(req, context)
//             .pipe(
//                 map(res => {
//                     logger[level](...this.formatter.format(statusAdapter, withColor, req.path ?? req.pattern, req.method,
//                         this.formatter.htime.hrtime(start), res.statusCode, res.statusMessage, context.getContentLength(), res.error));
//                     return res
//                 })
//             )
//     }


// }



// const clrZReg = /\.?0+$/;

