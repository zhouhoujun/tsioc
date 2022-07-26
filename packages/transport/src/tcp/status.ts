import { mths } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { HttpStatus } from '../http';

@Injectable()
export class TcpStatus extends HttpStatus {

    redirectDefaultMethod(): string {
        return mths.MESSAGE;
    }
}