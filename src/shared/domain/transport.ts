export type Turno = 'MT' | 'VT' | 'NT' | 'IN';
export type TurnoOperacional = Exclude<Turno, 'IN'>;
export type Sentido = 'ida' | 'volta';

export interface AppConfig {
  cidade_base: string;
  /** Centro da cidade base, em graus decimais. Enquadra os mapas do painel. */
  latitude_base: number;
  longitude_base: number;
  fuso_horario: string;
}
