export interface TelefoneContato {
    telefone: string;
    qualificacao: string; // ex: "Pessoal", "Trabalho", "Recado"
    observacao?: string;
}

export interface EnderecoDetalhado {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    estado: string;
}

export interface DocumentoUpload {
    nome: string;
    url: string;
}
