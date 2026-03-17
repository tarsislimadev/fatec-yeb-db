-- Criação da tabela de empresas para validação
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    razao_social TEXT,
    nome_fantasia TEXT,
    situacao TEXT,
    data_abertura TEXT,
    telefone TEXT,
    email TEXT,
    contatos_validados JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de dados de exemplo para teste do crawler
INSERT INTO companies (cnpj, razao_social) VALUES 
('00.000.000/0001-91', 'BANCO DO BRASIL SA'),
('33.535.457/0001-48', 'PORTO SEGURO COMPANHIA DE SEGUROS GERAIS')
ON CONFLICT (cnpj) DO NOTHING;
