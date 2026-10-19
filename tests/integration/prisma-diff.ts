export function formatPrismaDiffFailure(
  status: number | null,
  stdout: string,
  stderr: string
): string {
  const summary =
    status === null
      ? 'Prisma schema-diff command error (did not start).'
      : status === 1
      ? 'Prisma schema-diff command error (exit 1).'
      : status === 2
        ? 'Prisma schema drift found (exit 2).'
        : `Prisma schema-diff exited with unexpected status ${String(status)}.`;
  const output = redactConnectionStrings([stdout, stderr].filter(Boolean).join('\n'));

  return output ? `${summary}\n${output}` : `${summary}\nNo stdout or stderr was produced.`;
}

function redactConnectionStrings(output: string): string {
  return output
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, 'postgresql://[REDACTED]')
    .replace(/(password\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}
