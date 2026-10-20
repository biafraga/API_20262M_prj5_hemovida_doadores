import { ehDataReal } from './data';

describe('ehDataReal', () => {
  it.each(['1995-03-10', '2000-02-29', '1999-12-31', '2024-02-29'])('aceita %s', (data) => {
    expect(ehDataReal(data)).toBe(true);
  });

  it.each([
    ['2000-02-31', '31 de fevereiro'],
    ['2000-02-30', '30 de fevereiro'],
    ['2001-02-29', '29 de fevereiro em ano comum'],
    ['2000-04-31', '31 de abril'],
    ['1990-13-45', 'mês 13'],
    ['1990-00-10', 'mês 0'],
    ['1990-05-00', 'dia 0'],
    ['2000-2-3', 'sem zeros à esquerda'],
    ['10/03/1995', 'formato brasileiro'],
    ['abc', 'texto qualquer'],
    ['', 'vazio'],
  ])('recusa %s (%s)', (data) => {
    expect(ehDataReal(data)).toBe(false);
  });
});