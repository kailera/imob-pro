"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, Star, MessageSquareQuote, Upload, Loader2 } from "lucide-react";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";

export interface ReviewItem {
    id: string;
    author: string;
    role?: string;
    comment: string;
    rating: number;
    avatarUrl?: string;
}

interface EditorReviewsProps {
    reviews?: ReviewItem[];
    onSaveReviews?: (reviews: ReviewItem[]) => void;
}

export default function EditorReviews({ reviews: initialReviews = [], onSaveReviews }: EditorReviewsProps) {
    const [items, setItems] = useState<ReviewItem[]>(initialReviews);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ReviewItem>>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialReviews && initialReviews.length > 0) {
            setItems(initialReviews);
        }
    }, [initialReviews]);

    const handleEdit = (item: ReviewItem) => {
        setEditingId(item.id);
        setFormData(item);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleSave = (id: string) => {
        const updated = items.map((item) =>
            item.id === id ? ({ ...item, ...formData } as ReviewItem) : item
        );
        setItems(updated);
        setEditingId(null);
        setFormData({});
        if (onSaveReviews) onSaveReviews(updated);
    };

    const handleDelete = (id: string) => {
        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        if (onSaveReviews) onSaveReviews(updated);
    };

    const handleAddNew = () => {
        const newItem: ReviewItem = {
            id: Date.now().toString(),
            author: "Nome do Cliente",
            role: "Comprador / Inquilino",
            comment: "Depoimento do cliente sobre o atendimento e os serviços...",
            rating: 5,
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
        };
        const updated = [...items, newItem];
        setItems(updated);
        handleEdit(newItem);
        if (onSaveReviews) onSaveReviews(updated);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const data = new FormData();
            data.append("file", file);
            const res = await uploadMediaToRustFS(data);
            if (res.url) {
                setFormData((prev) => ({ ...prev, avatarUrl: res.url }));
            }
        } catch (error) {
            console.error("Erro ao realizar upload de foto do cliente:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                        <MessageSquareQuote className="w-5 h-5 text-brand-primary" />
                        Depoimentos & Avaliações dos Clientes
                    </h3>
                    <p className="text-xs text-brand-text/60">
                        Gerencie as avaliações de clientes satisfeitos exibidas na área de prova social do site.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Depoimento</span>
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
                                    <span className="text-xs font-bold text-brand-primary">Editando Depoimento</span>
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
                                            <label className="block font-semibold text-zinc-700 mb-1">Nome do Cliente</label>
                                            <input
                                                type="text"
                                                value={formData.author || ""}
                                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Papel / Perfil</label>
                                            <input
                                                type="text"
                                                value={formData.role || ""}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Depoimento</label>
                                        <textarea
                                            rows={3}
                                            value={formData.comment || ""}
                                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Nota (1 a 5 estrelas)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={5}
                                                value={formData.rating || 5}
                                                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Foto de Perfil do Cliente</label>
                                            <div className="flex items-center gap-2">
                                                {formData.avatarUrl && (
                                                    <img
                                                        src={formData.avatarUrl}
                                                        alt="Preview"
                                                        className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0"
                                                    />
                                                )}
                                                <label className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors border border-dashed border-zinc-300">
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                                                            <span>Enviando...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-3.5 h-3.5 text-brand-primary" />
                                                            <span>Upload Foto</span>
                                                        </>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAvatarUpload}
                                                        disabled={uploading}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Ou cole a URL..."
                                                value={formData.avatarUrl || ""}
                                                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                                className="w-full px-3 py-1 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none mt-1.5 text-[11px] text-zinc-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow transition-all space-y-4 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={item.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
                                        alt={item.author}
                                        className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                                    />
                                    <div>
                                        <h4 className="font-bold text-sm text-brand-text">{item.author}</h4>
                                        <p className="text-[11px] text-brand-text/60">{item.role}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-amber-400">
                                    {Array.from({ length: item.rating }).map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                    ))}
                                </div>

                                <p className="text-xs text-brand-text/80 italic leading-relaxed">
                                    "{item.comment}"
                                </p>
                            </div>

                            <div className="flex items-center justify-end border-t border-zinc-100 pt-3 text-xs gap-1">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-brand-bg-primary rounded-lg transition-colors cursor-pointer"
                                    title="Editar Depoimento"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir Depoimento"
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
