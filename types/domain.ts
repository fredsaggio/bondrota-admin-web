export type Turno = 'MT' | 'VT' | 'NT' | 'IN';
export type TurnoOperacional = Exclude<Turno, 'IN'>;
export type Sentido = 'ida' | 'volta';

export interface Admin {
  id: number;
  email: string;
}

export interface Municipio {
  codigo_ibge: number;
  nome: string;
  uf: string;
}

export interface Destino {
  id: number;
  nome: string;
  rua: string;
  municipio_id: number;
  latitude: number;
  longitude: number;
}

export interface Parada {
  id: number;
  nome: string;
  latitude: number;
  longitude: number;
}

export interface ParadaNaRota extends Parada {
  ordem: number;
}

export interface RotaInterna {
  id: number;
  paradas: ParadaNaRota[];
}

export type CategoriaVeiculo = 'executivo' | 'escolar' | 'carro_7_lugares';
export type StatusVeiculo = 'ativo' | 'inativo' | 'manutencao';

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  categoria: CategoriaVeiculo;
  capacidade: number;
  status: StatusVeiculo;
  ar_condicionado: boolean;
  banheiro: boolean;
  persiana: boolean;
  luz_leitura: boolean;
  tomada: boolean;
}

export interface Motorista {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nasc: string;
  turno: Turno;
  municipio_trabalho_id: number;
  residencia: string;
  foto: string;
}

export interface HorarioTurno {
  id: number;
  municipio_destino_id: number;
  turno: TurnoOperacional;
  horario_ida: string;
  horario_volta: string;
  created_at: string;
  updated_at: string;
}

export interface HorarioFixo {
  id: number;
  vinculo_id: number;
  dia_semana: number;
}

export interface Vinculo {
  id: number;
  cliente_id: number;
  tipo: 'estudante' | 'estagio';
  turno: Turno;
  destino_id: number;
  rota_interna_id: number;
  curso: string;
  comprovante: string;
  validade: string;
  horarios_fixos: HorarioFixo[];
}

export interface Cliente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nasc: string;
  foto: string;
  vinculos?: Vinculo[];
}

export type StatusReserva = 'confirmada' | 'cancelada';

export interface Reserva {
  id: number;
  cliente_id: number;
  vinculo_id: number;
  data_viagem: string;
  turno: TurnoOperacional;
  destino_id: number;
  rota_interna_id: number;
  sentido: Sentido;
  status: StatusReserva;
  created_at: string;
  updated_at: string;
}

export type StatusViagem = 'programada' | 'em_andamento' | 'concluida' | 'cancelada';

export interface Viagem {
  id: number;
  ciclo_viagem_id: number;
  sentido: Sentido;
  status: StatusViagem;
  created_at: string;
  updated_at: string;
}

export interface CicloViagem {
  id: number;
  data_viagem: string;
  turno: TurnoOperacional;
  municipio_destino_id: number;
  rota_interna_id: number;
  veiculo_id: number;
  motorista_id: number;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ViagemComCiclo {
  viagem: Viagem;
  ciclo: CicloViagem;
}

export interface ViagemHorario {
  id: number;
  viagem_id: number;
  tipo: 'partida_prevista' | 'inicio_real' | 'fim_real';
  horario: string;
  created_at: string;
  updated_at: string;
}

export type StatusPresenca = 'aguardando' | 'embarcou' | 'faltou' | 'cancelado';

export interface ViagemReserva {
  id: number;
  viagem_id: number;
  reserva_id: number;
  status_presenca: StatusPresenca;
  cliente_id: number;
  vinculo_id: number;
  data_viagem: string;
  turno: TurnoOperacional;
  destino_id: number;
  rota_interna_id: number;
  sentido: Sentido;
  created_at: string;
  updated_at: string;
}

export interface ViagemLocalizacao {
  viagem_id: number;
  motorista_id: number;
  latitude: number;
  longitude: number;
  velocidade_kmh: number;
  direcao_graus: number;
  precisao_metros: number;
  registrada_em: string;
  created_at: string;
  updated_at: string;
}

export interface FalhaPlanejamento {
  id: number;
  data_viagem: string;
  turno: TurnoOperacional;
  municipio_destino_id: number;
  rota_interna_id: number;
  sentido: Sentido;
  partida_em: string;
  fechamento_em: string;
  status: 'falhou';
  tentativas: number;
  ultimo_erro: string | null;
  proxima_tentativa_em: string | null;
  finalizado_em: string | null;
}

export interface RotaDinamica {
  rota: {
    id: number;
    viagem_id: number;
    provider: string;
    origem: PontoRota;
    destino_final: PontoRota;
    distancia_metros: number;
    duracao_segundos: number;
    geometry: { type: 'LineString'; coordinates: number[][] };
    expires_at: string;
    created_at: string;
    updated_at: string;
  };
  destinos: Array<{
    id: number;
    rota_dinamica_id: number;
    destino_id: number;
    ordem: number;
    created_at: string;
  }>;
}

export interface PontoRota {
  nome: string;
  latitude: number;
  longitude: number;
}

export interface AppConfig {
  cidade_base: string;
}
