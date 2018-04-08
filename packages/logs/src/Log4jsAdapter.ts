// import { Injectable, Singleton } from '@tsioc/core';
// import { ILoggerManger } from './ILoggerManger';
// import { ILogger } from './ILogger';
// import { NonePointcut } from '@tsioc/aop';

// @NonePointcut
// @Singleton
// @Injectable('log4js')
// export class Log4jsAdapter implements ILoggerManger {
//     private _log4js: any;
//     constructor() {
//     }
//     getLog4js() {
//         if (!this._log4js) {
//             this._log4js = require('log4js');
//         }
//         return this._log4js;
//     }
//     configure(config: any) {
//         this.getLog4js().configure(config);
//     }
//     getLogger(name?: string): ILogger {
//         return this.getLog4js().getLogger(name);
//     }

// }
