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

function friendlyMessage(status: number, raw: string) {
  const known: Record<string, string> = {
    'invalid email or password': 'E-mail ou senha inválidos.',
    'invalid credentials': 'Credenciais inválidas.',
    'internal server error': 'A API encontrou um erro inesperado.',
    'resource not found': 'Registro não encontrado.',
    'resource already exists': 'Já existe um registro com esses dados.',
    'reservation deadline has passed': 'O prazo para esta reserva já foi encerrado.',
    'too many login attempts': 'Muitas tentativas de acesso. Aguarde um minuto e tente novamente.',
    // Vem com 403 na troca de senha. Sem esta entrada cairia na mensagem genérica
    // de permissão logo abaixo, que não diz o que a pessoa precisa corrigir.
    'senha atual incorreta': 'A senha atual está incorreta.',
    'nome must contain only letters and spaces': 'O nome deve conter apenas letras e espaços.',
    'cpf is not a valid cpf number': 'CPF inválido. Confira os dígitos digitados.',
    'telefone must be a valid cellphone number: ddd + 9 digits starting with 9': 'O telefone deve ser um celular válido: DDD + 9 dígitos.',
    'placa must have 7 characters: lllnnnn (old) or lllnlnn (mercosul)': 'A placa deve seguir um dos padrões: ABC-1234 ou ABC1D23.',
  };
  const normalized = raw.trim().toLowerCase();
  if (known[normalized]) return known[normalized];
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para executar esta ação.';
  if (status === 409) return raw.trim() || 'Este registro entra em conflito com outro existente.';
  return raw.trim() || `Falha na requisição (${status}).`;
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
    throw new ApiError(response.status, friendlyMessage(response.status, raw));
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
