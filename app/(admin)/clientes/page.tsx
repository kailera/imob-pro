"use client";

import React, { useState, useEffect } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { getClientes, getClienteDetails, updateCliente, ClienteRecord } from "./actions";
import { Users, Loader2, RefreshCw, X } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPerfil, setFilterPerfil] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteRecord | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  
  // Locador/Locatario/Fiador specific fields
  const [rg, setRg] = useState("");
  const [orgaoEmissor, setOrgaoEmissor] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [genero, setGenero] = useState("");
  const [nacionalidade, setNacionalidade] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [profissao, setProfissao] = useState("");
  
  // Endereco
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getClientes();
    if (res.success && res.data) {
      setClientes(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = async (item: ClienteRecord) => {
    setSelectedCliente(item);
    setIsEditModalOpen(true);
    setLoadingDetails(true);
    
    // Reset fields
    setNome(item.nome);
    setCpfCnpj(item.documento === "-" ? "" : item.documento);
    setEmail(item.email === "-" ? "" : item.email);
    setTelefone(item.telefone === "-" ? "" : item.telefone);
    
    setRg("");
    setOrgaoEmissor("");
    setDataNasc("");
    setGenero("Masculino");
    setNacionalidade("Brasileiro(a)");
    setEstadoCivil("Solteiro(a)");
    setProfissao("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setMunicipio("");
    setEstado("");

    const res = await getClienteDetails(item.id, item.perfil);
    if (res.success && res.data) {
      const d = res.data as any;
      setNome(d.nome || "");
      setCpfCnpj(d.cpfCnpj || "");
      setEmail(d.email || "");
      
      // Parse phone if Json/Array
      let parsedPhone = "";
      if (d.telefone) {
        if (typeof d.telefone === "string") {
          parsedPhone = d.telefone;
        } else if (Array.isArray(d.telefone)) {
          const first = d.telefone[0];
          if (typeof first === "string") {
            try {
              const pObj = JSON.parse(first);
              parsedPhone = pObj.telefone || pObj.numero || first;
            } catch {
              parsedPhone = first;
            }
          } else if (typeof first === "object" && first !== null) {
            parsedPhone = first.telefone || first.numero || "";
          }
        } else if (typeof d.telefone === "object") {
          parsedPhone = d.telefone.telefone || d.telefone.numero || "";
        }
      }
      setTelefone(parsedPhone);

      // Locador/Locatario/Fiador fields
      if (item.perfil !== "Comprador") {
        setRg(d.rg || "");
        setOrgaoEmissor(d.orgaoEmissor || "");
        setDataNasc(d.dataNasc || "");
        setGenero(d.genero || "Masculino");
        setNacionalidade(d.nacionalidade || "Brasileiro(a)");
        setEstadoCivil(d.estadoCivil || "Solteiro(a)");
        setProfissao(d.profissao || "");

        // Parse Address if Json/Array
        let parsedAddr: any = null;
        if (d.endereco) {
          if (typeof d.endereco === "string") {
            try { parsedAddr = JSON.parse(d.endereco); } catch {}
          } else if (Array.isArray(d.endereco)) {
            const first = d.endereco[0];
            if (typeof first === "string") {
              try { parsedAddr = JSON.parse(first); } catch {}
            } else if (typeof first === "object" && first !== null) {
              parsedAddr = first;
            }
          } else if (typeof d.endereco === "object") {
            parsedAddr = d.endereco;
          }
        }

        if (parsedAddr) {
          setCep(parsedAddr.cep || "");
          setLogradouro(parsedAddr.logradouro || "");
          setNumero(parsedAddr.numero || "");
          setComplemento(parsedAddr.complemento || "");
          setBairro(parsedAddr.bairro || "");
          setMunicipio(parsedAddr.municipio || "");
          setEstado(parsedAddr.estado || "");
        }
      }
    }
    setLoadingDetails(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    setSaving(true);
    
    // Prepare payload
    let payload: any = {};
    if (selectedCliente.perfil === "Comprador") {
      payload = { nome, telefone, email };
    } else {
      // Serialize Address and Phone to match schema expectations
      const phonePayload = [JSON.stringify({ telefone, qualificacao: "Principal", observacao: "" })];
      const addrPayload = [JSON.stringify({
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        estado
      })];

      payload = {
        nome,
        cpfCnpj,
        email,
        telefone: phonePayload,
        endereco: addrPayload,
        dataNasc,
        rg,
        orgaoEmissor,
        estadoCivil,
        profissao,
        nacionalidade,
        genero,
      };
    }

    const res = await updateCliente(selectedCliente.id, selectedCliente.perfil, payload);
    if (res.success) {
      setIsEditModalOpen(false);
      loadData();
    } else {
      alert("Erro ao salvar dados: " + res.error);
    }
    setSaving(false);
  };

  const countProprietarios = clientes.filter((c) => c.perfil === "Proprietário").length;
  const countInquilinos = clientes.filter((c) => c.perfil === "Inquilino").length;
  const countFiadores = clientes.filter((c) => c.perfil === "Fiador").length;
  const countCompradores = clientes.filter((c) => c.perfil === "Comprador").length;

  const filteredClientes = clientes.filter((item) => {
    const matchesPerfil = filterPerfil === "Todos" || item.perfil === filterPerfil;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.nome.toLowerCase().includes(q) ||
      item.documento.toLowerCase().includes(q) ||
      item.telefone.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q);

    return matchesPerfil && matchesSearch;
  });

  const columns: Column<ClienteRecord>[] = [
    {
      header: "Nome",
      accessorKey: "nome",
      cell: (item: ClienteRecord) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{item.nome}</span>
          {item.detalhes && (
            <span className="text-xs text-gray-500">{item.detalhes}</span>
          )}
        </div>
      ),
    },
    { header: "CPF/CNPJ", accessorKey: "documento" },
    { header: "Telefone", accessorKey: "telefone" },
    { header: "E-mail", accessorKey: "email" },
    {
      header: "Perfil",
      accessorKey: "perfil",
      cell: (item: ClienteRecord) => {
        let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";
        if (item.perfil === "Proprietário") {
          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
        } else if (item.perfil === "Inquilino") {
          badgeStyle = "bg-sky-50 text-sky-700 border-sky-200";
        } else if (item.perfil === "Fiador") {
          badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
        } else if (item.perfil === "Comprador") {
          badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
        }

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}
          >
            {item.perfil}
          </span>
        );
      },
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (item: ClienteRecord) => (
        <button
          onClick={() => handleEditClick(item)}
          className="text-xs font-bold text-[#004777] hover:underline cursor-pointer bg-transparent border-0"
        >
          Editar
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Cards & Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#004777]/10 text-[#004777] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestão de Clientes</h1>
            <p className="text-sm text-gray-500">
              Visualização unificada de proprietários, inquilinos, fiadores e compradores reais do sistema.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors border border-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Pesquisar por nome, documento, e-mail ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="md:col-span-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setFilterPerfil("Todos")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            filterPerfil === "Todos"
              ? "bg-[#004777] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Todos ({clientes.length})
        </button>

        <button
          onClick={() => setFilterPerfil("Proprietário")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            filterPerfil === "Proprietário"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
        >
          Proprietários ({countProprietarios})
        </button>

        <button
          onClick={() => setFilterPerfil("Inquilino")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            filterPerfil === "Inquilino"
              ? "bg-sky-600 text-white"
              : "text-gray-600 hover:bg-sky-50 hover:text-sky-700"
          }`}
        >
          Inquilinos ({countInquilinos})
        </button>

        <button
          onClick={() => setFilterPerfil("Fiador")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            filterPerfil === "Fiador"
              ? "bg-amber-600 text-white"
              : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
          }`}
        >
          Fiadores ({countFiadores})
        </button>

        <button
          onClick={() => setFilterPerfil("Comprador")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            filterPerfil === "Comprador"
              ? "bg-purple-600 text-white"
              : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
          }`}
        >
          Compradores ({countCompradores})
        </button>
      </div>

      {/* Main Content / Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-3 border border-gray-100 shadow-sm text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
          <span className="text-sm font-medium">Carregando clientes reais...</span>
        </div>
      ) : (
        <DataTable
          title={`Lista de Clientes (${filteredClientes.length})`}
          data={filteredClientes}
          columns={columns}
        />
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  Editar Cadastro de {selectedCliente.perfil}
                </h3>
                <p className="text-xs text-gray-500">ID: {selectedCliente.id}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-400 hover:text-gray-600 border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetails ? (
              <div className="flex-1 p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#004777]" />
                <span className="text-sm">Carregando detalhes do banco...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Basic fields for everyone */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-600">Nome Completo *</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {selectedCliente.perfil !== "Comprador" && (
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-600">CPF / CNPJ *</label>
                      <input
                        type="text"
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        required
                        className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-600">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-600">Telefone</label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {/* Profile-specific fields */}
                  {selectedCliente.perfil !== "Comprador" && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">RG</label>
                        <input
                          type="text"
                          value={rg}
                          onChange={(e) => setRg(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Órgão Emissor</label>
                        <input
                          type="text"
                          value={orgaoEmissor}
                          onChange={(e) => setOrgaoEmissor(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Data de Nascimento</label>
                        <input
                          type="text"
                          value={dataNasc}
                          onChange={(e) => setDataNasc(e.target.value)}
                          placeholder="dd/mm/aaaa"
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Gênero</label>
                        <select
                          value={genero}
                          onChange={(e) => setGenero(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white cursor-pointer"
                        >
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Nacionalidade</label>
                        <input
                          type="text"
                          value={nacionalidade}
                          onChange={(e) => setNacionalidade(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Estado Civil</label>
                        <input
                          type="text"
                          value={estadoCivil}
                          onChange={(e) => setEstadoCivil(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-gray-600">Profissão</label>
                        <input
                          type="text"
                          value={profissao}
                          onChange={(e) => setProfissao(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        />
                      </div>

                      {/* Address Subform */}
                      <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100">
                        <h5 className="font-bold text-gray-700 text-sm mb-3">Endereço Residencial</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-gray-500">CEP</label>
                            <input
                              type="text"
                              value={cep}
                              onChange={(e) => setCep(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="font-bold text-gray-500">Logradouro</label>
                            <input
                              type="text"
                              value={logradouro}
                              onChange={(e) => setLogradouro(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-gray-500">Número</label>
                            <input
                              type="text"
                              value={numero}
                              onChange={(e) => setNumero(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-gray-500">Complemento</label>
                            <input
                              type="text"
                              value={complemento}
                              onChange={(e) => setComplemento(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-gray-500">Bairro</label>
                            <input
                              type="text"
                              value={bairro}
                              onChange={(e) => setBairro(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="font-bold text-gray-500">Município/Cidade</label>
                            <input
                              type="text"
                              value={municipio}
                              onChange={(e) => setMunicipio(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-gray-500">Estado/UF</label>
                            <input
                              type="text"
                              value={estado}
                              onChange={(e) => setEstado(e.target.value)}
                              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#004777] text-white rounded-xl text-sm font-semibold hover:bg-[#003c64] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Alterações</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
