import type { Turno, TurnoOperacional } from '@/shared/domain/transport';
import type { PublicId } from '@/shared/domain/public-id';

export interface Municipio { codigo_ibge: number; nome: string; uf: string }
export interface Destino { id: number; nome: string; rua: string; municipio_id: number; latitude: number; longitude: number }
export interface Parada { id: number; nome: string; latitude: number; longitude: number }
export interface ParadaNaRota extends Parada { ordem: number }
export interface RotaInterna { id: number; paradas: ParadaNaRota[] }

export type CategoriaVeiculo = 'executivo' | 'escolar' | 'carro_7_lugares';
export type StatusVeiculo = 'ativo' | 'inativo' | 'manutencao';
export interface Veiculo {
  id: number; placa: string; modelo: string; categoria: CategoriaVeiculo; capacidade: number;
  status: StatusVeiculo; ar_condicionado: boolean; banheiro: boolean; persiana: boolean;
  luz_leitura: boolean; tomada: boolean;
}

export interface Motorista {
  id: PublicId; nome: string; cpf: string; telefone: string; data_nasc: string; turno: Turno;
  municipio_trabalho_id: number; foto: string;
}

export interface HorarioTurno {
  id: number; municipio_destino_id: number; turno: TurnoOperacional; horario_ida: string;
  horario_volta: string; created_at: string; updated_at: string;
}

export interface HorarioFixo { id: number; vinculo_id: PublicId; dia_semana: number }
export interface Vinculo {
  id: PublicId; cliente_id: PublicId; tipo: 'estudante' | 'estagio'; turno: Turno; destino_id: number;
  rota_interna_id: number; curso: string; comprovante: string; validade: string; horarios_fixos: HorarioFixo[];
}

/** Item de `GET /vinculos/`, a listagem administrativa que já resolve o nome do cliente. */
export interface VinculoComCliente extends Vinculo { cliente_nome: string; destino_nome: string }

export interface Cliente {
  id: PublicId; nome: string; cpf: string; telefone: string; data_nasc: string;
  documento_identificacao: string; comprovante_residencia: string; vinculos?: Vinculo[];
}
