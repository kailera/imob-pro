"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, Image as ImageIcon, Link as LinkIcon, Upload, Loader2 } from "lucide-react";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";

export interface MediaItem {
    id: string;
    title: string;
    category: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
}

interface EditorMediaItemsProps {
    mediaItems?: MediaItem[];
    onSaveMediaItems?: (items: MediaItem[]) => void;
}

export default function EditorMediaItems({ mediaItems: initialItems = [], onSaveMediaItems }: EditorMediaItemsProps) {
    const [items, setItems] = useState<MediaItem[]>(initialItems);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<MediaItem>>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleEdit = (item: MediaItem) => {
        setEditingId(item.id);
        setFormData(item);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleSave = (id: string) => {
        const updated = items.map((item) =>
            item.id === id ? ({ ...item, ...formData } as MediaItem) : item
        );
        setItems(updated);
        setEditingId(null);
        setFormData({});
        if (onSaveMediaItems) onSaveMediaItems(updated);
    };

    const handleDelete = (id: string) => {
        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        if (onSaveMediaItems) onSaveMediaItems(updated);
    };

    const handleAddNew = () => {
        const newItem: MediaItem = {
            id: Date.now().toString(),
            title: "Nova Mídia / Equipe",
            category: "Nossa Equipe",
            description: "Descrição detalhada sobre a equipe ou destaque visual...",
            imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
        };
        const updated = [...items, newItem];
        setItems(updated);
        handleEdit(newItem);
        if (onSaveMediaItems) onSaveMediaItems(updated);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const data = new FormData();
            data.append("file", file);
            const res = await uploadMediaToRustFS(data);
            if (res.url) {
                setFormData((prev) => ({ ...prev, imageUrl: res.url }));
            }
        } catch (error) {
            console.error("Erro ao realizar upload de banner:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-brand-primary" />
                        Nossa Equipe & Mídias do Site
                    </h3>
                    <p className="text-xs text-brand-text/60">
                        Gerencie as imagens, selos (badges), títulos e textos da seção "Conheça Nossa Equipe" no site.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Mídia</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => {
                    const isEditing = editingId === item.id;

                    if (isEditing) {
                        return (
                            <div
                                key={item.id}
                                className="bg-white p-5 rounded-2xl border-2 border-brand-primary shadow-md space-y-4"
                            >
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-xs font-bold text-brand-primary">Editando Mídia / Equipe</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-3 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleSave(item.id)}
                                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Salvar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Título</label>
                                            <input
                                                type="text"
                                                value={formData.title || ""}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Selo / Categoria (Badge)</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Equipe Especializada"
                                                value={formData.category || ""}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Descrição</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Descrição explicativa exibida no card do site..."
                                            value={formData.description || ""}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Imagem de Capa</label>
                                        <div className="flex items-center gap-3">
                                            {formData.imageUrl && (
                                                <div className="w-20 h-12 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                                                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-dashed border-zinc-300">
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                                                        <span>Enviando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 text-brand-primary" />
                                                        <span>Fazer upload da imagem</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ou cole a URL da imagem..."
                                            value={formData.imageUrl || ""}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none mt-2 text-[11px] text-zinc-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Link de Redirecionamento (Opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: /sobre"
                                            value={formData.linkUrl || ""}
                                            onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow transition-all space-y-3 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <span className="absolute top-2 left-2 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                        {item.category}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-bold text-sm text-brand-text">{item.title}</h4>
                                    {item.description && (
                                        <p className="text-xs text-brand-text/70 mt-1 line-clamp-2 leading-relaxed">
                                            {item.description}
                                        </p>
                                    )}
                                    {item.linkUrl && (
                                        <div className="flex items-center gap-1 text-[11px] text-brand-primary mt-1">
                                            <LinkIcon className="w-3 h-3" />
                                            <span className="truncate">{item.linkUrl}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end border-t border-zinc-100 pt-3 text-xs gap-1">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-brand-bg-primary rounded-lg transition-colors cursor-pointer"
                                    title="Editar Mídia"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir Mídia"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
