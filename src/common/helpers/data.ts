export function paraDataUtc(valor?: string): Date | undefined {
  if (!valor) return undefined;
  return new Date(`${valor}T00:00:00.000Z`);
}

// Confere se o texto AAAA-MM-DD é um dia que existe no calendário.
// Só `new Date(...)` não basta: o JavaScript aceita 2000-02-31 e o converte
// em silêncio para 2000-03-02. Por isso montamos a data e comparamos de volta.
export function ehDataReal(valor: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
 
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
 
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}
 