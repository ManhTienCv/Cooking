export interface HttpError extends Error {
  status: number;
  captchaRequired?: boolean;
  details?: unknown;
}

type HttpErrorOptions = {
  captchaRequired?: boolean;
  details?: unknown;
};

export function httpError(status: number, message: string, options: HttpErrorOptions = {}): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  if (options.captchaRequired !== undefined) err.captchaRequired = options.captchaRequired;
  if (options.details !== undefined) err.details = options.details;
  return err;
}
