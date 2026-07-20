"use client";

import React, { useState, useEffect } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { getClientes, ClienteRecord } from "./actions";
import { Users, Loader2, RefreshCw } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPerfil, setFilterPerfil] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
    </div>
  );
}
