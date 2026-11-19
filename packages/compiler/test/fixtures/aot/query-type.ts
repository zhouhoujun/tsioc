import { Component, ElementRef, ViewChild } from '@tsdi/components';

@Component({ selector: 'aot-query-type', template: '<div><span></span></div>' })
export class AotQueryType {
    @ViewChild()
    root?: ElementRef;
}
