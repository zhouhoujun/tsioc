// import { MessageExecption, AssetContext, TypedRespond } from '@tsdi/core';
// import { Injectable } from '@tsdi/ioc';

// @Injectable({ static: true })
// export class TranspotTypedRespond extends TypedRespond {
//     respond<T>(ctx: AssetContext, response: 'body' | 'header' | 'response', value: T): void {
//         if (response === 'body') {
//             ctx.body = value
//         } else if (response === 'header') {
//             ctx.setHeader(value as Record<string, any>);
//         } else if (response === 'response') {
//             if (value instanceof MessageExecption) {
//                 ctx.status = ctx.statusFactory.createByCode(value.statusCode, value.message);
//             } else {
//                 ctx.status = ctx.statusFactory.create('InternalServerError', String(value));
//             }
//         }
//     }
// }
