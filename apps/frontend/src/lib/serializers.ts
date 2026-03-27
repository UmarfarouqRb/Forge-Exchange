export function serialize(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (_, v) => (typeof v === 'bigint' ? v.toString() : v)
    )
  );
}
