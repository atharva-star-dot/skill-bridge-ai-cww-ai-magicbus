import { ZodError } from 'zod';

type LogContext = {
  userId?: string;
  route?: string;
  elapsedMs?: number;
  extra?: Record<string, string | number | boolean>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function shortString(value: string): string {
  return value.slice(0, 200);
}

function getErrorName(error: unknown): string {
  const name = asRecord(error)?.name;
  return typeof name === 'string' ? shortString(name) : 'UnknownError';
}

function safeZodPath(path: PropertyKey[]): string {
  return path
    .map((part) => String(part))
    .filter((part) => /^[a-zA-Z0-9_$-]{1,80}$/.test(part))
    .join('.');
}

function getErrorDetails(error: unknown): Record<string, string> {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return {
      code: issue ? `ZOD_${shortString(issue.code)}` : 'ZOD_VALIDATION',
      ...(issue && issue.path.length > 0
        ? { validationPath: safeZodPath(issue.path) }
        : {}),
    };
  }

  const record = asRecord(error);
  const code = record?.code;
  if (typeof code === 'string' && /^P\d{4}$/.test(code)) {
    const meta = asRecord(record?.meta);
    const modelName = meta?.modelName;
    const target = meta?.target;
    const databaseCode = meta?.code;
    return {
      code,
      ...(code === 'P2010' &&
      typeof databaseCode === 'string' &&
      /^[A-Z0-9]{5}$/.test(databaseCode)
        ? { sqlState: databaseCode }
        : {}),
      ...(typeof modelName === 'string' ? { model: shortString(modelName) } : {}),
      ...(typeof target === 'string'
        ? { target: shortString(target) }
        : Array.isArray(target)
          ? { target: target.filter((part): part is string => typeof part === 'string').map(shortString).join(',') }
          : {}),
    };
  }

  const message = record?.message;
  const name = getErrorName(error).toLowerCase();
  if (name === 'aborterror') return { code: 'ABORTED' };
  if (typeof message === 'string' && /deadline|timed?\s*out|timeout/i.test(message)) {
    return { code: 'TIMEOUT' };
  }

  const status = record?.status ?? record?.statusCode;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
    return { code: `HTTP_${status}` };
  }

  return { code: 'UNCLASSIFIED' };
}

export function logServerError(
  scope: string,
  err: unknown,
  ctx: LogContext = {}
): void {
  const details = getErrorDetails(err);
  const entry: Record<string, string | number | boolean> = {
    scope: shortString(scope),
    route: shortString(ctx.route ?? 'unknown'),
    name: getErrorName(err),
    ...details,
  };

  if (ctx.userId) entry.userIdPrefix = ctx.userId.slice(0, 8);
  if (typeof ctx.elapsedMs === 'number' && Number.isFinite(ctx.elapsedMs)) {
    entry.elapsedMs = Math.max(0, Math.round(ctx.elapsedMs));
  }
  if (ctx.extra) {
    for (const [key, value] of Object.entries(ctx.extra)) {
      if (/body|resume|answer|token|secret|password|credential|env/i.test(key)) continue;
      entry[shortString(key)] = typeof value === 'string' ? shortString(value) : value;
    }
  }

  console.error(JSON.stringify(entry));
}
