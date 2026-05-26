# -*- coding: utf-8 -*-
"""
Controle de Recebimento de Concreto (Balística de Volume e Pesagem de Balança)
Autor: Engenheiro de Software Sênior especialista em Python e Streamlit

Este é o arquivo Python com a aplicação completa em Streamlit.
Funcionalidade: Validação e auditoria de volume de concreto comprado vs. entregue.
"""

import streamlit as st
import pandas as pd
import sqlite3
import os

# Configuração da página do Streamlit
st.set_page_config(
    page_title="Controle de Recebimento de Concreto",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CONFIGURAÇÃO E CRIAÇÃO DO BANCO DE DADOS (SQLite3) ---
DB_NAME = "controle_concreto.db"

def init_db():
    """Inicializa o banco de dados SQLite para salvar as entradas de concreto."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recebimentos (
            id INTEGER PRIMARY KEY AUTO_INCREMENT, -- SQLite usa AUTOINCREMENT ou apenas PRIMARY KEY
            num_nf TEXT NOT NULL,
            concreteira TEXT NOT NULL,
            tipo_concreto TEXT NOT NULL,
            peso_entrada REAL NOT NULL,
            peso_saida REAL NOT NULL,
            peso_liquido REAL NOT NULL,
            massa_especifica REAL NOT NULL,
            volume_nf REAL NOT NULL,
            volume_calculado REAL NOT NULL,
            diferenca_m3 REAL NOT NULL,
            variacao_percentual REAL NOT NULL,
            status TEXT NOT NULL,
            data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Correção para o dialeto do SQLite (PRIMARY KEY AUTOINCREMENT)
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
    """Insere um novo registro de recebimento no banco de dados SQLite."""
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
        st.error(f"Erro ao salvar registro no Banco de Dados: {e}")
        return False

def obter_historico():
    """Recupera todos os registros salvos em ordem decrescente."""
    try:
        conn = sqlite3.connect(DB_NAME)
        df = pd.read_sql_query("SELECT id as ID, num_nf as 'Nº NF', concreteira as Concreteira, tipo_concreto as 'Tipo Concreto', round(massa_especifica, 1) as 'Massa Esp. (kg/m³)', peso_entrada as 'Peso Entrada (kg)', peso_saida as 'Peso Saída (kg)', (peso_entrada - peso_saida) as 'Peso Líquido (kg)', volume_nf as 'Vol. NF (m³)', round(volume_calculado, 3) as 'Vol. Calc (m³)', round(variacao_percentual, 2) as 'Var. (%)', status as Status, data_registro as 'Data/Hora' FROM historico_recebimento ORDER BY id DESC", conn)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Erro ao ler histórico do SQLite: {e}")
        return pd.DataFrame()

def limpar_historico():
    """Apaga todos os registros salvos para fins de reset."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM historico_recebimento")
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Erro ao limpar histórico: {e}")
        return False


# --- GESTÃO DE MASSAS ESPECÍFICAS (VALORES PADREÕES) ---
# Tabela de referência padrão caso o usuário não envie arquivo Excel/CSV
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
    """Retorna o DataFrame de massas padrões."""
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

# Iniciar o estado da aplicação sobre as massas específicas ativas
if "massas_db" not in st.session_state:
    st.session_state.massas_db = load_initial_masses()


# --- INTERFACE FLUIDA DO STREAMLIT ---

# Cabeçalho Principal do Dashboard
st.markdown("""
<div style="background-color:#011E3A; padding:20px; border-radius:10px; margin-bottom:25px; border-left: 5px solid #00C2A0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <h1 style="color:#ffffff; margin:0; font-family:sans-serif; font-weight:900; letter-spacing:-1px;">
        FORTES <span style="color:#00C2A0; font-weight:300; font-size:24px; letter-spacing:2px;">ENGENHARIA</span>
    </h1>
    <p style="color:#cbd5e1; font-size:13px; margin:8px 0 0 0; font-family:sans-serif;">
        Módulo Fiscal de Auditoria & Balança — Controle e Conformidade Metrológica de Concreto Estrutural
    </p>
</div>
""", unsafe_allow_html=True)

# --- SIDEBAR: CONFIGURAÇÕES E GESTÃO DE MASSAS ESPECÍFICAS ---
st.sidebar.markdown("### ⚙️ Painel de Configurações")
st.sidebar.write("Gerencie a base de Massas Específicas dos compostos de concreto.")

# Seção de Upload
with st.sidebar.expander("📁 Carregar Base de Massas (CSV / Excel)", expanded=True):
    uploaded_file = st.sidebar.file_uploader(
        "Selecione o arquivo:",
        type=["xlsx", "csv"],
        help="O arquivo deve conter as colunas exatas: Concreteira, Tipo_Concreto, Massa_Especifica"
    )

    if uploaded_file is not None:
        try:
            # Identifica a extensão do arquivo e executa a leitura adequada
            if uploaded_file.name.endswith(".xlsx"):
                # Comentário explicativo: Lendo arquivo Excel via engine openpyxl do pandas
                df_uploaded = pd.read_excel(uploaded_file)
            else:
                # Comentário explicativo: Lendo arquivo CSV separado por vírgula ou ponto-e-vírgula
                try:
                    df_uploaded = pd.read_csv(uploaded_file, sep=";")
                except Exception:
                    df_uploaded = pd.read_csv(uploaded_file, sep=",")
            
            # Normalização de nomes de colunas (removendo acentos, espaços e uppercase)
            import unicodedata
            def normalizar_coluna(col):
                if not isinstance(col, str):
                    col = str(col)
                # Remove acentos e caracteres de marcação
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
                # Extrai as colunas obrigatórias e opcionais
                columns_to_keep = ["Concreteira", "Tipo_Concreto", "Massa_Especifica"]
                if "Data" in df_uploaded.columns:
                    columns_to_keep.append("Data")
                if "NF" in df_uploaded.columns:
                    columns_to_keep.append("NF")
                
                df_extracted = df_uploaded[columns_to_keep].copy()
                
                # Tratamento robusto para a Massa_Especifica
                def limpar_massa_esp(val):
                    try:
                        if pd.isna(val) or val == "":
                            return None
                        val_str = str(val).strip().replace(" ", "")
                        # Tratar formatos de pontos/vírgulas do Excel PT-BR/EN-US
                        if "," in val_str and "." in val_str:
                            if val_str.rfind(",") > val_str.rfind("."):
                                val_str = val_str.replace(".", "").replace(",", ".")
                            else:
                                val_str = val_str.replace(",", "")
                        elif "," in val_str:
                            val_str = val_str.replace(",", ".")
                        
                        num = float(val_str)
                        # Se for digitado como 2.404 ou 2,404, multiplica por 1000 para kg/m³
                        if num < 10.0:
                            num = num * 1000.0
                        return num
                    except Exception:
                        return None

                df_extracted["Massa_Especifica"] = df_extracted["Massa_Especifica"].apply(limpar_massa_esp)
                
                # Padronizar nomes de Concreteira e Tipo de concreto
                df_extracted["Concreteira"] = df_extracted["Concreteira"].astype(str).str.strip().str.upper()
                df_extracted["Tipo_Concreto"] = df_extracted["Tipo_Concreto"].astype(str).str.strip().str.title()
                
                # Preencher opcionais vazios
                if "Data" in df_extracted.columns:
                    df_extracted["Data"] = df_extracted["Data"].fillna("-").astype(str).str.strip()
                else:
                    df_extracted["Data"] = "Importado"
                    
                if "NF" in df_extracted.columns:
                    df_extracted["NF"] = df_extracted["NF"].fillna("-").astype(str).str.strip()
                else:
                    df_extracted["NF"] = "-"

                # Dropar nulos de calibração obrigatória
                df_cleaned = df_extracted.dropna(subset=["Concreteira", "Tipo_Concreto", "Massa_Especifica"])
                
                # SEM DEDUPLICAR! A pedido do usuário, trazemos todas as massas para conferência
                # df_cleaned = df_cleaned.drop_duplicates(subset=["Concreteira", "Tipo_Concreto"])
                
                if not df_cleaned.empty:
                    st.session_state.massas_db = df_cleaned
                    st.sidebar.success(f"✅ Base de Massas atualizada! {len(df_cleaned)} registros e ensaios ativos.")
                else:
                    st.sidebar.error("⚠️ O arquivo carregado não continha linhas ou dados válidos de concreto.")
            else:
                st.sidebar.error("❌ Cabeçalhos incorretos! O Excel deve conter pelo menos as colunas: 'CONCRETEIRA', 'TIPO DE CONCRETO' e 'MASSA ESPECÍFICA'.")
        except Exception as e:
            st.sidebar.error(f"❌ Erro ao ler arquivo: {str(e)}")

# Exibir a Tabela de Massa Específica Ativa para consulta rápida
st.sidebar.markdown("---")
st.sidebar.markdown("#### ⚖️ Massa Específica Ativa")
st.sidebar.write("Referência atual em kg/m³:")
st.sidebar.dataframe(
    st.session_state.massas_db,
    use_container_width=True,
    hide_index=True
)

if st.sidebar.button("🧹 Restaurar Massas Padrão", use_container_width=True):
    st.session_state.massas_db = load_initial_masses()
    st.sidebar.info("Valores de fábrica restaurados.")
    st.rerun()


# --- CORPO PRINCIPAL DO SISTEMA ---

col1, col2 = st.columns([2, 1])

with col1:
    st.markdown("### 🧾 Formulário de Recepção")
    st.write("Insira os dados da Nota Fiscal e as medições de balança do caminhão betoneira.")

    # Formulário principal
    with st.form("form_calculadora", clear_on_submit=False):
        f_col1, f_col2 = st.columns(2)
        
        with f_col1:
            num_nf = st.text_input("Número da Nota Fiscal (NF):", placeholder="Ex: 004829")
            
            # Buscar as concreteiras disponíveis na base ativa para dinamismo, recaindo no padrão se necessário
            concreteiras_disponiveis = sorted(list(st.session_state.massas_db["Concreteira"].unique()))
            if not concreteiras_disponiveis:
                concreteiras_disponiveis = ["POLIMIZ", "HIPERMIX", "CONCRELUZ"]
            
            concreteira = st.selectbox(
                "Concreteira (Fornecedor):",
                options=concreteiras_disponiveis,
                index=0
            )

            # Buscar os tipos de concreto disponíveis para esta concreteira
            tipos_disponiveis = sorted(list(
                st.session_state.massas_db[st.session_state.massas_db["Concreteira"] == concreteira]["Tipo_Concreto"].unique()
            ))
            if not tipos_disponiveis:
                tipos_disponiveis = ["Estaca", "Bloco", "Piso", "Piso com Fibra"]

            tipo_concreto = st.selectbox(
                "Tipo de Concreto:",
                options=tipos_disponiveis
            )

        with f_col2:
            peso_entrada = st.number_input(
                "Peso Entrada (Balão+Concreto+Água) - kg:",
                min_value=0.0,
                step=10.0,
                format="%.1f",
                help="Peso total medido quando o caminhão chega à obra."
            )
            peso_saida = st.number_input(
                "Peso Saída (Caminhão Vazio+Sobras) - kg:",
                min_value=0.0,
                step=10.0,
                format="%.1f",
                help="Peso medido após a descarga do concreto."
            )
            volume_nf = st.number_input(
                "Volume da Nota Fiscal (m³):",
                min_value=0.01,
                step=0.1,
                format="%.2f",
                help="Volume total faturado expresso na Nota Fiscal."
            )

        btn_calcular = st.form_submit_state = st.form_submit_button("⚖️ Calcular e Validar Recebimento", use_container_width=True)

    # Lógica de cálculo técnica pós submissão do formulário
    if btn_calcular:
        # Tratamento de Erros e Validações Prévias
        if not num_nf.strip():
            st.error("⚠️ O número da Nota Fiscal é obrigatório para registrar a entrada.")
        elif peso_entrada <= 0 or peso_saida <= 0:
            st.error("⚠️ Os pesos de entrada e saída devem ser maiores que zero.")
        elif peso_entrada <= peso_saida:
            st.error("⚠️ O peso de entrada deve ser maior que o peso de saída (Peso Líquido deve ser positivo).")
        elif volume_nf <= 0:
            st.error("⚠️ O volume da Nota Fiscal deve ser maior que zero.")
        else:
            # Obtenção da Massa Específica correspondente
            registro_massa = st.session_state.massas_db[
                (st.session_state.massas_db["Concreteira"] == concreteira) & 
                (st.session_state.massas_db["Tipo_Concreto"] == tipo_concreto)
            ].copy()
            
            if registro_massa.empty:
                st.error(f"❌ Não foi encontrada Massa Específica cadastrada para {concreteira} - {tipo_concreto}. Cadastre ou atualize a base na barra lateral.")
            else:
                # Ordenação cronológica considerando a coluna "Data"
                if "Data" in registro_massa.columns:
                    def parse_py_date(x):
                        try:
                            if isinstance(x, str) and '/' in x:
                                parts = x.split('/')
                                if len(parts) == 3:
                                    return pd.to_datetime(f"{parts[2]}-{parts[1]}-{parts[0]}")
                            return pd.to_datetime(x)
                        except Exception:
                            return pd.NaT
                    
                    registro_massa["parsed_date"] = registro_massa["Data"].apply(parse_py_date)
                    registro_massa = registro_massa.sort_values(by="parsed_date", ascending=False, na_position="last")
                
                # Desempate secundário pela ordem do arquivo (índice maior = inserção mais recente)
                registro_massa = registro_massa.sort_index(ascending=False)
                
                most_recent_record = registro_massa.iloc[0]
                massa_especifica = float(most_recent_record["Massa_Especifica"])
                massa_data = most_recent_record.get("Data", "-")
                massa_nf = most_recent_record.get("NF", "-")
                
                # Tratamento de erro para divisão por zero preventiva
                if massa_especifica <= 0:
                    st.error("❌ A massa específica cadastrada deve ser maior que zero. Operação abortada para evitar erro matemático.")
                else:
                    # CÁLCULOS TÉCNICOS
                    peso_liquido = peso_entrada - peso_saida
                    
                    # Lógica solicitada: Volume_Calculado = Peso Líquido / Massa_Especifica
                    volume_calculado = peso_liquido / massa_especifica
                    
                    # Diferença aritmética e variação percentual
                    diferenca_m3 = volume_calculado - volume_nf
                    
                    # Variação em relação ao cobrado na Nota Fiscal
                    # variação% = abs((Volume_Calculado - Volume_NF) / Volume_NF) * 100
                    variacao_percentual = abs((volume_calculado - volume_nf) / volume_nf) * 100
                    
                    # Status e Alertas Visuais com Regra Crítica de Negócio (> 2%)
                    status_aprovacao = "APROVADO" if variacao_percentual <= 2.0 else "REJEITADO"
                    
                    # Salva no histórico SQLite
                    db_salvo = salvar_registro(
                        num_nf, concreteira, tipo_concreto, 
                        peso_entrada, peso_saida, volume_nf, 
                        volume_calculado, variacao_percentual, status_aprovacao,
                        massa_especifica
                    )

                    # Exposição de Métricas na tela
                    col_m1, col_m2, col_m3 = st.columns(3)
                    col_m1.metric("Peso Líquido Aferido", f"{peso_liquido:,.1f} kg")
                    col_m2.metric("Volume Calculado", f"{volume_calculado:.3f} m³", delta=f"{diferenca_m3:+.3f} m³")
                    col_m3.metric("Massa Específica Usada", f"{massa_especifica:.1f} kg/m³")
                    
                    if massa_data != "-" or massa_nf != "-":
                        ref_info = []
                        if massa_data != "-" and massa_data != "Padrão":
                            ref_info.append(f"Data Base: {massa_data}")
                        if massa_nf != "-":
                            ref_info.append(f"NF Ensaio: {massa_nf}")
                        
                        if ref_info:
                            st.caption(f"ℹ️ Referência do Ensaio utilizado: {' | '.join(ref_info)}")

                    # Alerta Visual do Status
                    if status_aprovacao == "REJEITADO":
                        st.error(f"""
                        ### 🔴 ALERTA DE DIVERGÊNCIA CRÍTICA (Variação de {variacao_percentual:.2f}%)
                        **Volume NF:** {volume_nf:.2f} m³ | **Volume Calculado:** {volume_calculado:.3f} m³
                        
                        ⚠️ A variação excedeu o limite máximo tolerado de **2.00%**. 
                        Diferença desfavorável estimada de **{abs(diferenca_m3):.3f} m³** no caminhão da NF {num_nf}.
                        Recomenda-se contestar a entrega ou renegociar o volume faturado junto à concreteira **{concreteira}**.
                        """)
                    else:
                        st.success(f"""
                        ### 🟢 RECEBIMENTO EM CONFORMIDADE (Variação de {variacao_percentual:.2f}%)
                        **Volume NF:** {volume_nf:.2f} m³ | **Volume Calculado:** {volume_calculado:.3f} m³
                        
                        A variação está dentro da tolerância técnica estabelecida (≤ 2.00%). A carga da NF {num_nf} foi aprovada para aplicação.
                        """)


with col2:
    st.markdown("### 📝 Instruções de Uso & Guia")
    
    st.info("""
    **Como formatar o arquivo Excel para upload:**
    Para que o sistema leia sua base de massa específica dinamicamente, crie uma planilha Excel (`.xlsx`) ou CSV com exatamente 3 colunas, sem acentos nos cabeçalhos:
    
    1. **Concreteira**: Nome comercial do fornecedor (ex: POLIMIZ, HIPERMIX, CONCRELUZ)
    2. **Tipo_Concreto**: Tipo de composto (ex: Estaca, Bloco, Piso, Piso com Fibra)
    3. **Massa_Especifica**: Valor numérico em kg/m³ (ex: 2400 ou 2380)

    *Dica: Você pode baixar sua planilha atualizada na barra lateral e o aplicativo mudará dinamicamente as opções do formulário.*
    """)
    
    # Exibir exemplo visual de formatação
    example_df = pd.DataFrame([
        {"Concreteira": "POLIMIZ", "Tipo_Concreto": "Piso", "Massa_Especifica": 2380},
        {"Concreteira": "HIPERMIX", "Tipo_Concreto": "Estaca", "Massa_Especifica": 2400},
        {"Concreteira": "CONCRELUZ", "Tipo_Concreto": "Bloco", "Massa_Especifica": 2370}
    ])
    st.write("**Exemplo de Estrutura do Excel:**")
    st.dataframe(example_df, use_container_width=True, hide_index=True)


# --- SEÇÃO DE HISTÓRICO & AUDITORIA (SLITE3) ---
st.markdown("---")
st.markdown("### 📊 Histórico de Auditorias de Concreto")
st.write("Abaixo estão listadas todas as notas fiscais recebidas, calculadas e salvas de forma persistente no banco de dados SQLite local.")

# Carregar o histórico atualizado
historico_df = obter_historico()

if not historico_df.empty:
    
    # Adicionar formatação visual para a tabela de histórico (destacando rejeitado vs aprovado se possível)
    def highlight_status(val):
        color = 'background-color: #fca5a5; color: #7f1d1d' if val == 'REJEITADO' else 'background-color: #bbf7d0; color: #14532d'
        return color
        
    try:
        styled_df = historico_df.style.applymap(highlight_status, subset=['Status'])
        st.dataframe(styled_df, use_container_width=True, hide_index=True)
    except Exception:
        # Fallback se a formatação estilo falhar por versão do pandas
        st.dataframe(historico_df, use_container_width=True, hide_index=True)

    # Opção para reiniciar banco nos testes
    if st.button("🚨 Limpar Todo o Histórico (Reset)", type="secondary"):
        if limpar_historico():
            st.success("Histórico limpo com sucesso! Recarregando página...")
            st.rerun()
else:
    st.info("Nenhum registro de recebimento foi efetuado no banco de dados SQLite até o momento.")


# --- DOCUMENTAÇÃO PARA IMPLANTAÇÃO E PASSO A PASSO ---
st.markdown("---")
with st.expander("🛠️ Guia de Instalação e Execução Local para Desenvolvimento"):
    st.subheader("Passo a Passo para rodar este Dashboard no seu computador:")
    st.markdown("""
    1. **Instale o Python** (versão 3.9 ou superior recomendada) no seu computador.
    2. **Instale as dependências** requeridas executando o comando abaixo no terminal ou prompt de comando (CMD):
       ```bash
       pip install streamlit pandas openpyxl
       ```
    3. **Crie um arquivo** no seu computador chamado `app.py` e cole todo este código contido no arquivo.
    4. **Como criar seu arquivo Excel de exemplo (.xlsx) no Excel ou Planilhas Google:**
       - Abra uma planilha em branco.
       - Na linha 1, digite exatamente os cabeçalhos:
         - Célula `A1`: `Concreteira`
         - Célula `B1`: `Tipo_Concreto`
         - Célula `C1`: `Massa_Especifica`
       - Adicione algumas linhas de teste abaixo, por exemplo:
         * Linha 2: `POLIMIZ` | `Piso` | `2380`
         * Linha 3: `HIPERMIX` | `Estaca` | `2400`
         * Linha 4: `CONCRELUZ` | `Bloco` | `2350`
       - Salve o arquivo como `massas.xlsx`. No Streamlit, faça o upload desse arquivo na barra lateral.
    5. **Execute o Dashboard da sua máquina** digitando o seguinte comando no mesmo diretório em que salvou o arquivo:
       ```bash
       streamlit run app.py
       ```
    6. O seu navegador abrirá automaticamente o link `http://localhost:8501` contendo a aplicação ativa de recebimento de concreto!
    """)
