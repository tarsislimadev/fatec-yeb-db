import os
import re
import time
import logging
import datetime
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any

import requests
import pandas as pd
from sqlalchemy import create_engine, Column, String, Integer, JSON, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Database Base ---
Base = declarative_base()


# --- Entities / Models ---
class CompanyModel(Base):
    """
    SQLAlchemy ORM Model representing a Company entity.
    """
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True)
    cnpj = Column(String, unique=True, nullable=False)
    razao_social = Column(String)
    nome_fantasia = Column(String)
    situacao = Column(String)
    data_abertura = Column(String)
    telefone = Column(String)
    email = Column(String)
    contatos_validados = Column(JSON)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


# --- Interfaces (DIP & ISP) ---
class ICompanyRepository(ABC):
    """Interface for Company Repository (Repository Design Pattern)."""
    
    @abstractmethod
    def get_cnpjs_to_validate(self, limit: int) -> List[str]:
        pass

    @abstractmethod
    def save_or_update(self, data: Dict[str, Any]) -> None:
        pass


class IApiClient(ABC):
    """Interface for an API Client (Dependency Inversion)."""
    
    @abstractmethod
    def fetch_company_data(self, identifier: str) -> Optional[Dict[str, Any]]:
        pass


class ILlmAssistant(ABC):
    """Interface for LLM-based Web Content Analysis."""
    
    @abstractmethod
    def analyze_web_content(self, content: str, required_roles: List[str]) -> Dict[str, Any]:
        pass


# --- Infrastructure / Implementations ---
class DbCompanyRepository(ICompanyRepository):
    """Concrete implementation of ICompanyRepository using SQLAlchemy."""
    
    def __init__(self, db_url: str):
        self._init_db(db_url)

    def _init_db(self, db_url: str, retries: int = 5) -> None:
        while retries > 0:
            try:
                self.engine = create_engine(db_url)
                Base.metadata.create_all(self.engine)
                self.SessionLocal = sessionmaker(bind=self.engine)
                logger.info("Database connection established successfully.")
                return
            except Exception as e:
                logger.warning(
                    f"DB connection error. Retries left: {retries}. Error: {e}"
                )
                retries -= 1
                time.sleep(5)
        raise ConnectionError("Could not connect to database after multiple attempts.")

    def get_cnpjs_to_validate(self, limit: int = 10) -> List[str]:
        with self.SessionLocal() as session:
            try:
                companies = session.query(CompanyModel).filter(
                    CompanyModel.situacao.is_(None)
                ).limit(limit).all()
                return [c.cnpj for c in companies]
            except Exception as e:
                logger.error(f"Error fetching CNPJs from database: {e}")
                return []

    def save_or_update(self, data: Dict[str, Any]) -> None:
        with self.SessionLocal() as session:
            try:
                company = session.query(CompanyModel).filter(
                    CompanyModel.cnpj == data['cnpj']
                ).first()
                if not company:
                    company = CompanyModel(cnpj=data['cnpj'])
                
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
                logger.info(f"Data saved to database for CNPJ: {data['cnpj']}")
            except Exception as e:
                logger.error(f"Error saving data to database: {e}")
                session.rollback()


class Utils:
    """Utility class for string cleaning (Single Responsibility)."""
    
    @staticmethod
    def clean_cnpj(cnpj: str) -> str:
        return re.sub(r'\D', '', cnpj)

    @staticmethod
    def clean_phone(phone: str) -> str:
        return re.sub(r'\D', '', phone)


class BrasilApiClient(IApiClient):
    """Concrete implementation of IApiClient targeting BrasilAPI."""
    
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/91.0.4472.124 Safari/537.36'
            )
        }

    def fetch_company_data(self, identifier: str) -> Optional[Dict[str, Any]]:
        clean_cnpj = Utils.clean_cnpj(identifier)
        url = f"https://brasilapi.com.br/api/cnpj/v1/{clean_cnpj}"
        
        try:
            logger.info(f"Accessing Brasil API: {url}")
            response = self.session.get(url, headers=self.headers, timeout=15)
            
            if response.status_code == 200:
                json_data = response.json()
                data = {
                    'cnpj': identifier,
                    'razao_social': json_data.get('razao_social', 'Não encontrado'),
                    'nome_fantasia': json_data.get('nome_fantasia') or json_data.get('razao_social', 'Não encontrado'),
                    'situacao': json_data.get('descricao_situacao_cadastral', 'Não encontrado'),
                    'data_abertura': json_data.get('data_inicio_atividade', 'Não encontrado'),
                    'telefone': json_data.get('ddd_telefone_1') or json_data.get('ddd_telefone_2', 'Não encontrado'),
                    'email': json_data.get('email', 'Não encontrado'),
                    'raw_names': [],
                    'raw_emails': []
                }
                
                if data['email'] and data['email'] != 'Não encontrado':
                    data['raw_emails'].append(data['email'])
                
                qsa = json_data.get('qsa', [])
                if qsa:
                    data['raw_names'] = [
                        socio.get('nome_socio') for socio in qsa if socio.get('nome_socio')
                    ]
                
                return data

            if response.status_code == 400:
                logger.error(f"Error 400 when accessing {url}. Invalid CNPJ.")
            elif response.status_code == 404:
                logger.error(f"Error 404 when accessing {url}. CNPJ not found.")
            else:
                logger.error(f"Error {response.status_code} when accessing {url}")

        except Exception as e:
            logger.error(f"Request failed for {identifier}: {e}")
            
        return None


class OllamaAssistant(ILlmAssistant):
    """Concrete implementation of ILlmAssistant using Ollama."""
    
    def __init__(self, model_name: str = "llama3", base_url: str = None):
        self.model_name = model_name
        self.base_url = base_url or os.getenv(
            "OLLAMA_HOST", "http://localhost:11434"
        )
        
        try:
            self.llm = Ollama(model=self.model_name, base_url=self.base_url)
            self.parser = JsonOutputParser()
            logger.info(
                f"Ollama AI Assistant initialized ({self.model_name}) at {self.base_url}"
            )
            self._ensure_model_exists()
        except Exception as e:
            logger.warning(f"Error initializing Ollama: {e}")
            self.llm = None

    def _ensure_model_exists(self) -> None:
        """Verifies if the model exists in Ollama and pulls if necessary."""
        try:
            logger.info(f"Checking presence of model '{self.model_name}'...")
            check_url = f"{self.base_url}/api/tags"
            response = requests.get(check_url, timeout=5)
            
            if response.status_code == 200:
                models = [m['name'] for m in response.json().get('models', [])]
                if not any(self.model_name in m for m in models):
                    logger.info(
                        f"Model '{self.model_name}' not found. "
                        "Initiating download (pull) - this may take minutes..."
                    )
                    pull_url = f"{self.base_url}/api/pull"
                    requests.post(
                        pull_url, json={"name": self.model_name}, timeout=600
                    )
            else:
                logger.warning(
                    f"Could not verify models in Ollama (Status {response.status_code})"
                )
        except Exception as e:
            logger.error(f"Error verifying/downloading Ollama model: {e}")

    def analyze_web_content(
        self, content: str, required_roles: List[str]
    ) -> Dict[str, Any]:
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
            response = chain.invoke({
                "roles": ", ".join(required_roles),
                "content": truncated_content
            })
            return response if isinstance(response, dict) else {"contatos": []}
        except Exception as e:
            logger.error(f"Error processing with AI: {e}")
            return {"contatos": []}


# --- Service (Application Logic Core) ---
class CompanyValidationService:
    """
    Application service that orchestrates crawling and validation behavior.
    Depends on abstractions (Interfaces) rather than concrete implementations.
    """
    
    def __init__(
        self,
        repository: ICompanyRepository,
        api_client: IApiClient,
        llm_assistant: ILlmAssistant
    ):
        self.repository = repository
        self.api_client = api_client
        self.llm_assistant = llm_assistant

    def run_validation(
        self, limit: int = 10, target_roles: Optional[List[str]] = None
    ) -> pd.DataFrame:
        target_roles = target_roles or ["Diretor", "Gerente Comercial", "SDR", "MDR", "CEO"]
        
        cnpj_list = self.repository.get_cnpjs_to_validate(limit)
        
        if not cnpj_list:
            logger.info("No pending CNPJs for validation found in database.")
            return pd.DataFrame()

        results = []
        for cnpj in cnpj_list:
            data = self.api_client.fetch_company_data(cnpj)
            
            if data:
                logger.info(f"Processing via AI: {data.get('razao_social', cnpj)}")
                
                content_for_ai = (
                    f"Empresa: {data.get('razao_social')}. "
                    f"Contatos sugeridos: {', '.join(data.get('raw_names', []))}. "
                    f"Emails: {', '.join(data.get('raw_emails', []))}"
                )
                
                ai_results = self.llm_assistant.analyze_web_content(content_for_ai, target_roles)
                data['contatos_validados'] = ai_results.get('contatos', [])
                
                self.repository.save_or_update(data)
                results.append(data)
            
            # Anti-bot rate-limiting delay
            time.sleep(5)
            
        return pd.DataFrame(results)


# --- Factory / Main Entrypoint (Dependency Injection composition root) ---
def main() -> None:
    logger.info("Inicializando Validation Crawler...")
    
    # Configuration Details
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    model_name = "llama3"
    
    # Instantiating dependencies (Dependency Injection)
    repository = DbCompanyRepository(db_url)
    api_client = BrasilApiClient()
    llm_assistant = OllamaAssistant(model_name=model_name)
    
    # Assembling the main service
    validation_service = CompanyValidationService(
        repository=repository,
        api_client=api_client,
        llm_assistant=llm_assistant
    )
    
    # Execute the service logic
    df_results = validation_service.run_validation()
    
    if not df_results.empty:
        logger.info(f"Processamento concluído. {len(df_results)} empresas validadas.")
    else:
        logger.warning("Nenhuma execução necessária ou erro na coleta.")


if __name__ == "__main__":
    main()
