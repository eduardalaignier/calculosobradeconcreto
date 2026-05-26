/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { defaultMasses } from './data/defaultMasses';
import { ConcreteMass, AuditRecord } from './types';
import SidebarSettings from './components/SidebarSettings';
import CalculatorForm from './components/CalculatorForm';
import HistoryTable from './components/HistoryTable';
import CodeViewer from './components/CodeViewer';
import { Hammer, Code, LayoutDashboard, Shield, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code'>('dashboard');
  const [masses, setMasses] = useState<ConcreteMass[]>([]);
  const [records, setRecords] = useState<AuditRecord[]>([]);

  // Initialize data (either from localStorage or default values)
  useEffect(() => {
    // 1. Initial Concrete masses
    const savedMasses = localStorage.getItem('concrete_masses_reference');
    if (savedMasses) {
      try {
        setMasses(JSON.parse(savedMasses));
      } catch (e) {
        setMasses(defaultMasses);
      }
    } else {
      setMasses(defaultMasses);
    }

    // 2. Initial Audit historical logs
    const savedRecords = localStorage.getItem('concrete_audit_records_v1');
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {
        setupSeedRecords();
      }
    } else {
      setupSeedRecords();
    }
  }, []);

  // Sync state changes to local storage for realistic persistence
  const updateMassesWithStorage = (newMasses: ConcreteMass[]) => {
    setMasses(newMasses);
    localStorage.setItem('concrete_masses_reference', JSON.stringify(newMasses));
  };

  const handleRestoreDefaults = () => {
    updateMassesWithStorage(defaultMasses);
  };

  const setupSeedRecords = () => {
    // Pre-populate with realistic seed data so dashboard looks active
    const seedRecords: AuditRecord[] = [
      {
        id: '1',
        numNf: '003295',
        concreteira: 'HIPERMIX',
        tipoConcreto: 'Estaca',
        pesoEntrada: 41260,
        pesoSaida: 17460,
        pesoLiquido: 23800,
        massaEspecifica: 2380,
        volumeNf: 10.00,
        volumeCalculado: 10.000,
        diferencaM3: 0.00,
        variacaoPercentual: 0.00,
        status: 'APROVADO',
        dataRegistro: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
      },
      {
        id: '2',
        numNf: '003294',
        concreteira: 'POLIMIZ',
        tipoConcreto: 'Piso',
        pesoEntrada: 35020,
        pesoSaida: 17120,
        pesoLiquido: 17900,
        massaEspecifica: 2380,
        volumeNf: 8.00,
        volumeCalculado: 7.521,
        diferencaM3: -0.479,
        variacaoPercentual: 5.99,
        status: 'REJEITADO',
        dataRegistro: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
      },
      {
        id: '3',
        numNf: '003289',
        concreteira: 'CONCRELUZ',
        tipoConcreto: 'Bloco',
        pesoEntrada: 36080,
        pesoSaida: 17120,
        pesoLiquido: 18960,
        massaEspecifica: 2370,
        volumeNf: 8.00,
        volumeCalculado: 8.000,
        diferencaM3: 0.00,
        variacaoPercentual: 0.00,
        status: 'APROVADO',
        dataRegistro: new Date(Date.now() - 3600000 * 24).toISOString(), // Yesterday
      },
    ];
    setRecords(seedRecords);
    localStorage.setItem('concrete_audit_records_v1', JSON.stringify(seedRecords));
  };

  const handleAddRecord = (record: AuditRecord) => {
    const updated = [record, ...records];
    setRecords(updated);
    localStorage.setItem('concrete_audit_records_v1', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (confirm('Deseja realmente apagar todo o histórico de auditorias da memória?')) {
      setRecords([]);
      localStorage.removeItem('concrete_audit_records_v1');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Professional App Bar Header */}
      <header className="bg-brand-dark border-b border-brand-slate text-slate-100 shrink-0">
        <div className="max-w-[1600px] mx-auto px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-blue/35 border border-brand-teal/30 p-2.5 rounded-lg shadow-inner flex flex-col items-center justify-center font-black text-white font-mono leading-none">
              <span className="text-lg text-brand-teal leading-none">F</span>
              <span className="text-[9px] text-slate-300 leading-none">ENG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xl tracking-tight leading-none text-white flex items-baseline gap-1.5 font-black font-sans">
                  <span>FORTES</span>
                  <span className="text-brand-teal text-xs tracking-widest font-bold uppercase">ENGENHARIA</span>
                </div>
                <span className="hidden sm:inline bg-brand-slate text-brand-teal/90 border border-brand-blue/30 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold tracking-wider">
                  módulo fiscal & balança
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Auditoria de volume faturado vs. pesagem de balança em tempo real
              </p>
            </div>
          </div>

          {/* Navigation Controls (Streamlit Emulator Mode vs Raw Code) */}
          <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-brand-slate/60 sticky top-0 z-50">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-brand-blue text-white shadow-sm border border-brand-teal/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-brand-teal" />
              Painel Interativo (Streamlit Sim)
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                activeTab === 'code'
                  ? 'bg-brand-blue text-white shadow-sm border border-brand-teal/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-brand-teal" />
              Código Python (app.py)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto min-h-0">
        
        {/* Dynamic Left Settings Sidebar only in Dashboard View */}
        {activeTab === 'dashboard' && (
          <SidebarSettings
            masses={masses}
            onUpdateMasses={updateMassesWithStorage}
            onRestoreDefaults={handleRestoreDefaults}
          />
        )}

        {/* Core Component Area */}
        <main className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6">
          {activeTab === 'dashboard' ? (
            <>
              {/* Alert notification indicating the environment's context */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-amber-900 shadow-xs flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold">Módulo de Simulação Técnica Ativado</h4>
                  <p className="text-amber-850 leading-relaxed font-normal">
                    Este painel simula com precisão cirúrgica a aplicação em <strong>Python + Streamlit</strong>. Cadastre massas na barra lateral, faça auditorias de notas, verifique desvios críticos e veja seus dados arquivados. Para exportar ou rodar no seu servidor local, mude para a aba <strong>Código Python (app.py)</strong> para baixar ou copiar o código.
                  </p>
                </div>
              </div>

              {/* Calculator Section */}
              <div className="grid grid-cols-1 gap-6">
                <CalculatorForm
                  masses={masses}
                  onAddRecord={handleAddRecord}
                />
              </div>

              {/* Historical logs Section */}
              <HistoryTable
                records={records}
                onClearHistory={handleClearHistory}
              />
            </>
          ) : (
            <div className="max-w-4xl mx-auto py-2">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Módulo de Entrega de Engenharia Python
                </h2>
                <p className="text-xs text-slate-500">
                  Veja, copie ou estude os fundamentos do script de automação estruturado em Streamlit para implantação em obra.
                </p>
              </div>

              <CodeViewer />
            </div>
          )}
        </main>
      </div>

      {/* Custom Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-5 shrink-0 text-center text-slate-400 text-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>
            Módulo de Controle e Conformidade de Suprimentos © 2026
          </p>
          <div className="flex gap-4">
            <span className="font-medium text-slate-500">Aço & Concreto S/A</span>
            <span className="text-slate-300">|</span>
            <span>Versão 1.2.0 (Estável)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
