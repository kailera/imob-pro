import React from "react";
import { Plus, Loader2 } from "lucide-react";

interface UsersTabProps {
  isAdmin: boolean;
  userEmail: string;
  setUserEmail: (value: string) => void;
  userFirstName: string;
  setUserFirstName: (value: string) => void;
  userLastName: string;
  setUserLastName: (value: string) => void;
  userPassword: string;
  setUserPassword: (value: string) => void;
  userRole: "ADMIN" | "OPERADOR" | "CORRETOR";
  setUserRole: (value: "ADMIN" | "OPERADOR" | "CORRETOR") => void;
  isCreatingUser: boolean;
  handleCreateUserSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  users: any[];
  loadingUsers: boolean;
}

export function UsersTab({
  isAdmin,
  userEmail,
  setUserEmail,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userPassword,
  setUserPassword,
  userRole,
  setUserRole,
  isCreatingUser,
  handleCreateUserSubmit,
  users,
  loadingUsers,
}: UsersTabProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#280003] border-b border-gray-100 pb-4 mb-6">
        Gerenciar Equipe e Convites
      </h2>

      {!isAdmin ? (
        <div className="bg-amber-50 border border-amber-200/50 p-6 rounded-2xl text-center text-amber-800 text-sm font-medium">
          Apenas corretores e administradores têm permissão para acessar a gestão de equipe e enviar convites.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Formulário de cadastro de usuário */}
          <div className="bg-gray-50/50 border border-gray-200 p-6 rounded-3xl">
            <h3 className="text-base font-bold text-[#280003] mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#280003]" />
              Cadastrar Novo Integrante da Equipe
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              O usuário será criado no Clerk e vinculado a esta organização, sendo cadastrado também no banco de dados local.
            </p>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                  <input
                    type="text"
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    placeholder="Ex: João"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sobrenome</label>
                  <input
                    type="text"
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    placeholder="Ex: Silva"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    placeholder="Ex: joao.silva@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Temporária</label>
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#280003]/10"
                    placeholder="Mínimo 8 caracteres (ou padrão)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função / Perfil</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#280003]/10 cursor-pointer"
                  >
                    <option value="CORRETOR">Corretor</option>
                    <option value="OPERADOR">Operador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="w-full py-2.5 bg-[#280003] text-white hover:bg-[#280003]/90 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer h-[42px]"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Cadastrar Usuário
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="border-t border-gray-150 pt-6">
            <h4 className="text-sm font-bold text-[#280003] mb-4">Membros da Equipe (Banco de Dados)</h4>
            
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center w-full min-h-[200px] bg-gray-50/30 border border-gray-100 rounded-3xl">
                <Loader2 className="w-8 h-8 text-[#280003] animate-spin mb-2" />
                <p className="text-xs text-gray-400 font-medium">Carregando membros da equipe...</p>
              </div>
            ) : !users || users.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full min-h-[200px] bg-gray-50/30 border border-gray-100 rounded-3xl p-6 text-center">
                <p className="text-sm text-gray-500 font-medium mb-1">Nenhum membro cadastrado.</p>
                <p className="text-xs text-gray-400">Cadastre um novo integrante acima para começar.</p>
              </div>
            ) : (
              <div className="w-full overflow-hidden border border-gray-100 rounded-3xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Função / Perfil</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((user) => {
                        const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
                        
                        let roleBadge = "bg-gray-50 text-gray-700 border-gray-200";
                        let roleLabel = user.role;
                        if (user.role === "ADMIN") {
                          roleBadge = "bg-[#280003]/5 text-[#280003] border-[#280003]/10";
                          roleLabel = "Administrador";
                        } else if (user.role === "CORRETOR") {
                          roleBadge = "bg-emerald-50 text-emerald-800 border-emerald-100";
                          roleLabel = "Corretor";
                        } else if (user.role === "OPERADOR") {
                          roleBadge = "bg-blue-50 text-blue-800 border-blue-100";
                          roleLabel = "Operador";
                        }

                        return (
                          <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#280003]/5 text-[#280003] font-bold text-xs flex items-center justify-center shrink-0 border border-[#280003]/10">
                                  {initials || "?"}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleBadge}`}>
                                {roleLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50/50 border border-emerald-100/80 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Ativo
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
