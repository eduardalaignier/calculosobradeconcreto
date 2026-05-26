/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Database, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConcreteMass } from '../types';

interface SidebarSettingsProps {
  masses: ConcreteMass[];
  onUpdateMasses: (newMasses: ConcreteMass[]) => void;
  onRestoreDefaults: () => void;
}

export default function SidebarSettings({
  masses,
  onUpdateMasses,
  onRestoreDefaults,
}: SidebarSettingsProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processParsedGrid = (rowsRaw: any[][], fileName: string) => {
    const rows = rowsRaw.map(r => 
      Array.isArray(r) ? r.map(c => c === null || c === undefined ? '' : String(c).trim()) : []
    ).filter(r => r.length > 0);

    if (rows.length < 2) {
      throw new Error("O arquivo está vazio ou de formato inválido.");
    }

    let headerIdx = -1;
    let concreteiraIdx = -1;
    let tipoConcretoIdx = -1;
    let massaEspecificaIdx = -1;
    let dataIdx = -1;
    let nfIdx = -1;

    // Busca em todas as linhas pelo cabeçalho
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      concreteiraIdx = row.findIndex(h => {
        const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return norm === 'concreteira' || norm === 'fornecedor';
      });
      tipoConcretoIdx = row.findIndex(h => {
        const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return norm === 'tipo de concreto' || norm === 'tipo_concreto' || norm === 'tipoconcreto' || norm.includes('traco') || norm.includes('tipo') || norm.includes('composto');
      });
      massaEspecificaIdx = row.findIndex(h => {
        const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return norm === 'massa especifica' || norm === 'massa_especifica' || norm === 'massaespecifica' || norm.includes('massa espec') || norm.includes('massa_esp') || norm.includes('massaesp');
      });

      if (concreteiraIdx !== -1 && tipoConcretoIdx !== -1 && massaEspecificaIdx !== -1) {
        headerIdx = i;
        
        // Também busca as colunas opcionais adicionais
        dataIdx = row.findIndex(h => {
          const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return norm === 'data' || norm === 'data da coleta' || norm === 'data ensaio' || norm === 'data_registro' || norm === 'data_teste' || norm === 'data do ensaio' || norm === 'data_ensaio';
        });
        nfIdx = row.findIndex(h => {
          const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return norm === 'nf' || norm === 'nota fiscal' || norm === 'nota_fiscal' || norm === 'num nf' || norm === 'numero nf' || norm === 'num_nf';
        });
        
        break;
      }
    }

    if (headerIdx === -1) {
      throw new Error("Colunas obrigatórias ausentes. O cabeçalho deve conter: CONCRETEIRA, TIPO DE CONCRETO e MASSA ESPECÍFICA.");
    }

    const newMasses: ConcreteMass[] = [];

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const cells = rows[i];
      if (cells.length === 0) continue;

      const concreteiraRaw = cells[concreteiraIdx];
      const tipoConcretoRaw = cells[tipoConcretoIdx];
      const massaRaw = cells[massaEspecificaIdx];
      const dataRaw = dataIdx !== -1 && cells.length > dataIdx ? cells[dataIdx] : undefined;
      const nfRaw = nfIdx !== -1 && cells.length > nfIdx ? cells[nfIdx] : undefined;

      if (!concreteiraRaw || !tipoConcretoRaw || !massaRaw) continue;

      // Limpar massa especifica (permitir tanto vírgula quanto ponto como separador decimal/milhar)
      let cleanedMassaStr = massaRaw.replace(/\s/g, '');
      if (cleanedMassaStr.includes(',') && cleanedMassaStr.includes('.')) {
        if (cleanedMassaStr.lastIndexOf(',') > cleanedMassaStr.lastIndexOf('.')) {
          cleanedMassaStr = cleanedMassaStr.replace(/\./g, '').replace(/,/g, '.');
        } else {
          cleanedMassaStr = cleanedMassaStr.replace(/,/g, '');
        }
      } else if (cleanedMassaStr.includes(',')) {
        cleanedMassaStr = cleanedMassaStr.replace(/,/g, '.');
      }

      let massaEspecifica = parseFloat(cleanedMassaStr);

      if (!isNaN(massaEspecifica) && massaEspecifica > 0) {
        // Se estiver na escala de 2.404 (kg/L ou kg/dm³) e for inferior a 10, multiplica por 1000 para kg/m³
        if (massaEspecifica < 10) {
          massaEspecifica = massaEspecifica * 1000;
        }

        // Padroniza capitalizações
        const concreteira = concreteiraRaw.toUpperCase().trim();
        const tipoConcreto = tipoConcretoRaw.trim().split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        const data = dataRaw ? dataRaw.trim() : undefined;
        const nf = nfRaw ? nfRaw.trim() : undefined;

        // Sem deduplicar! Trazer tudo o que houver na planilha para poder conferir
        newMasses.push({
          concreteira,
          tipoConcreto,
          massaEspecifica,
          data,
          nf
        });
      }
    }

    if (newMasses.length === 0) {
      throw new Error("Nenhum registro de concreto válido pôde ser extraído das linhas.");
    }

    onUpdateMasses(newMasses);
    setUploadSuccess(`Sucesso! ${newMasses.length} registros e massas de laboratórios importados com sucesso do arquivo "${fileName}".`);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (event) => {
        try {
          const text = event.target?.result;
          if (typeof text === 'string') {
            const lines = text.split(/\r?\n/);
            const rawGrid = lines.map(line => line.split(/[;,]/));
            processParsedGrid(rawGrid, file.name);
          } else {
            throw new Error("Não foi possível ler o arquivo de texto.");
          }
        } catch (err: any) {
          setUploadError(err.message || "Erro desconhecido ao processar planilha CSV.");
          setUploadSuccess(null);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
      reader.onload = (event) => {
        try {
          const ab = event.target?.result;
          if (ab instanceof ArrayBuffer) {
            const data = new Uint8Array(ab);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Converte a aba para array de arrays (grid)
            const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            processParsedGrid(rawGrid, file.name);
          } else {
            throw new Error("Não foi possível ler o arquivo binário do Excel.");
          }
        } catch (err: any) {
          setUploadError(err.message || "Erro ao processar planilha Excel (.xlsx). Certifique-se de que o cabeçalho é compatível.");
          setUploadSuccess(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadError("Por favor, envie um arquivo .csv, .txt ou .xlsx.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="sidebar-settings" className="bg-brand-dark border-r border-brand-slate text-slate-100 p-5 w-full lg:w-80 shrink-0 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-brand-teal" />
          Configurações
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Gerencie a base de massas específicas das concreteiras para o cálculo técnico de balança.
        </p>
      </div>

      {/* File Uploader Section */}
      <div className="bg-slate-950/70 p-4 rounded-lg border border-brand-slate/40">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Carregar Base de Massas (.xlsx / .csv)
        </label>
        
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors duration-200 ${
            dragActive
              ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
              : "border-brand-slate hover:border-brand-teal hover:bg-brand-dark text-slate-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv, .txt, .xlsx"
            onChange={handleFileInputChange}
          />
          <Upload className="mx-auto h-8 w-8 mb-2 opacity-90 text-brand-teal" />
          <p className="text-xs font-bold text-slate-200">Arraste ou clique para enviar</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Filtros aceitos: .csv, .xlsx</span>
        </div>

        {uploadError && (
          <div className="mt-3 p-2 bg-red-950/50 border border-red-800/60 rounded text-[11px] text-red-200 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-3 p-2 bg-green-950/50 border border-green-800/60 rounded text-[11px] text-green-200 flex items-start gap-1.5 leading-snug">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* Active References Table */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <span>⚖️ Massa Específica Ativa</span>
          </h4>
          <span className="text-[10px] bg-slate-800 text-slate-350 px-1.5 py-0.5 rounded font-mono">
            {masses.length} itens
          </span>
        </div>
        
        <div className="overflow-y-auto max-h-[500px] border border-brand-slate rounded-lg flex-1 bg-slate-950/60">
          <table className="w-full text-xs text-left">
            <thead className="bg-brand-dark border-b border-brand-slate text-[10px] uppercase font-semibold text-slate-300 sticky top-0">
              <tr>
                <th className="px-3 py-2">Concreteira</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">kg/m³</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-slate/40 text-slate-300">
              {masses.map((m, idx) => (
                <tr key={`${m.concreteira}-${m.tipoConcreto}-${idx}`} className="hover:bg-brand-slate/20">
                  <td className="px-3 py-1.5 font-semibold text-white">
                    <div>{m.concreteira}</div>
                    {m.nf && <div className="text-[10px] text-slate-400 font-normal">NF: {m.nf}</div>}
                  </td>
                  <td className="px-3 py-1.5 text-slate-350">
                    <div>{m.tipoConcreto}</div>
                    {m.data && <div className="text-[10px] text-brand-teal/80 font-normal">{m.data}</div>}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono text-brand-teal font-semibold">
                    {m.massaEspecifica.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Default Button */}
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-brand-slate hover:border-brand-teal bg-brand-slate hover:bg-brand-blue text-xs font-semibold rounded-lg text-slate-200 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5 text-brand-teal" />
        Restaurar Massas Padrão
      </button>

      {/* Quick Info Tip */}
      <div className="bg-slate-950/50 p-3 rounded border border-brand-slate/40 text-[11px] text-slate-300 leading-relaxed">
        <div className="flex gap-1.5 items-start">
          <Info className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p>
            Alavanque a precisão! Diferenças de volume maiores que <strong className="text-brand-teal">2%</strong> são destacadas em vermelho.
          </p>
        </div>
      </div>
    </div>
  );
}
