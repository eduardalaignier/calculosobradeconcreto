/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, ShieldAlert, BadgeInfo, Calendar, Clock, Sparkles } from 'lucide-react';
import { AuditRecord } from '../types';

interface HistoryTableProps {
  records: AuditRecord[];
  onClearHistory: () => void;
}

export default function HistoryTable({ records, onClearHistory }: HistoryTableProps) {
  return (
    <div id="history-table" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-teal" />
            Histórico de Notas Auditadas
          </h2>
          <p className="text-xs text-slate-500">
            Base de dados consolidada de recebimentos persistida em cache local (simulação SQLite3).
          </p>
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 text-red-650 hover:text-red-750 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Histórico de Registros
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="text-center py-10 px-4">
          <ShieldAlert className="w-12 h-12 text-slate-350 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Nenhum registro de concreto cadastrado.</p>
          <p className="text-xs text-slate-400 mt-1">Insira os dados no formulário acima para calcular e persistir a primeira auditoria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-150 text-[10px] sm:text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nº NF</th>
                <th className="px-3 py-3">Concreteira</th>
                <th className="px-3 py-3">Tipo Traço</th>
                <th className="px-3 py-3 text-right">Massa Esp. (kg/m³)</th>
                <th className="px-3 py-3 text-right">Peso Líquido (kg)</th>
                <th className="px-3 py-3 text-right">Vol. NF (m³)</th>
                <th className="px-3 py-3 text-right">Vol. Calc (m³)</th>
                <th className="px-3 py-3 text-right">Variação (%)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Data/Aferição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((r) => {
                const isRejected = r.status === 'REJEITADO';
                const formattedDate = new Date(r.dataRegistro).toLocaleDateString('pt-BR');
                const formattedTime = new Date(r.dataRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                      {r.numNf}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                      {r.concreteira}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {r.tipoConcreto}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-brand-blue">
                      {r.massaEspecifica.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      {r.pesoLiquido.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-500">
                      {r.volumeNf.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-800">
                      {r.volumeCalculado.toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold">
                      <span className={isRejected ? 'text-red-650' : 'text-emerald-650'}>
                        {r.variacaoPercentual.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                        isRejected 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] text-slate-400 whitespace-nowrap">
                      <span className="block font-medium">{formattedDate}</span>
                      <span className="font-mono text-slate-350">{formattedTime}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
