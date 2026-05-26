export const pythonCodeStr = `# -*- coding: utf-8 -*-
"""
Controle de Recebimento de Concreto (Balística de Volume e Pesagem de Balança)
Autor: Engenheiro de Software Sênior especialista em Python e Streamlit
"""

import streamlit as st
import pandas as pd
import sqlite3
import os

st.set_page_config(
    page_title="Controle de Recebimento de Concreto",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CONFIGURAÇÃO E CRIAÇÃO DO BANCO DE DADOS (SQLite3) ---
DB_NAME = "controle_concreto.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historico_recebimento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            num_nf TEXT,
            concreteira TEXT,
            tipo_concreto TEXT,
            peso_entrada REAL,
            peso_saida REAL,
            volume_nf REAL,
            volume_calculado REAL,
            variacao_percentual REAL,
            status TEXT,
            massa_especifica REAL DEFAULT 0.0,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Adicionar coluna dinamicamente caso a tabela já exista sem ela
    try:
        cursor.execute("ALTER TABLE historico_recebimento ADD COLUMN massa_especifica REAL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

init_db()

def salvar_registro(num_nf, concreteira, tipo_concreto, peso_entrada, peso_saida, volume_nf, volume_calculado, variacao, status, massa_especifica):
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO historico_recebimento 
            (num_nf, concreteira, tipo_concreto, peso_entrada, peso_saida, volume_nf, volume_calculado, variacao_percentual, status, massa_especifica)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (num_nf, concreteira, tipo_concreto, peso_entrada, peso_saida, volume_nf, volume_calculado, variacao, status, massa_especifica))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Erro ao salvar registro: {e}")
        return False

def obter_historico():
    try:
        conn = sqlite3.connect(DB_NAME)
        df = pd.read_sql_query(\"\"\"
            SELECT 
                id as ID, 
                num_nf as 'Nº NF', 
                concreteira as Concreteira, 
                tipo_concreto as 'Tipo Concreto', 
                round(massa_especifica, 1) as 'Massa Esp. (kg/m³)', 
                peso_entrada as 'Peso Entrada (kg)', 
                peso_saida as 'Peso Saída (kg)', 
                (peso_entrada - peso_saida) as 'Peso Líquido (kg)', 
                volume_nf as 'Vol. NF (m³)', 
                round(volume_calculado, 3) as 'Vol. Calc (m³)', 
                round(variacao_percentual, 2) as 'Var. (%)', 
                status as Status, 
                data_registro as 'Data/Hora' 
            FROM historico_recebimento 
            ORDER BY id DESC
        \"\"\", conn)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Erro ao ler histórico: {e}")
        return pd.DataFrame()

# --- GESTÃO DE MASSAS ESPECÍFICAS (PADRÃO) ---
DEFAULT_MASSES = {
    ("POLIMIZ", "Estaca"): 2400.0,
    ("POLIMIZ", "Bloco"): 2350.0,
    ("POLIMIZ", "Piso"): 2380.0,
    ("POLIMIZ", "Piso com Fibra"): 2410.0,
    ("HIPERMIX", "Estaca"): 2380.0,
    ("HIPERMIX", "Bloco"): 2400.0,
    ("HIPERMIX", "Piso"): 2390.0,
    ("HIPERMIX", "Piso com Fibra"): 2420.0,
    ("CONCRELUZ", "Estaca"): 2410.0,
    ("CONCRELUZ", "Bloco"): 2370.0,
    ("CONCRELUZ", "Piso"): 2360.0,
    ("CONCRELUZ", "Piso com Fibra"): 2400.0,
}

def load_initial_masses():
    records = []
    for (concreteira, tipo), massa in DEFAULT_MASSES.items():
        records.append({
            "Concreteira": concreteira,
            "Tipo_Concreto": tipo,
            "Massa_Especifica": float(massa),
            "Data": "Padrão",
            "NF": "-"
        })
    return pd.DataFrame(records)

if "massas_db" not in st.session_state:
    st.session_state.massas_db = load_initial_masses()

# --- INTERFACE GRÁFICA ---
st.markdown(\"""
<div style="background-color:#011E3A; padding:20px; border-radius:10px; margin-bottom:25px; border-left: 5px solid #00C2A0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <h1 style="color:#ffffff; margin:0; font-family:sans-serif; font-weight:900; letter-spacing:-1px;">
        FORTES <span style="color:#00C2A0; font-weight:300; font-size:24px; letter-spacing:2px;">ENGENHARIA</span>
    </h1>
    <p style="color:#cbd5e1; font-size:13px; margin:8px 0 0 0; font-family:sans-serif;">
        Módulo Fiscal de Auditoria & Balança — Controle e Conformidade Metrológica de Concreto Estrutural
    </p>
</div>
\""", unsafe_allow_html=True)

# SIDEBAR: CONFIGURAÇÕES
st.sidebar.markdown("### ⚙️ Painel de Configurações")
st.sidebar.write("Gerencie a base de Massas Específicas dos compostos.")

with st.sidebar.expander("📁 Carregar Base de Massas (CSV / Excel)", expanded=True):
    uploaded_file = st.sidebar.file_uploader(
        "Selecione o arquivo:",
        type=["xlsx", "csv"],
        help="O arquivo deve conter as colunas: CONCRETEIRA, TIPO DE CONCRETO e MASSA ESPECÍFICA."
    )

    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith(".xlsx"):
                df_uploaded = pd.read_excel(uploaded_file)
            else:
                try:
                    df_uploaded = pd.read_csv(uploaded_file, sep=";")
                except Exception:
                    df_uploaded = pd.read_csv(uploaded_file, sep=",")
            
            # Normalização de nomes de colunas (removendo acentos e espaços)
            import unicodedata
            def normalizar_coluna(col):
                if not isinstance(col, str):
                    col = str(col)
                norm = unicodedata.normalize("NFD", col)
                norm = "".join([c for c in norm if not unicodedata.combining(c)])
                return norm.strip().upper().replace("_", " ")

            col_mapping = {}
            required_cols = {"Concreteira", "Tipo_Concreto", "Massa_Especifica"}
            header_found = False

            # Primeiro, verificamos se a primeira linha (colunas normais do pandas) já contém o cabeçalho
            for col in df_uploaded.columns:
                norm = normalizar_coluna(col)
                if norm in ["CONCRETEIRA", "FORNECEDOR"]:
                    col_mapping[col] = "Concreteira"
                elif norm in ["TIPO DE CONCRETO", "TIPO CONCRETO", "TIPOCONCRETO"] or "TRACO" in norm or "COMPOSTO" in norm:
                    col_mapping[col] = "Tipo_Concreto"
                elif norm in ["MASSA ESPECIFICA", "MASSAESPECIFICA"] or "MASSA ESPEC" in norm or "MASSA ESP" in norm or "MASSAESP" in norm:
                    col_mapping[col] = "Massa_Especifica"
                elif norm in ["DATA", "DATA DA COLETA", "DATA ENSAIO", "DATA_REGISTRO", "DATA_TESTE", "DATA DO ENSAIO", "DATA_ENSAIO"]:
                    col_mapping[col] = "Data"
                elif norm in ["NF", "NOTA FISCAL", "NOTA_FISCAL", "NUM NF", "NUMERO NF", "NUM_NF"]:
                    col_mapping[col] = "NF"

            if required_cols.issubset(set(col_mapping.values())):
                df_uploaded = df_uploaded.rename(columns=col_mapping)
                header_found = True
            else:
                # Se não encontrou de primeira, procura em todas as linhas da planilha
                for idx, row in df_uploaded.iterrows():
                    test_col_mapping = {}
                    for col_idx, val in enumerate(row):
                        if pd.isna(val):
                            continue
                        norm = normalizar_coluna(str(val))
                        orig_col = df_uploaded.columns[col_idx]
                        if norm in ["CONCRETEIRA", "FORNECEDOR"]:
                            test_col_mapping[orig_col] = "Concreteira"
                        elif norm in ["TIPO DE CONCRETO", "TIPO CONCRETO", "TIPOCONCRETO"] or "TRACO" in norm or "COMPOSTO" in norm:
                            test_col_mapping[orig_col] = "Tipo_Concreto"
                        elif norm in ["MASSA ESPECIFICA", "MASSAESPECIFICA"] or "MASSA ESPEC" in norm or "MASSA ESP" in norm or "MASSAESP" in norm:
                            test_col_mapping[orig_col] = "Massa_Especifica"
                        elif norm in ["DATA", "DATA DA COLETA", "DATA ENSAIO", "DATA_REGISTRO", "DATA_TESTE", "DATA DO ENSAIO", "DATA_ENSAIO"]:
                            test_col_mapping[orig_col] = "Data"
                        elif norm in ["NF", "NOTA FISCAL", "NOTA_FISCAL", "NUM NF", "NUMERO NF", "NUM_NF"]:
                            test_col_mapping[orig_col] = "NF"
                    
                    if required_cols.issubset(set(test_col_mapping.values())):
                        df_uploaded_new = df_uploaded.iloc[idx + 1:].copy()
                        df_uploaded_new = df_uploaded_new.rename(columns=test_col_mapping)
                        df_uploaded = df_uploaded_new
                        header_found = True
                        break

            if header_found:
                columns_to_keep = ["Concreteira", "Tipo_Concreto", "Massa_Especifica"]
                if "Data" in df_uploaded.columns:
                    columns_to_keep.append("Data")
                if "NF" in df_uploaded.columns:
                    columns_to_keep.append("NF")
                    
                df_extracted = df_uploaded[columns_to_keep].copy()
                
                # Conversão robusta de valores numéricos
                def limpar_massa_esp(val):
                    try:
                        if pd.isna(val) or val == "":
                            return None
                        val_str = str(val).strip().replace(" ", "")
                        if "," in val_str and "." in val_str:
                            if val_str.rfind(",") > val_str.rfind("."):
                                val_str = val_str.replace(".", "").replace(",", ".")
                            else:
                                val_str = val_str.replace(",", "")
                        elif "," in val_str:
                            val_str = val_str.replace(",", ".")
                        
                        num = float(val_str)
                        if num < 10.0:
                            num = num * 1000.0
                        return num
                    except Exception:
                        return None

                df_extracted["Massa_Especifica"] = df_extracted["Massa_Especifica"].apply(limpar_massa_esp)
                df_extracted["Concreteira"] = df_extracted["Concreteira"].astype(str).str.strip().str.upper()
                df_extracted["Tipo_Concreto"] = df_extracted["Tipo_Concreto"].astype(str).str.strip().str.title()
                
                if "Data" in df_extracted.columns:
                    df_extracted["Data"] = df_extracted["Data"].fillna("-").astype(str).str.strip()
                else:
                    df_extracted["Data"] = "Importado"
                    
                if "NF" in df_extracted.columns:
                    df_extracted["NF"] = df_extracted["NF"].fillna("-").astype(str).str.strip()
                else:
                    df_extracted["NF"] = "-"

                df_cleaned = df_extracted.dropna(subset=["Concreteira", "Tipo_Concreto", "Massa_Especifica"])
                # SEM DEDUPLICAR! A pedido do usuário, trazemos todas as massas para auditoria
                
                if not df_cleaned.empty:
                    st.session_state.massas_db = df_cleaned
                    st.sidebar.success(f"✅ Base de Massas atualizada! {len(df_cleaned)} registros ativos.")
                else:
                     st.sidebar.error("⚠️ O arquivo continha dados inválidos.")
            else:
                st.sidebar.error("❌ O arquivo não possui as colunas necessárias.")
        except Exception as e:
            st.sidebar.error(f"❌ Erro ao ler arquivo: {str(e)}")

st.sidebar.markdown("---")
st.sidebar.markdown("#### ⚖️ Massa Específica Ativa")
st.sidebar.dataframe(st.session_state.massas_db, use_container_width=True, hide_index=True)

if st.sidebar.button("Restaurar Padrões"):
    st.session_state.massas_db = load_initial_masses()
    st.sidebar.info("Valores padrões restaurados.")
    st.rerun()

# FORMULÁRIO DE CÁLCULO
col1, col2 = st.columns([2, 1])

with col1:
    st.markdown("### 🧾 Formulário de Recepção")
    with st.form("form_calculadora"):
        f_col1, f_col2 = st.columns(2)
        with f_col1:
            num_nf = st.text_input("Número da Nota Fiscal (NF):", placeholder="Ex: 004829")
            concreteira = st.selectbox("Concreteira (Fornecedor):", options=sorted(list(st.session_state.massas_db["Concreteira"].unique())))
            tipo_concreto = st.selectbox("Tipo de Concreto:", options=sorted(list(st.session_state.massas_db[st.session_state.massas_db["Concreteira"] == concreteira]["Tipo_Concreto"].unique())))
        with f_col2:
            peso_entrada = st.number_input("Peso Entrada (kg):", min_value=0.0, step=10.0)
            peso_saida = st.number_input("Peso Saída (kg):", min_value=0.0, step=10.0)
            volume_nf = st.number_input("Volume da Nota Fiscal (m³):", min_value=0.01, step=0.1)
        
        btn_calcular = st.form_submit_button("⚖️ Calcular e Validar Recebimento")

    if btn_calcular:
        if not num_nf.strip():
            st.error("⚠️ O número da Nota Fiscal é obrigatório.")
        elif peso_entrada <= peso_saida:
            st.error("⚠️ Peso de Entrada deve ser maior que o Peso de Saída.")
        else:
            reg_massa = st.session_state.massas_db[
                (st.session_state.massas_db["Concreteira"] == concreteira) & 
                (st.session_state.massas_db["Tipo_Concreto"] == tipo_concreto)
            ].copy()
            if reg_massa.empty:
                st.error("❌ Massa específica não cadastrada para este fornecedor/composto.")
            else:
                # Ordenação cronológica pela coluna "Data"
                if "Data" in reg_massa.columns:
                    def parse_py_date(x):
                        try:
                            if isinstance(x, str) and '/' in x:
                                parts = x.split('/')
                                if len(parts) == 3:
                                    return pd.to_datetime(f"{parts[2]}-{parts[1]}-{parts[0]}")
                            return pd.to_datetime(x)
                        except Exception:
                            return pd.NaT
                    reg_massa["parsed_date"] = reg_massa["Data"].apply(parse_py_date)
                    reg_massa = reg_massa.sort_values(by="parsed_date", ascending=False, na_position="last")
                
                # Critério de desempate secundário pela ordem de linhas
                reg_massa = reg_massa.sort_index(ascending=False)
                
                most_recent_record = reg_massa.iloc[0]
                massa_esp = float(most_recent_record["Massa_Especifica"])
                massa_data = most_recent_record.get("Data", "-")
                massa_nf = most_recent_record.get("NF", "-")
                
                peso_liq = peso_entrada - peso_saida
                vol_calc = peso_liq / massa_esp
                diferenca = vol_calc - volume_nf
                var_perc = abs(diferenca / volume_nf) * 100
                status = "APROVADO" if var_perc <= 2.0 else "REJEITADO"
                
                salvar_registro(num_nf, concreteira, tipo_concreto, peso_entrada, peso_saida, volume_nf, vol_calc, var_perc, status, massa_esp)
                
                col_m1, col_m2, col_m3 = st.columns(3)
                col_m1.metric("Peso Líquido", f"{peso_liq:,.1f} kg")
                col_m2.metric("Vol. Calculado", f"{vol_calc:.3f} m³", delta=f"{diferenca:+.3f} m³")
                col_m3.metric("Massa Específica", f"{massa_esp:.1f} kg/m³")
                
                if massa_data != "-" or massa_nf != "-":
                    st.caption(f"Ref: {massa_data} | NF Ensaio: {massa_nf}")

                if status == "REJEITADO":
                    st.error(f"🔴 DIVERGÊNCIA CRÍTICA (Variação de {var_perc:.2f}%). Limite tolerado: 2.0%.")
                else:
                    st.success(f"🟢 RECEBIMENTO EM CONFORMIDADE (Variação de {var_perc:.2f}%).")

with col2:
    st.markdown("### 📝 Exemplo de Estrutura do Excel")
    st.info("Planilha com colunas obrigatórias: **Concreteira**, **Tipo_Concreto**, **Massa_Especifica**")
    example_df = pd.DataFrame([
        {"Concreteira": "POLIMIZ", "Tipo_Concreto": "Piso", "Massa_Especifica": 2380},
        {"Concreteira": "HIPERMIX", "Tipo_Concreto": "Estaca", "Massa_Especifica": 2400},
        {"Concreteira": "CONCRELUZ", "Tipo_Concreto": "Bloco", "Massa_Especifica": 2370}
    ])
    st.dataframe(example_df, use_container_width=True, hide_index=True)

# HISTÓRICO
st.markdown("---")
st.markdown("### 📊 Histórico de Auditorias de Concreto")
hist_df = obter_historico()
if not hist_df.empty:
    st.dataframe(hist_df, use_container_width=True, hide_index=True)
else:
    st.info("Nenhuma entrada auditada no momento.")
`;
