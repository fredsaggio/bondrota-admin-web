import type { Sentido, TurnoOperacional } from '@/shared/domain/transport';
import type { PublicId } from '@/shared/domain/public-id';

export type StatusReserva = 'confirmada' | 'cancelada';
export interface Reserva {
  id: PublicId; cliente_id: PublicId; vinculo_id: PublicId; data_viagem: string; turno: TurnoOperacional;
  destino_id: number; rota_interna_id: number; sentido: Sentido; status: StatusReserva;
  created_at: string; updated_at: string;
}

/** Item da listagem administrativa: a API já resolve os nomes via JOIN. */
export interface ReservaComNomes extends Reserva {
  cliente_nome: string;
  destino_nome: string;
}

/** Contagens agregadas de `GET /reservas/resumo`, para o painel não somar linhas. */
export interface ReservaResumo {
  confirmadas_total: number;
  confirmadas_por_turno: Partial<Record<TurnoOperacional, number>>;
}

export type StatusViagem = 'programada' | 'em_andamento' | 'concluida' | 'cancelada';
export interface Viagem {
  id: PublicId; ciclo_viagem_id: number; sentido: Sentido; status: StatusViagem; created_at: string; updated_at: string;
}
export interface CicloViagem {
  id: number; data_viagem: string; turno: TurnoOperacional; municipio_destino_id: number;
  rota_interna_id: number; veiculo_id: number; motorista_id: PublicId;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  expires_at: string; created_at: string; updated_at: string;
}
export interface ViagemComCiclo { viagem: Viagem; ciclo: CicloViagem }

/** Item da listagem administrativa: a API já resolve município e placa via JOIN. */
export interface ViagemComNomes extends ViagemComCiclo {
  municipio_nome: string;
  veiculo_placa: string;
}

/** Agregados de `GET /viagens/resumo`, para o painel não contar linhas em memória. */
export interface ViagemResumo {
  por_status: Partial<Record<StatusViagem, number>>;
  por_turno: Partial<Record<TurnoOperacional, number>>;
  hoje_total: number;
  hoje_em_andamento: number;
  proximas: ViagemComNomes[];
}
export interface ViagemHorario {
  id: number; viagem_id: PublicId; tipo: 'partida_prevista' | 'inicio_real' | 'fim_real';
  horario: string; created_at: string; updated_at: string;
}

export type StatusPresenca = 'aguardando' | 'embarcou' | 'faltou' | 'cancelado';
export interface ViagemReserva {
  id: number; viagem_id: PublicId; reserva_id: PublicId; status_presenca: StatusPresenca; cliente_id: PublicId;
  vinculo_id: PublicId; data_viagem: string; turno: TurnoOperacional; destino_id: number;
  rota_interna_id: number; sentido: Sentido; created_at: string; updated_at: string;
}
export interface ViagemLocalizacao {
  viagem_id: PublicId; motorista_id: PublicId; latitude: number; longitude: number; velocidade_kmh: number;
  direcao_graus: number; precisao_metros: number; registrada_em: string; created_at: string; updated_at: string;
}
export interface FalhaPlanejamento {
  id: number; data_viagem: string; turno: TurnoOperacional; municipio_destino_id: number;
  rota_interna_id: number; sentido: Sentido; partida_em: string; fechamento_em: string; status: 'falhou';
  tentativas: number; ultimo_erro: string | null; proxima_tentativa_em: string | null; finalizado_em: string | null;
}
export interface PontoRota { nome: string; latitude: number; longitude: number }
export interface RotaDinamica {
  rota: {
    id: number; viagem_id: PublicId; provider: string; origem: PontoRota; destino_final: PontoRota;
    distancia_metros: number; duracao_segundos: number; geometry: { type: 'LineString'; coordinates: number[][] };
    expires_at: string; created_at: string; updated_at: string;
  };
  destinos: Array<{ id: number; rota_dinamica_id: number; destino_id: number; ordem: number; created_at: string }>;
}
