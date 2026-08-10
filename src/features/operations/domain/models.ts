import type { Sentido, TurnoOperacional } from '@/shared/domain/transport';

export type StatusReserva = 'confirmada' | 'cancelada';
export interface Reserva {
  id: number; cliente_id: number; vinculo_id: number; data_viagem: string; turno: TurnoOperacional;
  destino_id: number; rota_interna_id: number; sentido: Sentido; status: StatusReserva;
  created_at: string; updated_at: string;
}

export type StatusViagem = 'programada' | 'em_andamento' | 'concluida' | 'cancelada';
export interface Viagem {
  id: number; ciclo_viagem_id: number; sentido: Sentido; status: StatusViagem; created_at: string; updated_at: string;
}
export interface CicloViagem {
  id: number; data_viagem: string; turno: TurnoOperacional; municipio_destino_id: number;
  rota_interna_id: number; veiculo_id: number; motorista_id: number;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  expires_at: string; created_at: string; updated_at: string;
}
export interface ViagemComCiclo { viagem: Viagem; ciclo: CicloViagem }
export interface ViagemHorario {
  id: number; viagem_id: number; tipo: 'partida_prevista' | 'inicio_real' | 'fim_real';
  horario: string; created_at: string; updated_at: string;
}

export type StatusPresenca = 'aguardando' | 'embarcou' | 'faltou' | 'cancelado';
export interface ViagemReserva {
  id: number; viagem_id: number; reserva_id: number; status_presenca: StatusPresenca; cliente_id: number;
  vinculo_id: number; data_viagem: string; turno: TurnoOperacional; destino_id: number;
  rota_interna_id: number; sentido: Sentido; created_at: string; updated_at: string;
}
export interface ViagemLocalizacao {
  viagem_id: number; motorista_id: number; latitude: number; longitude: number; velocidade_kmh: number;
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
    id: number; viagem_id: number; provider: string; origem: PontoRota; destino_final: PontoRota;
    distancia_metros: number; duracao_segundos: number; geometry: { type: 'LineString'; coordinates: number[][] };
    expires_at: string; created_at: string; updated_at: string;
  };
  destinos: Array<{ id: number; rota_dinamica_id: number; destino_id: number; ordem: number; created_at: string }>;
}
