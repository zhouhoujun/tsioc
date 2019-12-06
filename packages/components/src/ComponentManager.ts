// import { Singleton } from '@tsdi/ioc';
// import { ComponentRef } from './ComponentRef';

// @Singleton()
// export class ComponentManager {
//     private map: WeakMap<any, ComponentRef<any>>;
//     constructor() {
//         this.map = new WeakMap();
//     }

//     set(comp: any, ref: ComponentRef<any>) {
//         this.map.set(comp, ref);
//     }

//     has(comp: any) {
//         return this.map.has(comp);
//     }

//     get(comp: any) {
//         return this.map.get(comp);
//     }

//     delete(comp: any) {
//         this.map.delete(comp);
//     }
// }
