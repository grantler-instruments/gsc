export interface WaitUntilOptions {
  timeout?: number;
  interval?: number;
  timeoutMsg?: string;
}

/** Minimal browser-agnostic API for shared e2e scenarios. */
export interface AppDriver {
  /** Open or focus the app and wait until transport is ready. */
  gotoApp(options?: { resetStorage?: boolean }): Promise<void>;
  clickByRole(role: string, name: string | RegExp): Promise<void>;
  pressKey(key: string): Promise<void>;
  dispatchAudioDropOnCueList(filePath: string, fileName: string, mimeType: string): Promise<void>;
  expectCueInSequenceList(fileName: string): Promise<void>;
  waitForRole(role: string, name: string | RegExp, options?: { timeout?: number }): Promise<void>;
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
  waitUntil(predicate: () => Promise<boolean>, options?: WaitUntilOptions): Promise<void>;
}
