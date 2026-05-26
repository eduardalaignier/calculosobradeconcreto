/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, HelpCircle, Check, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { ConcreteMass, AuditRecord } from '../types';

interface CalculatorFormProps {
  masses: ConcreteMass[];
  onAddRecord: (record: AuditRecord) => void;
}

export default function CalculatorForm({ masses, onAddRecord }: CalculatorFormProps) {
  // Inputs fields
  const [numNf, setNumNf] = useState('');
  const [selectedConcreteira, setSelectedConcreteira] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [pesoEntrada, setPesoEntrada] = useState<number | ''>('');
  const [pesoSaida, setPesoSaida] = useState<number | ''>('');
  const [volumeNf, setVolumeNf] = useState<number | ''>('');

  // Calculations states for feedback
  const [result, setResult] = useState<{
    pesoLiquido: number;
    volumeCalculado: number;
    diferencaM3: number;
    variacaoPercentual: number;
    massaEspecifica: number;
    status: 'APROVADO' | 'REJEITADO';
    massaData?: string;
    massaNf?: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic values list derived from actual masses database
  const concreteiras = Array.from(new Set(masses.map(m => m.concreteira))).sort();
  
  // Update select default when masses or supplier changes
  useEffect(() => {
    if (concreteiras.length > 0 && !selectedConcreteira) {
      setSelectedConcreteira(concreteiras[0]);
    }
  }, [concreteiras, selectedConcreteira]);

  const availableTipos = Array.from(
    new Set(
      masses
        .filter(m => m.concreteira === selectedConcreteira)
        .map(m => m.tipoConcreto)
    )
  ).sort();

  useEffect(() => {
    if (availableTipos.length > 0) {
      if (!availableTipos.includes(selectedTipo)) {
        setSelectedTipo(availableTipos[0]);
      }
    } else {
      setSelectedTipo('');
    }
  }, [selectedConcreteira, masses, availableTipos, selectedTipo]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!numNf.trim()) {
      setFormError('⚠️ O número da Nota Fiscal é obrigatório!');
      return;
    }
    if (pesoEntrada === '' || pesoEntrada <= 0) {
      setFormError('⚠️ O peso de entrada deve ser maior que zero kg.');
      return;
    }
    if (pesoSaida === '' || pesoSaida <= 0) {
      setFormError('⚠️ O peso de saída deve ser maior que zero kg.');
      return;
    }
    if (pesoEntrada <= pesoSaida) {
      setFormError('⚠️ O peso de entrada deve ser maior que o peso de saída (Peso Líquido positivo).');
      return;
    }
    if (volumeNf === '' || volumeNf <= 0) {
      setFormError('⚠️ O volume da Nota Fiscal deve ser maior que zero m³.');
      return;
    }

    // Helper to parse dates like "DD/MM/YYYY" to epoch milliseconds for sorting
    const parseDateText = (dText?: string): number => {
      if (!dText) return 0;
      if (dText.includes('/')) {
        const parts = dText.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const dObj = new Date(year, month, day);
          if (!isNaN(dObj.getTime())) return dObj.getTime();
        }
      }
      const tParsed = Date.parse(dText);
      return isNaN(tParsed) ? 0 : tParsed;
    };

    // Get all matching masses
    const matchingMasses = masses.filter(
      m => m.concreteira === selectedConcreteira && m.tipoConcreto === selectedTipo
    );

    if (matchingMasses.length === 0) {
      setFormError(`❌ Massa específica não localizada para ${selectedConcreteira} - ${selectedTipo}.`);
      return;
    }

    // Sort: latest date first; if equal/no date, then highest list index (most recently added) first
    const sortedMatching = [...matchingMasses].sort((a, b) => {
      const timeValA = parseDateText(a.data);
      const timeValB = parseDateText(b.data);
      if (timeValA !== timeValB) {
        return timeValB - timeValA;
      }
      return masses.indexOf(b) - masses.indexOf(a);
    });

    const targetMass = sortedMatching[0];

    const mEspecifica = targetMass.massaEspecifica;
    if (mEspecifica <= 0) {
      setFormError('❌ A massa específica cadastrada para este concreto deve ser maior que zero.');
      return;
    }

    // Calculations
    const pesoLiquido = pesoEntrada - pesoSaida;
    
    // Formula: Volume_Calculado = (Peso_Entrada - Peso_Saída) / Massa_Especifica
    const volumeCalculado = pesoLiquido / mEspecifica;
    const diferencaM3 = volumeCalculado - volumeNf;
    
    // Variation: abs((Calculado - NF) / NF) * 100
    const variacaoPercentual = Math.abs((volumeCalculado - volumeNf) / volumeNf) * 100;
    
    // Rule: Approval ≤ 2% variation
    const status = variacaoPercentual <= 2.00 ? 'APROVADO' : 'REJEITADO';

    const calculatedResult = {
      pesoLiquido,
      volumeCalculado,
      diferencaM3,
      variacaoPercentual,
      massaEspecifica: mEspecifica,
      status,
      massaData: targetMass.data,
      massaNf: targetMass.nf,
    };

    setResult(calculatedResult);

    // Add record to sqlite/local list
    const newRecord: AuditRecord = {
      id: Math.random().toString(36).substring(2, 9),
      numNf,
      concreteira: selectedConcreteira,
      tipoConcreto: selectedTipo,
      pesoEntrada,
      pesoSaida,
      pesoLiquido,
      massaEspecifica: mEspecifica,
      volumeNf,
      volumeCalculado,
      diferencaM3,
      variacaoPercentual,
      status,
      dataRegistro: new Date().toISOString(),
    };

    onAddRecord(newRecord);
  };

  // Pre-fill button mocks for testing convenience
  const handlePreFill = (variationType: 'ok' | 'fail') => {
    setNumNf(Math.floor(10000 + Math.random() * 90000).toString());
    setSelectedConcreteira('POLIMIZ');
    setSelectedTipo('Piso');
    
    if (variationType === 'ok') {
      // 8 m3 of Piso concrete (massa: 2380) is about 19040 kg of liquid weight
      setPesoEntrada(36500); // 36.5 tons loaded
      setPesoSaida(17460);   // 17.46 tons tare empty
      setVolumeNf(8.0);      // 8.0 m3, calculated is (36500-17460)/2380 = 19040/2380 = 8.0 m3 (0.0% variation)
    } else {
      // Missing a lot of concrete
      setPesoEntrada(34500); // Only 17040 kg of concrete delivered
      setPesoSaida(17460);
      setVolumeNf(8.0);      // Should be 8.0m3, but is actually 17040/2380 = 7.16m3 (~10.5% missing - fail!)
    }
    setResult(null);
    setFormError(null);
  };

  return (
    <div id="calculator-form" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" />
            Formulário de Entrada e Aferição
          </h2>
          <p className="text-xs text-slate-500">
            Adicione os dados da pesagem em balança rodoviária para verificar inconformidades.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handlePreFill('ok')}
            className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded border border-emerald-200"
            title="Preencher com dados em conformidade (Volume bate com balança)"
          >
            Módulo Ok (≤ 2%)
          </button>
          <button
            type="button"
            onClick={() => handlePreFill('fail')}
            className="px-2.5 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded border border-red-200"
            title="Preencher com dados divergentes (Mais de 2% de falta)"
          >
            Módulo Inconformado (&gt; 2%)
          </button>
        </div>
      </div>

      <form onSubmit={handleCalculate} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Core Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="numNf" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Número da Nota Fiscal (NF) <span className="text-red-500">*</span>
              </label>
              <input
                id="numNf"
                type="text"
                value={numNf}
                onChange={(e) => setNumNf(e.target.value)}
                placeholder="Exemplo: 004829"
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              />
            </div>

            <div>
              <label htmlFor="concreteira" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fornecedor (Concreteira)
              </label>
              <select
                id="concreteira"
                value={selectedConcreteira}
                onChange={(e) => setSelectedConcreteira(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              >
                {concreteiras.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipoConcreto" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo do Traço (Composto)
              </label>
              <select
                id="tipoConcreto"
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              >
                {availableTipos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Physical Weights */}
          <div className="space-y-4">
            <div>
              <label htmlFor="pesoEntrada" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Peso Entrada (Balança Cheio - kg) <span className="text-red-500">*</span>
              </label>
              <input
                id="pesoEntrada"
                type="number"
                value={pesoEntrada}
                onChange={(e) => setPesoEntrada(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="Exemplo: 36500"
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              />
            </div>

            <div>
              <label htmlFor="pesoSaida" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Peso Saída (Balança Vazio - kg) <span className="text-red-500">*</span>
              </label>
              <input
                id="pesoSaida"
                type="number"
                value={pesoSaida}
                onChange={(e) => setPesoSaida(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="Exemplo: 17460"
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              />
            </div>

            <div>
              <label htmlFor="volumeNf" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Volume Faturado na NF (m³) <span className="text-red-500">*</span>
              </label>
              <input
                id="volumeNf"
                type="number"
                step="0.01"
                value={volumeNf}
                onChange={(e) => setVolumeNf(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="Exemplo: 8.0"
                className="w-full px-3.5 py-2 text-sm border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              />
            </div>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium">{formError}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue/90 active:bg-brand-dark text-white font-bold text-sm tracking-wide rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4 text-brand-teal" />
          Calcular e Auditorar Volume
        </button>
      </form>

      {/* Audit Calculations Feedback Screen */}
      {result && (
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            📊 Painel de Análise Metrológica
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Liquid Weight Metric */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Peso Líquido Aferido
              </span>
              <span className="text-lg font-bold text-slate-700 font-mono">
                {result.pesoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg
              </span>
            </div>

            {/* Calculated Volume Metric */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center relative">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Volume Calculado Refratado
              </span>
              <span className="text-lg font-bold text-slate-700 font-mono block">
                {result.volumeCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} m³
              </span>
              <span className={`text-[10px] font-medium font-mono ${result.diferencaM3 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.diferencaM3 >= 0 ? '+' : ''}{result.diferencaM3.toFixed(3)} m³ vs NF
              </span>
            </div>

            {/* Density Factor */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center flex flex-col justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Massa Específica Utilizada
                </span>
                <span className="text-lg font-bold text-brand-blue font-mono">
                  {result.massaEspecifica.toFixed(1)} kg/m³
                </span>
              </div>
              {(result.massaData || result.massaNf) && (
                <span className="block text-[10px] text-slate-500 font-medium mt-1 leading-none">
                  Ref: {result.massaData ? `${result.massaData}` : ''} {result.massaNf ? `(NF ${result.massaNf})` : ''}
                </span>
              )}
            </div>
          </div>

          {/* SUCCESS/ERROR ALERTS CRITICAL RULE */}
          {result.status === 'REJEITADO' ? (
            <div className="p-4 bg-red-50 border border-red-205 rounded-xl text-red-800 space-y-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h4 className="font-bold text-sm">
                  DIVERGÊNCIA CRÍTICA DECLARADA (Diferença de {result.variacaoPercentual.toFixed(2)}%)
                </h4>
              </div>
              <p className="text-xs text-red-750 font-normal leading-relaxed">
                A variação total entre o volume declarado na Nota Fiscal e o volume calculado via massa específica do carregamento excedeu a tolerância legal máxima de <strong>2.00%</strong>. Diferença de <strong>{Math.abs(result.diferencaM3).toFixed(3)} m³</strong> faltantes. 
                Recomenda-se registrar pendência ou reter recebimento junto ao fornecedor <strong>{selectedConcreteira}</strong>.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 space-y-2">
              <div className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-sm">
                  RECEBIMENTO APROVADO EM CONFORMIDADE (Variação de {result.variacaoPercentual.toFixed(2)}%)
                </h4>
              </div>
              <p className="text-xs text-emerald-750 font-normal leading-relaxed">
                Excelente! A oscilação aferida está em conformidade com as regras técnicas da obra (variação menor ou igual a <strong>2.00%</strong>). O lote da NF <strong>{numNf}</strong> está liberado para o processo de concretagem estrutural.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
