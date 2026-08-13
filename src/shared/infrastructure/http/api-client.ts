'use client';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A API já responde em português, pronto para a tela — traduzir aqui de novo
 * duplicaria a regra em cada cliente (painel, app do motorista, app do
 * cliente) e não protegeria nada: a mensagem já viajou pela rede e aparece
 * no DevTools de qualquer forma. Quem decide o que pode ser dito é o backend.
 *
 * Sobra para cá só o caso em que não existe resposta para exibir.
 */
function mensagemDaResposta(status: number, corpo: string) {
  const texto = corpo.trim();
  if (texto) return texto;
  return `Não foi possível concluir a operação (${status}).`;
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API do BondRota.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event('bondrota:unauthorized'));
    }
    throw new ApiError(response.status, mensagemDaResposta(response.status, raw));
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function uploadToSignedURL(url: string, file: File) {
  const headers = new Headers({ 'Content-Type': file.type || 'application/octet-stream' });
  const response = await fetch(url, { method: 'PUT', headers, body: file });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível enviar o arquivo.');
}
