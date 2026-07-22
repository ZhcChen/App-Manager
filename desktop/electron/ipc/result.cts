export type DesktopCommandError = {
  code: string;
  message: string;
};

export type DesktopCommandResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: DesktopCommandError;
    };

export function commandOk<T>(data: T): DesktopCommandResult<T> {
  return {
    ok: true,
    data
  };
}

export function commandError<T = never>(
  error: DesktopCommandError
): DesktopCommandResult<T> {
  return {
    ok: false,
    error
  };
}
