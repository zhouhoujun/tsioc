import { Router } from '../middlewares/router';
import { Client } from './client';


export class MessageClient implements Client {

    constructor(private router: Router) {

    }

    connect(): void {
        
    }

    send<TResult = any, TInput = any>(pattern: any, data: TInput): TResult {
        throw new Error('Method not implemented.');
        // this.router.execute({
        //     pattern,
        //     data
        // });
    }
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): TResult {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}