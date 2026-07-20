import React from 'react';
import { User, Shield, Plus, X, Loader2, Check } from 'lucide-react';
import { formatCpfCnpj, formatPhone, formatBirthDate, formatRendaMensal } from '../../utils/formatters';

interface CadastroInquilinoFormProps {
  tenantNome: string;
  setTenantNome: (val: string) => void;
  tenantCpf: string;
  setTenantCpf: (val: string) => void;
  tenantEmail: string;
  setTenantEmail: (val: string) => void;
  tenantTelefonesList: { tipo: string; numero: string; observacao?: string }[];
  setTenantTelefonesList: React.Dispatch<React.SetStateAction<{ tipo: string; numero: string; observacao?: string }[]>>;
  tenantRg: string;
  setTenantRg: (val: string) => void;
  tenantOrgao: string;
  setTenantOrgao: (val: string) => void;
  tenantNacionalidade: string;
  setTenantNacionalidade: (val: string) => void;
  tenantProfissao: string;
  setTenantProfissao: (val: string) => void;
  tenantDataNasc: string;
  setTenantDataNasc: (val: string) => void;
  tenantRendaMensal: string;
  setTenantRendaMensal: (val: string) => void;
  tenantRne: string;
  setTenantRne: (val: string) => void;
  tenantEstadoCivil: string;
  setTenantEstadoCivil: (val: string) => void;
  tenantGenero: string;
  setTenantGenero: (val: string) => void;
  tenantCep: string;
  setTenantCep: (val: string) => void;
  tenantLogradouro: string;
  setTenantLogradouro: (val: string) => void;
  tenantNumero: string;
  setTenantNumero: (val: string) => void;
  tenantComplemento: string;
  setTenantComplemento: (val: string) => void;
  tenantBairro: string;
  setTenantBairro: (val: string) => void;
  tenantCidade: string;
  setTenantCidade: (val: string) => void;
  tenantEstado: string;
  setTenantEstado: (val: string) => void;

  // Cônjuge
  conjugeNome: string;
  setConjugeNome: (val: string) => void;
  conjugeCpf: string;
  setConjugeCpf: (val: string) => void;
  conjugeEmail: string;
  setConjugeEmail: (val: string) => void;
  conjugeRg: string;
  setConjugeRg: (val: string) => void;
  conjugeOrgao: string;
  setConjugeOrgao: (val: string) => void;
  conjugeDataNasc: string;
  setConjugeDataNasc: (val: string) => void;
  conjugeProfissao: string;
  setConjugeProfissao: (val: string) => void;
  conjugeRendaMensal: string;
  setConjugeRendaMensal: (val: string) => void;
  conjugeNacionalidade: string;
  setConjugeNacionalidade: (val: string) => void;
  conjugeRne: string;
  setConjugeRne: (val: string) => void;
  conjugeTelefonesList: { tipo: string; numero: string; observacao?: string }[];
  setConjugeTelefonesList: React.Dispatch<React.SetStateAction<{ tipo: string; numero: string; observacao?: string }[]>>;

  // Docs
  docPessoalUrl: string;
  setDocPessoalUrl: (val: string) => void;
  comprovanteResidenciaUrl: string;
  setComprovanteResidenciaUrl: (val: string) => void;
  holeriteConjugeUrl: string;
  setHoleriteConjugeUrl: (val: string) => void;
  holerite1NilsonUrl: string;
  setHolerite1NilsonUrl: (val: string) => void;
  holerite2NilsonUrl: string;
  setHolerite2NilsonUrl: (val: string) => void;

  // Fiador
  addFiador: boolean;
  setAddFiador: (val: boolean) => void;
  fiadorNome: string;
  setFiadorNome: (val: string) => void;
  fiadorCpf: string;
  setFiadorCpf: (val: string) => void;
  fiadorEmail: string;
  setFiadorEmail: (val: string) => void;
  fiadorTelefone: string;
  setFiadorTelefone: (val: string) => void;
  fiadorRg: string;
  setFiadorRg: (val: string) => void;
  fiadorOrgao: string;
  setFiadorOrgao: (val: string) => void;
  fiadorNacionalidade: string;
  setFiadorNacionalidade: (val: string) => void;
  fiadorProfissao: string;
  setFiadorProfissao: (val: string) => void;
  fiadorDataNasc: string;
  setFiadorDataNasc: (val: string) => void;
  fiadorEstadoCivil: string;
  setFiadorEstadoCivil: (val: string) => void;
  fiadorGenero: string;
  setFiadorGenero: (val: string) => void;
  fiadorCep: string;
  setFiadorCep: (val: string) => void;
  fiadorLogradouro: string;
  setFiadorLogradouro: (val: string) => void;
  fiadorNumero: string;
  setFiadorNumero: (val: string) => void;
  fiadorComplemento: string;
  setFiadorComplemento: (val: string) => void;
  fiadorBairro: string;
  setFiadorBairro: (val: string) => void;
  fiadorCidade: string;
  setFiadorCidade: (val: string) => void;
  fiadorEstado: string;
  setFiadorEstado: (val: string) => void;

  isSavingLocatario: boolean;
  handleCreateTenantAndFiador: (e: React.FormEvent) => void;
  setModalView: (view: 'MAIN' | 'CREATE_TENANT' | 'EDIT_TENANT' | 'EDIT_LANDLORD' | 'EDIT_PROPERTY') => void;
  isEditing?: boolean;
}

export function CadastroInquilinoForm({
  tenantNome,
  setTenantNome,
  tenantCpf,
  setTenantCpf,
  tenantEmail,
  setTenantEmail,
  tenantTelefonesList,
  setTenantTelefonesList,
  tenantRg,
  setTenantRg,
  tenantOrgao,
  setTenantOrgao,
  tenantNacionalidade,
  setTenantNacionalidade,
  tenantProfissao,
  setTenantProfissao,
  tenantDataNasc,
  setTenantDataNasc,
  tenantRendaMensal,
  setTenantRendaMensal,
  tenantRne,
  setTenantRne,
  tenantEstadoCivil,
  setTenantEstadoCivil,
  tenantGenero,
  setTenantGenero,
  tenantCep,
  setTenantCep,
  tenantLogradouro,
  setTenantLogradouro,
  tenantNumero,
  setTenantNumero,
  tenantComplemento,
  setTenantComplemento,
  tenantBairro,
  setTenantBairro,
  tenantCidade,
  setTenantCidade,
  tenantEstado,
  setTenantEstado,
  conjugeNome,
  setConjugeNome,
  conjugeCpf,
  setConjugeCpf,
  conjugeEmail,
  setConjugeEmail,
  conjugeRg,
  setConjugeRg,
  conjugeOrgao,
  setConjugeOrgao,
  conjugeDataNasc,
  setConjugeDataNasc,
  conjugeProfissao,
  setConjugeProfissao,
  conjugeRendaMensal,
  setConjugeRendaMensal,
  conjugeNacionalidade,
  setConjugeNacionalidade,
  conjugeRne,
  setConjugeRne,
  conjugeTelefonesList,
  setConjugeTelefonesList,
  docPessoalUrl,
  setDocPessoalUrl,
  comprovanteResidenciaUrl,
  setComprovanteResidenciaUrl,
  holeriteConjugeUrl,
  setHoleriteConjugeUrl,
  holerite1NilsonUrl,
  setHolerite1NilsonUrl,
  holerite2NilsonUrl,
  setHolerite2NilsonUrl,
  addFiador,
  setAddFiador,
  fiadorNome,
  setFiadorNome,
  fiadorCpf,
  setFiadorCpf,
  fiadorEmail,
  setFiadorEmail,
  fiadorTelefone,
  setFiadorTelefone,
  fiadorRg,
  setFiadorRg,
  fiadorOrgao,
  setFiadorOrgao,
  fiadorNacionalidade,
  setFiadorNacionalidade,
  fiadorProfissao,
  setFiadorProfissao,
  fiadorDataNasc,
  setFiadorDataNasc,
  fiadorEstadoCivil,
  setFiadorEstadoCivil,
  fiadorGenero,
  setFiadorGenero,
  fiadorCep,
  setFiadorCep,
  fiadorLogradouro,
  setFiadorLogradouro,
  fiadorNumero,
  setFiadorNumero,
  fiadorComplemento,
  setFiadorComplemento,
  fiadorBairro,
  setFiadorBairro,
  fiadorCidade,
  setFiadorCidade,
  fiadorEstado,
  setFiadorEstado,
  isSavingLocatario,
  handleCreateTenantAndFiador,
  setModalView,
  isEditing = false
}: CadastroInquilinoFormProps) {
  return (
    <form onSubmit={handleCreateTenantAndFiador} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1 flex items-center gap-1.5">
          <User className="w-4 h-4" />
          {isEditing ? 'Editar Inquilino (Locatário)' : 'Dados do Novo Inquilino (Locatário)'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome Completo *</label>
            <input
              type="text"
              required
              value={tenantNome}
              onChange={e => setTenantNome(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ *</label>
            <input
              type="text"
              required
              value={tenantCpf}
              onChange={e => setTenantCpf(formatCpfCnpj(e.target.value))}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail *</label>
            <input
              type="email"
              required
              value={tenantEmail}
              onChange={e => setTenantEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          
          {/* Múltiplos Telefones */}
          <div className="col-span-1 sm:col-span-3 space-y-2 bg-zinc-50/50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Telefones Locatário</label>
              <button
                type="button"
                onClick={() => setTenantTelefonesList(prev => [...prev, { tipo: 'celular', numero: '' }])}
                className="text-[10px] text-[#004777] font-semibold flex items-center gap-0.5 hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar Telefone
              </button>
            </div>
            <div className="space-y-2">
              {tenantTelefonesList.map((tel, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={tel.tipo}
                    onChange={e => {
                      const copy = [...tenantTelefonesList];
                      copy[idx].tipo = e.target.value;
                      setTenantTelefonesList(copy);
                    }}
                    className="border border-zinc-200 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="celular">Celular</option>
                    <option value="residencial">Fixo</option>
                    <option value="comercial">Comercial</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Telefone"
                    value={tel.numero}
                    onChange={e => {
                      const copy = [...tenantTelefonesList];
                      copy[idx].numero = formatPhone(e.target.value);
                      setTenantTelefonesList(copy);
                    }}
                    className="border border-zinc-200 rounded px-2 py-1 text-xs flex-1"
                  />
                  {tenantTelefonesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTenantTelefonesList(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">RG</label>
            <input
              type="text"
              value={tenantRg}
              onChange={e => setTenantRg(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Órgão Emissor</label>
            <input
              type="text"
              value={tenantOrgao}
              onChange={e => setTenantOrgao(e.target.value)}
              placeholder="Ex: SSP/SP"
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Nacionalidade</label>
            <input
              type="text"
              value={tenantNacionalidade}
              onChange={e => setTenantNacionalidade(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Profissão</label>
            <input
              type="text"
              value={tenantProfissao}
              onChange={e => setTenantProfissao(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
            <input
              type="text"
              value={tenantDataNasc}
              onChange={e => setTenantDataNasc(formatBirthDate(e.target.value))}
              placeholder="DD/MM/AAAA"
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Renda Mensal</label>
            <input
              type="text"
              value={tenantRendaMensal}
              onChange={e => setTenantRendaMensal(formatRendaMensal(e.target.value))}
              placeholder="R$ 0,00"
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">RNE</label>
            <input
              type="text"
              value={tenantRne}
              onChange={e => setTenantRne(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Estado Civil</label>
            <select
              value={tenantEstadoCivil}
              onChange={e => setTenantEstadoCivil(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
            >
              <option value="solteiro(a)">Solteiro(a)</option>
              <option value="casado(a)">Casado(a)</option>
              <option value="divorciado(a)">Divorciado(a)</option>
              <option value="viúvo(a)">Viúvo(a)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Gênero</label>
            <select
              value={tenantGenero}
              onChange={e => setTenantGenero(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* DADOS DO CÔNJUGE SE CASADO */}
      {tenantEstadoCivil.toLowerCase().includes('casado') && (
        <div className="space-y-4 pt-4 border-t border-dashed border-zinc-200 animate-fade-in">
          <h5 className="text-[11px] font-bold text-[#004777] uppercase tracking-wider">Dados do Cônjuge</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome do Cônjuge</label>
              <input
                type="text"
                value={conjugeNome}
                onChange={e => setConjugeNome(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">CPF do Cônjuge</label>
              <input
                type="text"
                value={conjugeCpf}
                onChange={e => setConjugeCpf(formatCpfCnpj(e.target.value))}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail do Cônjuge</label>
              <input
                type="email"
                value={conjugeEmail}
                onChange={e => setConjugeEmail(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">RG do Cônjuge</label>
              <input
                type="text"
                value={conjugeRg}
                onChange={e => setConjugeRg(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Órgão Emissor</label>
              <input
                type="text"
                value={conjugeOrgao}
                onChange={e => setConjugeOrgao(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
              <input
                type="text"
                value={conjugeDataNasc}
                onChange={e => setConjugeDataNasc(formatBirthDate(e.target.value))}
                placeholder="DD/MM/AAAA"
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Profissão</label>
              <input
                type="text"
                value={conjugeProfissao}
                onChange={e => setConjugeProfissao(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Renda Mensal</label>
              <input
                type="text"
                value={conjugeRendaMensal}
                onChange={e => setConjugeRendaMensal(formatRendaMensal(e.target.value))}
                placeholder="R$ 0,00"
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Nacionalidade</label>
              <input
                type="text"
                value={conjugeNacionalidade}
                onChange={e => setConjugeNacionalidade(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">RNE</label>
              <input
                type="text"
                value={conjugeRne}
                onChange={e => setConjugeRne(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>

            {/* Cônjuge Telefones */}
            <div className="col-span-1 sm:col-span-3 space-y-2 bg-zinc-50/50 p-3 rounded-lg border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Telefones Cônjuge</label>
                <button
                  type="button"
                  onClick={() => setConjugeTelefonesList(prev => [...prev, { tipo: 'celular', numero: '' }])}
                  className="text-[10px] text-[#004777] font-semibold flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Adicionar Telefone
                </button>
              </div>
              <div className="space-y-2">
                {conjugeTelefonesList.map((tel, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={tel.tipo}
                      onChange={e => {
                        const copy = [...conjugeTelefonesList];
                        copy[idx].tipo = e.target.value;
                        setConjugeTelefonesList(copy);
                      }}
                      className="border border-zinc-200 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="celular">Celular</option>
                      <option value="residencial">Fixo</option>
                      <option value="comercial">Comercial</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Telefone"
                      value={tel.numero}
                      onChange={e => {
                        const copy = [...conjugeTelefonesList];
                        copy[idx].numero = formatPhone(e.target.value);
                        setConjugeTelefonesList(copy);
                      }}
                      className="border border-zinc-200 rounded px-2 py-1 text-xs flex-1"
                    />
                    {conjugeTelefonesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setConjugeTelefonesList(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTOS DIGITALIZADOS */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1">
          Documentos Digitalizados (Urls do S3)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Documento Pessoal (RG/CNH)</label>
            <input
              type="text"
              placeholder="Url do PDF/Imagem no S3"
              value={docPessoalUrl}
              onChange={e => setDocPessoalUrl(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Comprovante de Residência</label>
            <input
              type="text"
              placeholder="Url do PDF/Imagem no S3"
              value={comprovanteResidenciaUrl}
              onChange={e => setComprovanteResidenciaUrl(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          {tenantEstadoCivil.toLowerCase().includes('casado') && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Holerite/Comprovante Renda Cônjuge</label>
              <input
                type="text"
                placeholder="Url do PDF/Imagem no S3"
                value={holeriteConjugeUrl}
                onChange={e => setHoleriteConjugeUrl(e.target.value)}
                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Holerite 1</label>
            <input
              type="text"
              placeholder="Url do PDF/Imagem no S3"
              value={holerite1NilsonUrl}
              onChange={e => setHolerite1NilsonUrl(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Holerite 2</label>
            <input
              type="text"
              placeholder="Url do PDF/Imagem no S3"
              value={holerite2NilsonUrl}
              onChange={e => setHolerite2NilsonUrl(e.target.value)}
              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
            />
          </div>
        </div>
      </div>

      {/* ENDEREÇO ATUAL DO INQUILINO */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1">
          Endereço do Inquilino (Atual)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="CEP"
            value={tenantCep}
            onChange={e => setTenantCep(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-1"
          />
          <input
            type="text"
            placeholder="Logradouro"
            value={tenantLogradouro}
            onChange={e => setTenantLogradouro(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-3"
          />
          <input
            type="text"
            placeholder="Número"
            value={tenantNumero}
            onChange={e => setTenantNumero(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            placeholder="Complemento"
            value={tenantComplemento}
            onChange={e => setTenantComplemento(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            placeholder="Bairro"
            value={tenantBairro}
            onChange={e => setTenantBairro(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            placeholder="Cidade/UF"
            value={tenantCidade ? `${tenantCidade}/${tenantEstado}` : ''}
            onChange={e => {
              const val = e.target.value;
              if (val.includes('/')) {
                const [c, u] = val.split('/');
                setTenantCidade(c.trim());
                setTenantEstado(u.trim());
              } else {
                setTenantCidade(val);
              }
            }}
            className="border border-zinc-200 rounded px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* FIADOR OPCIONAL */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="addFiadorCheck"
            checked={addFiador}
            onChange={e => setAddFiador(e.target.checked)}
            className="rounded border-zinc-200 text-[#004777] focus:ring-[#004777]"
          />
          <label htmlFor="addFiadorCheck" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">
            Adicionar Fiador para este inquilino? (Garantidor)
          </label>
        </div>

        {addFiador && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Dados do Fiador (Garantidor)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={fiadorNome}
                  onChange={e => setFiadorNome(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ *</label>
                <input
                  type="text"
                  required
                  value={fiadorCpf}
                  onChange={e => setFiadorCpf(formatCpfCnpj(e.target.value))}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail *</label>
                <input
                  type="email"
                  required
                  value={fiadorEmail}
                  onChange={e => setFiadorEmail(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Telefone</label>
                <input
                  type="text"
                  value={fiadorTelefone}
                  onChange={e => setFiadorTelefone(formatPhone(e.target.value))}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">RG</label>
                <input
                  type="text"
                  value={fiadorRg}
                  onChange={e => setFiadorRg(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Órgão Emissor</label>
                <input
                  type="text"
                  value={fiadorOrgao}
                  onChange={e => setFiadorOrgao(e.target.value)}
                  placeholder="Ex: SSP/SP"
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Nacionalidade</label>
                <input
                  type="text"
                  value={fiadorNacionalidade}
                  onChange={e => setFiadorNacionalidade(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Profissão</label>
                <input
                  type="text"
                  value={fiadorProfissao}
                  onChange={e => setFiadorProfissao(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
                <input
                  type="text"
                  value={fiadorDataNasc}
                  onChange={e => setFiadorDataNasc(formatBirthDate(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Estado Civil</label>
                <select
                  value={fiadorEstadoCivil}
                  onChange={e => setFiadorEstadoCivil(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                >
                  <option value="solteiro(a)">Solteiro(a)</option>
                  <option value="casado(a)">Casado(a)</option>
                  <option value="divorciado(a)">Divorciado(a)</option>
                  <option value="viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Gênero</label>
                <select
                  value={fiadorGenero}
                  onChange={e => setFiadorGenero(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Endereço do Fiador</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="CEP"
                  value={fiadorCep}
                  onChange={e => setFiadorCep(e.target.value)}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-1"
                />
                <input
                  type="text"
                  placeholder="Logradouro"
                  value={fiadorLogradouro}
                  onChange={e => setFiadorLogradouro(e.target.value)}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-3"
                />
                <input
                  type="text"
                  placeholder="Número"
                  value={fiadorNumero}
                  onChange={e => setFiadorNumero(e.target.value)}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={fiadorComplemento}
                  onChange={e => setFiadorComplemento(e.target.value)}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Bairro"
                  value={fiadorBairro}
                  onChange={e => setFiadorBairro(e.target.value)}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Cidade/UF"
                  value={fiadorCidade ? `${fiadorCidade}/${fiadorEstado}` : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('/')) {
                      const [c, u] = val.split('/');
                      setFiadorCidade(c.trim());
                      setFiadorEstado(u.trim());
                    } else {
                      setFiadorCidade(val);
                    }
                  }}
                  className="border border-zinc-200 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AÇÕES DO SUB-FORM */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={() => setModalView('MAIN')}
          className="px-4 py-2 text-xs font-semibold border border-zinc-200 rounded-lg hover:bg-zinc-50"
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={isSavingLocatario}
          className="bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
        >
          {isSavingLocatario ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              {isEditing ? 'Salvar Alterações' : 'Salvar e Vincular'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
