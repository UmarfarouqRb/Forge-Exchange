export function bigIntToString(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(bigIntToString);
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        bigIntToString(value),
      ])
    );
  }

  return obj;
}

export function serialize(data: any): any {
  return JSON.parse(JSON.stringify(bigIntToString(data)));
}
