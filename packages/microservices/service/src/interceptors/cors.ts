export abstract class CorsInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
