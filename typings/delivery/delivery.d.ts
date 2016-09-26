declare var delivery: DeliveryStatic;

declare module 'delivery' {
  export = delivery;
}

interface DeliveryStatic {
  listen(socket): Delivery;
}

interface Delivery {
  connect(): void
  on(evt, callback): void;
}
