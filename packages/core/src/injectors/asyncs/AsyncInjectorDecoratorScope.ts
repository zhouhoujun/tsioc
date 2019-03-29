// import { CompositeHandle } from '../../handles';
// import { InjectorActionContext } from '../InjectorActionContext';

// export class AsyncInjectorDecoratorScope extends CompositeHandle<InjectorActionContext> {
//     execute(ctx: T, next?: () => void): void {
//         if (!this.isCompleted(ctx)) {
//             this.getDecorators(ctx)
//                 .forEach(dec => {
//                     ctx.currDecoractor = dec;
//                     ctx.currDecorType = this.getDecorType();
//                     super.execute(ctx);
//                     this.done(ctx);
//                 });
//         }
//         next && next();
//     }

//     protected done(ctx: T): boolean {
//         return this.getState(ctx, this.getDecorType())[ctx.currDecoractor] = true;
//     }
//     protected isCompleted(ctx: T): boolean {
//         return Object.values(this.getState(ctx, this.getDecorType())).some(inj => inj);
//     }
//     protected getDecorators(ctx: T): string[] {
//         let reg = this.getRegisterer();
//         let states = this.getState(ctx, this.getDecorType());
//         return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
//             .filter(dec => states[dec] === false);
//     }

//     protected abstract getState(ctx: T, dtype: DecoratorType): ObjectMap<boolean>;
//     protected abstract getRegisterer(): DecoratorRegisterer;
//     protected abstract getDecorType(): DecoratorType;
// }
