import Dexie, { type Table } from "dexie";

export interface CachedVistoria {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  data: string;
  proprietario: string;
  endereco: string;
  observacoes: string;
  reparosNecessarios: string;
  chavesQuantidade: number;
  chavesObservacao: string;
  ambienteVistorias: any[];
  comentariosVistoria: any[];
  infoGeral: any;
  pendingSync?: boolean;
  pendingCreate?: boolean;
}

export interface OfflineMedia {
  id: string; // Ex: UUID ou url local provisória blob://...
  blob: Blob;
  type: "image" | "video";
  fileName: string;
}

export interface SyncAction {
  id?: number;
  type: "CREATE_VISTORIA" | "UPDATE_VISTORIA" | "ADD_COMMENT" | "UPDATE_COMMENT" | "DELETE_COMMENT";
  vistoriaId: string;
  payload: any;
  timestamp: number;
}

class ImobProDatabase extends Dexie {
  vistorias!: Table<CachedVistoria, string>;
  offlineMedia!: Table<OfflineMedia, string>;
  syncQueue!: Table<SyncAction, number>;

  constructor() {
    super("ImobProDatabase");
    this.version(1).stores({
      vistorias: "id, codigo, status, pendingSync, pendingCreate",
      offlineMedia: "id",
      syncQueue: "++id, type, vistoriaId, timestamp",
    });
  }
}

export const db = new ImobProDatabase();
