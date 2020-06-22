type Cancellable = () => void;

type Callback<T> = (result: T) => void;

export function createCancellablePromise<T>(nonExceptionPromise: Promise<T>, callback: Callback<T>): Cancellable {
  let isCancelled = false;
  (async () => {
    try {
      const result = await nonExceptionPromise;
      if (!isCancelled) {
        callback(result);
      }
    } catch {
      // Noop
    }
  })();
  return () => {
    isCancelled = true;
  };
}
