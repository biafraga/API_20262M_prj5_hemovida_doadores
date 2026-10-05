export function paraDataUtc(valor?: string): Date | undefined {
  if (!valor) return undefined;
  return new Date(`${valor}T00:00:00.000Z`);
}