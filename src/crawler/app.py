import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import spacy
import nltk
from typing import Dict, List, Optional, Any
import time
import logging
import re
import os
from urllib.parse import quote
from sqlalchemy import create_engine, Column, String, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# Configuração de Logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuração do Banco de Dados
Base = declarative_base()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True)
    cnpj = Column(String, unique=True, nullable=False)
    razao_social = Column(String)
    nome_fantasia = Column(String)
    situacao = Column(String)
    data_abertura = Column(String)
    telefone = Column(String)
    email = Column(String)
    contatos_validados = Column(JSON) # Lista de contatos encontrados pela IA
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class DataCleaner:
    @staticmethod
    def clean_cnpj(cnpj: str) -> str:
        return re.sub(r'\D', '', cnpj)

    @staticmethod
    def clean_phone(phone: str) -> str:
        return re.sub(r'\D', '', phone)

class NLPProcessor:
    def __init__(self):
        try:
            self.nlp = spacy.load("pt_core_news_sm")
            logger.info("Modelo spaCy 'pt_core_news_sm' carregado com sucesso.")
        except Exception as e:
            logger.warning(f"Erro ao carregar spaCy: {e}. Funcionalidades de NLP estarão limitadas.")
            self.nlp = None

    def extract_contacts(self, text: str) -> Dict[str, List[str]]:
        contacts = {
            "names": [],
            "emails": list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))),
            "phones": list(set(re.findall(r'\+?\d{2,3}?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}', text))),
        }

        if self.nlp and text:
            doc = self.nlp(text[:1000000]) # Cap text for spaCy
            for ent in doc.ents:
                if ent.label_ == "PER":
                    contacts["names"].append(ent.text)
            contacts["names"] = list(set(contacts["names"]))

        return contacts

class AIAssistant:
    def __init__(self, model_name: str = "llama3"):
        self.model_name = model_name
        self.base_url = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        try:
            self.llm = Ollama(model=model_name, base_url=self.base_url)
            self.parser = JsonOutputParser()
            logger.info(f"Ollama AI Assistant inicializado ({model_name}) em {self.base_url}")
            self._ensure_model_exists()
        except Exception as e:
            logger.warning(f"Erro ao inicializar Ollama: {e}")
            self.llm = None

    def _ensure_model_exists(self):
        """Verifica se o modelo existe no Ollama e tenta baixar se necessário."""
        try:
            logger.info(f"Verificando presença do modelo '{self.model_name}'...")
            check_url = f"{self.base_url}/api/tags"
            response = requests.get(check_url, timeout=5)
            if response.status_code == 200:
                models = [m['name'] for m in response.json().get('models', [])]
                if not any(self.model_name in m for m in models):
                    logger.info(f"Modelo '{self.model_name}' não encontrado. Iniciando download (pull)...")
                    pull_url = f"{self.base_url}/api/pull"
                    # Pull assíncrono seria melhor, mas aqui faremos um bloqueio inicial simples
                    requests.post(pull_url, json={"name": self.model_name}, timeout=5)
            else:
                logger.warning(f"Não foi possível verificar modelos no Ollama (Status {response.status_code})")
        except Exception as e:
            logger.error(f"Erro ao verificar/baixar modelo Ollama: {e}")

    def analyze_web_content(self, content: str, required_roles: List[str]) -> Dict:
        if not self.llm:
            return {"contatos": []}

        prompt = ChatPromptTemplate.from_template(
            "Você é um assistente especializado em extração de dados corporativos.\n"
            "Analise o seguinte conteúdo extraído e encontre informações sobre as pessoas nos cargos: {roles}.\n"
            "Importante: Extraia Nome, Email, Telefone e Cargo.\n"
            "Retorne APENAS um JSON com o formato: "
            "{{\"contatos\": [{{'nome': '...', 'email': '...', 'telefone': '...', 'cargo': '...'}}]}}\n"
            "Se não encontrar nada, retorne {{\"contatos\": []}}.\n"
            "Conteúdo:\n{content}"
        )

        chain = prompt | self.llm | self.parser
        
        try:
            truncated_content = content[:5000] 
            response = chain.invoke({"roles": ", ".join(required_roles), "content": truncated_content})
            return response if isinstance(response, dict) else {"contatos": []}
        except Exception as e:
            logger.error(f"Erro ao processar com IA: {e}")
            return {"contatos": []}

class CompanyCrawler:
    def __init__(self, db_url: str):
        self.session_web = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.nlp_processor = NLPProcessor()
        self.cleaner = DataCleaner()
        self.ai_assistant = AIAssistant()
        
        # Database setup with retry
        self._init_db(db_url)

    def _init_db(self, db_url: str, retries: int = 5):
        while retries > 0:
            try:
                self.engine = create_engine(db_url)
                Base.metadata.create_all(self.engine)
                self.SessionLocal = sessionmaker(bind=self.engine)
                logger.info("Conexão com o banco de dados estabelecida.")
                return
            except Exception as e:
                logger.warning(f"Erro ao conectar ao banco. Tentativas restantes: {retries}. Erro: {e}")
                retries -= 1
                time.sleep(5)
        raise Exception("Não foi possível conectar ao banco de dados após várias tentativas.")

    def fetch_cnpj_biz(self, cnpj: str) -> Optional[Dict]:
        clean_cnpj = self.cleaner.clean_cnpj(cnpj)
        url = f"https://cnpj.biz/{clean_cnpj}"
        
        try:
            logger.info(f"Acessando CNPJ Biz: {url}")
            response = self.session_web.get(url, headers=self.headers, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # CNPJ Biz structure fix: look for text within paragraph or spans
                data = {
                    'cnpj': cnpj,
                    'razao_social': self._extract_by_text(soup, "Razão Social"),
                    'nome_fantasia': self._extract_by_text(soup, "Nome Fantasia"),
                    'situacao': self._extract_by_text(soup, "Situação"),
                    'data_abertura': self._extract_by_text(soup, "Data de Abertura"),
                    'telefone': self._extract_by_text(soup, "Telefone"),
                    'email': self._extract_by_text(soup, "E-mail"),
                }
                
                page_text = soup.get_text(separator=' ')
                nlp_contacts = self.nlp_processor.extract_contacts(page_text)
                data['raw_names'] = nlp_contacts['names']
                data['raw_emails'] = nlp_contacts['emails']
                
                return data
            else:
                logger.error(f"Erro {response.status_code} ao acessar {url}")
                return None
        except Exception as e:
            logger.error(f"Falha na requisição para {cnpj}: {e}")
            return None

    def _extract_by_text(self, soup: BeautifulSoup, label: str) -> str:
        # Tenta encontrar o texto do label em b, strong ou span
        element = soup.find(lambda tag: tag.name in ['b', 'strong', 'span'] and label in tag.text)
        if element:
            # O valor geralmente está no próximo elemento ou no texto seguinte do pai
            text = element.parent.get_text(strip=True)
            if ":" in text:
                return text.split(":", 1)[1].strip()
        return "Não encontrado"

    def save_to_db(self, data: Dict):
        session = self.SessionLocal()
        try:
            company = session.query(Company).filter(Company.cnpj == data['cnpj']).first()
            if not company:
                company = Company(cnpj=data['cnpj'])
            
            company.razao_social = data.get('razao_social')
            company.nome_fantasia = data.get('nome_fantasia')
            company.situacao = data.get('situacao')
            company.data_abertura = data.get('data_abertura')
            company.telefone = data.get('telefone')
            company.email = data.get('email')
            company.contatos_validados = data.get('contatos_validados', [])
            company.updated_at = datetime.datetime.utcnow()
            
            session.add(company)
            session.commit()
            logger.info(f"Dados salvos no banco para CNPJ: {data['cnpj']}")
        except Exception as e:
            logger.error(f"Erro ao salvar no banco: {e}")
            session.rollback()
        finally:
            session.close()

    def get_cnpjs_to_validate(self, limit: int = 10) -> List[str]:
        session = self.SessionLocal()
        try:
            # Busca empresas que ainda não foram validadas ou cuja última validação é antiga
            companies = session.query(Company).filter(Company.situacao == None).limit(limit).all()
            return [c.cnpj for c in companies]
        except Exception as e:
            logger.error(f"Erro ao buscar CNPJs no banco: {e}")
            return []
        finally:
            session.close()

    def process_companies(self, cnpj_list: List[str] = None, target_roles: List[str] = None):
        if cnpj_list is None:
            cnpj_list = self.get_cnpjs_to_validate()
            
        if not cnpj_list:
            logger.info("Nenhum CNPJ pendente para validação encontrado no banco.")
            return pd.DataFrame()

        if target_roles is None:
            target_roles = ["Diretor", "Gerente Commercial", "SDR", "MDR", "CEO"]

        results = []
        for cnpj in cnpj_list:
            data = self.fetch_cnpj_biz(cnpj)
            
            if data:
                logger.info(f"Processando com IA: {data.get('razao_social', cnpj)}")
                
                content_for_ai = f"Empresa: {data.get('razao_social')}. Contatos sugeridos: {', '.join(data.get('raw_names', []))}. Emails: {', '.join(data.get('raw_emails', []))}"
                
                ai_results = self.ai_assistant.analyze_web_content(content_for_ai, target_roles)
                data['contatos_validados'] = ai_results.get('contatos', [])
                
                self.save_to_db(data)
                results.append(data)
            
            time.sleep(2)
            
        return pd.DataFrame(results)

def main():
    crawler = CompanyCrawler(DATABASE_URL)
    
    logger.info("Iniciando Crawler de Validação...")
    # Processa as empresas pendentes no banco
    df = crawler.process_companies()
    
    if not df.empty:
        logger.info(f"Processamento concluído. {len(df)} empresas validadas.")
    else:
        logger.warning("Nenhuma execução necessária ou erro na coleta.")

if __name__ == "__main__":
    main()
