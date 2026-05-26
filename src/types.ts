/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConcreteMass {
  concreteira: string;
  tipoConcreto: string;
  massaEspecifica: number; // kg/m3
  data?: string;           // Data de registro do ensaio (ex: 12/08/2025)
  nf?: string;             // NF do caminhão em que foi feito o ensaio de laboratório
}

export interface AuditRecord {
  id: string;
  numNf: string;
  concreteira: string;
  tipoConcreto: string;
  pesoEntrada: number;
  pesoSaida: number;
  pesoLiquido: number;
  massaEspecifica: number;
  volumeNf: number;
  volumeCalculado: number;
  diferencaM3: number;
  variacaoPercentual: number;
  status: 'APROVADO' | 'REJEITADO';
  dataRegistro: string;
}
