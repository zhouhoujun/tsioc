// import { Injectable } from '@tsdi/ioc';
// import { AssetResponder } from '@tsdi/endpoints/assets';
// import { HttpContext } from './context';

// @Injectable()
// export class HttpRespondAdapter extends AssetResponder {

//     protected override statusMessage(ctx: HttpContext, status: number): string {
//         if (ctx.request.httpVersionMajor >= 2) {
//             return String(status)
//         } else {
//             return ctx.statusMessage || String(status)
//         }
//     }
// }