/**
 * Regras de placa brasileira, nos dois padrões em circulação:
 *
 * - Antigo (cinza): `LLL-NNNN` — 3 letras e 4 dígitos, exibido com hífen.
 * - Mercosul: `LLLNLNN` — 3 letras, dígito, letra, 2 dígitos, sem hífen.
 *
 * Limpa, ambas têm 7 caracteres e só divergem na quinta posição: dígito na
 * antiga, letra na Mercosul. O hífen é enfeite de apresentação — o que vai para
 * o banco é sempre a forma limpa, senão `ABC-1234` e `ABC1234` viram dois
 * veículos para o mesmo carro sem o índice UNIQUE reclamar.
 */

const TAMANHO = 7;

const PLACA_COMPLETA = /^[A-Z]{3}\d[A-Z\d]\d{2}$/;

const ehLetra = (char: string) => char >= 'A' && char <= 'Z';
const ehDigito = (char: string) => char >= '0' && char <= '9';

/** O que cada posição aceita, cobrindo os dois padrões de uma vez. */
function aceita(char: string, posicao: number) {
  if (posicao < 3) return ehLetra(char);
  if (posicao === 3) return ehDigito(char);
  if (posicao === 4) return ehLetra(char) || ehDigito(char);
  return ehDigito(char);
}

/** Forma que vai para a API: maiúscula, sem pontuação, no máximo 7 caracteres. */
export function limparPlaca(raw: string): string {
  let limpa = '';
  for (const char of raw.toUpperCase()) {
    if (limpa.length === TAMANHO) break;
    if (aceita(char, limpa.length)) limpa += char;
  }
  return limpa;
}

/**
 * Máscara progressiva para o campo de digitação.
 *
 * Até a quinta posição ainda não dá para saber o padrão — `ABC1` pode virar as
 * duas coisas. Mas se o admin já digitou o hífen ali (é o lugar natural pra
 * ele, logo depois das 3 letras), deixamos aparecer: bloquear uma tecla que a
 * pessoa apertou de propósito rende mais estranheza do que corrigir sozinho
 * depois. Se a placa virar Mercosul, o hífen some assim que a 5ª posição
 * chega numa letra.
 */
export function formatarPlaca(raw: string): string {
  const limpa = limparPlaca(raw);
  if (limpa.length > 4) {
    return ehDigito(limpa[4]) ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
  }
  const comHifenELetrasDigitos = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const digitouHifen = limpa.length >= 3 && /^[A-Z]{3}-/.test(comHifenELetrasDigitos);
  return digitouHifen ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
}

/**
 * Versão para listagens. Valor fora do padrão sai como está, em vez de ser
 * recortado pela máscara — registros gravados antes desta validação existir
 * precisam aparecer para o admin do jeito que estão no banco.
 */
export function exibirPlaca(value: string): string {
  const limpa = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!PLACA_COMPLETA.test(limpa)) return value;
  return ehDigito(limpa[4]) ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
}
