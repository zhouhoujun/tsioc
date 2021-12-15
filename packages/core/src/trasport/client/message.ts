import { Observable } from 'rxjs';
import { Router } from '../../middlewares/router';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';


export class MessageClient implements Client, OnDispose {

    constructor(private router: Router) {

    }

    async connect(): Promise<void> {

    }

    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        throw new Error('Method not implemented.');
        // this.router.execute({
        //     pattern,
        //     data
        // });
    }
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        throw new Error('Method not implemented.');
    }

    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}