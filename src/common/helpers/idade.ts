// Calcula a idade completa (em anos) de alguém nascido em `nascimento`.
// Usa UTC por causa do helper paraDataUtc: a data de nascimento é gravada em UTC.
export function calcularIdade(nascimento: Date, hoje: Date = new Date()): number {
  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();

  const jaFezAniversarioEsteAno =
    hoje.getUTCMonth() > nascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === nascimento.getUTCMonth() &&
      hoje.getUTCDate() >= nascimento.getUTCDate());

  if (!jaFezAniversarioEsteAno) idade--;
  return idade;
}