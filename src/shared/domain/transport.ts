export type Turno = 'MT' | 'VT' | 'NT' | 'IN';
export type TurnoOperacional = Exclude<Turno, 'IN'>;
export type Sentido = 'ida' | 'volta';

export interface AppConfig {
  cidade_base: string;
}
