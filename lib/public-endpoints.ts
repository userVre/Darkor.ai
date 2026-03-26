function tryParseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isLoopbackUrl(value?: string | null) {
  const parsed = tryParseUrl(value);
  if (!parsed) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "10.0.2.2";
}

export function resolvePublicEndpoint(
  value: string | undefined,
  label: string,
  options: { required?: boolean } = {},
) {
  const trimmed = value?.trim();
  if (!trimmed) {
    if (options.required) {
      throw new Error(`Missing ${label}`);
    }
    return undefined;
  }

  const parsed = tryParseUrl(trimmed);
  if (!parsed) {
    throw new Error(`Invalid ${label}`);
  }

  if (isLoopbackUrl(parsed.toString())) {
    throw new Error(`${label} must use a cloud or production URL on mobile.`);
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function assertCloudUrl(value: string, label: string) {
  const parsed = tryParseUrl(value);
  if (!parsed) {
    throw new Error(`Invalid ${label}`);
  }

  if (isLoopbackUrl(parsed.toString())) {
    throw new Error(`${label} must resolve to a cloud endpoint.`);
  }

  return parsed.toString();
}
