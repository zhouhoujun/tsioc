import { Injectable } from '@tsdi/ioc';
import { XhrFactory } from '@tsdi/core';
import * as xhr2 from 'xhr2';


@Injectable()
export class ServerXhr implements XhrFactory {
  build(): XMLHttpRequest {
    return new xhr2.XMLHttpRequest();
  }
}

