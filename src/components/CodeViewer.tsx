/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Terminal, FileSpreadsheet, PlayCircle, HelpCircle, Laptop } from 'lucide-react';
import { pythonCodeStr } from '../data/pythonCode';

export default function CodeViewer() {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonCodeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="code-viewer" className="space-y-6">
      {/* Installation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-slate-800 text-6xl font-black select-none pointer-events-none">1</div>
          <div className="flex items-center gap-2 text-brand-teal mb-3 font-bold text-sm">
            <Terminal className="w-4 h-4 text-brand-teal" />
            Passo 1: Dependências
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Instale o Streamlit e as bibliotecas do ecossistema de dados Python no seu terminal:
          </p>
          <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-brand-teal border border-slate-850 flex items-center justify-between">
            <span>pip install streamlit pandas openpyxl</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-slate-800 text-6xl font-black select-none pointer-events-none">2</div>
          <div className="flex items-center gap-2 text-brand-teal mb-3 font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-brand-teal" />
            Passo 2: Criar Excel
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            Monte a planilha de Massas Específicas com <strong>exatamente</strong> estas colunas no cabeçalho:
          </p>
          <div className="text-[10px] font-mono p-2 bg-slate-950 border border-slate-850 rounded text-slate-300">
            <div>Concreteira | Tipo_Concreto | Massa_Especifica</div>
            <div className="text-slate-500">POLIMIZ     | Piso          | 2380.0</div>
            <div className="text-slate-500">HIPERMIX    | Estaca        | 2400.0</div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-slate-800 text-6xl font-black select-none pointer-events-none">3</div>
          <div className="flex items-center gap-2 text-brand-teal mb-3 font-bold text-sm">
            <PlayCircle className="w-4 h-4 text-brand-teal" />
            Passo 3: Executar
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Crie um arquivo local <code>app.py</code> com o código abaixo e execute-o do terminal:
          </p>
          <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-brand-teal border border-slate-850 flex items-center justify-between">
            <span>streamlit run app.py</span>
          </div>
        </div>
      </div>

      {/* Code Area */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-md">
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-850 flex justify-between items-center text-slate-200">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold font-mono text-slate-300">app.py (Código Fonte Python/Streamlit)</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-950 rounded border border-slate-800 hover:border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-400 font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>
        <div className="p-5 overflow-auto max-h-[500px] text-xs font-mono text-slate-350 leading-relaxed text-left selection:bg-slate-800">
          <pre>{pythonCodeStr}</pre>
        </div>
      </div>

      {/* Tips and guidelines */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-700 space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-brand-teal" />
          Como o código interage com o Excel? (Explicação Técnica)
        </h4>
        <div className="text-xs space-y-2 text-slate-650 leading-relaxed">
          <p>
            • No início do pipeline, o módulo <code>streamlit.file_uploader</code> captura o arquivo Excel (<code>.xlsx</code>) enviado pelo usuário na barra lateral.
          </p>
          <p>
            • O pandas através do método <code>pd.read_excel</code> e utilizando o motor/engine <code>openpyxl</code>, converte os bytes carregados em um DataFrame estruturado de colunas.
          </p>
          <p>
            • Aplicamos procedimentos de limpeza, removendo espaços das strings com <code>str.strip()</code> e assegurando que acentos ou letras nulas de <code>Massa_Especifica</code> sejam convertidas para floats válidos através de <code>pd.to_numeric(..., errors="coerce")</code>.
          </p>
          <p>
            • Uma vez lido sem erros, a base ativa em cache no <code>st.session_state.massas_db</code> é atualizada instantaneamente. A partir desse estado recalculamos os parâmetros de preenchimento dos selects e extraímos o fator de conversão de volume volumétrico correto.
          </p>
        </div>
      </div>
    </div>
  );
}
