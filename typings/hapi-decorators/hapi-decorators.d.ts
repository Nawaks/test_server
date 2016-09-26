// Support for AMD require
declare module 'hapi-decorators' {
  export {controller, get};
}

declare function get(route: string): (proto: any, localName: string) => void;
declare function controller(route: string): (t: any) => void;
