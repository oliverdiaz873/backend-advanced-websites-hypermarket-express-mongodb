export default async function globalTeardown(): Promise<void> {
  if (globalThis.__MONGOINSTANCE__) {
    await globalThis.__MONGOINSTANCE__.stop();
    globalThis.__MONGOINSTANCE__ = undefined;
  }
}
