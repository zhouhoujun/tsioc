// import { Exception, Injector } from '@tsdi/ioc';
// import { HeaderAdapter, RequestContext } from '@tsdi/common';
// import { Observable } from 'rxjs';
// import { StatusAdapter } from './StatusAdapter';
// import { StreamAdapter } from './StreamAdapter';
// import { Incoming } from './Incoming';

// /**
//  * transport.
//  */
// export abstract class Transport<TSocket = any, TIncoming extends Incoming = Incoming, TOutgoing = any> {
//     /**
//      * transport context injector.
//      */
//     abstract get injector(): Injector;

//     /**
//      * transport client side or not.
//      */
//     abstract get client(): boolean;

//     /**
//      * protocol
//      */
//     abstract get protocol(): string;

//     /**
//      * socket.
//      */
//     abstract get socket(): TSocket;
//     /**
//      * stream adapter.
//      */
//     abstract get streamAdapter(): StreamAdapter;
//     /**
//      * header adapter.
//      */
//     abstract get headerAdapter(): HeaderAdapter;
//     /**
//      * status adapter.
//      */
//     abstract get statusAdapter(): StatusAdapter | null;
//     /**
//      * send.
//      * @param data
//      * @param context transport context 
//      */
//     abstract send(data: TOutgoing, context: RequestContext): Observable<any>;

//     /**
//      * send.
//      * @param exception Exception
//      * @param context transport context 
//      */
//     abstract sendException(exception: Exception, context: RequestContext): Observable<any>;

//     /**
//      * receive
//      * @param context transport context 
//      */
//     abstract receive(context?: RequestContext): Observable<TIncoming>;
//     /**
//      * close transport.
//      */
//     abstract close(): Promise<void>;
//     /**
//      * destroy.
//      */
//     abstract destroy(): Promise<void>;

// }

