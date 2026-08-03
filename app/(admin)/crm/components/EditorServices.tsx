"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, Image as ImageIcon, MessageCircle, Mail, Camera, Briefcase, Upload, Loader2 } from "lucide-react";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";

export interface ServiceItem {
    id: string;
    title: string;
    description: string;
    mediaUrl: string;
    whatsapp?: string;
    email?: string;
    instagram?: string;
}

interface EditorServicesProps {
    services: ServiceItem[];
    onSaveServices?: (services: ServiceItem[]) => void;
}

export default function EditorServices({ services: initialServices = [], onSaveServices }: EditorServicesProps) {
    const [items, setItems] = useState<ServiceItem[]>(initialServices);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceItem>>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialServices && initialServices.length > 0) {
            setItems(initialServices);
        }
    }, [initialServices]);

    const handleEdit = (item: ServiceItem) => {
        setEditingId(item.id);
        setFormData(item);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleSave = (id: string) => {
        const updated = items.map((item) =>
            item.id === id ? ({ ...item, ...formData } as ServiceItem) : item
        );
        setItems(updated);
        setEditingId(null);
        setFormData({});
        if (onSaveServices) onSaveServices(updated);
    };

    const handleDelete = (id: string) => {
        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        if (onSaveServices) onSaveServices(updated);
    };

    const handleAddNew = () => {
        const newItem: ServiceItem = {
            id: Date.now().toString(),
            title: "Novo Serviço",
            description: "Descrição do serviço oferecido...",
            mediaUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
            whatsapp: "5518996942082",
            email: "contato@scatolinimoveis.com.br"
        };
        const updated = [...items, newItem];
        setItems(updated);
        handleEdit(newItem);
        if (onSaveServices) onSaveServices(updated);
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
                setFormData((prev) => ({ ...prev, mediaUrl: res.url }));
            }
        } catch (error) {
            console.error("Erro ao realizar upload de imagem:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-brand-primary" />
                        Serviços Oferecidos no Site
                    </h3>
                    <p className="text-xs text-brand-text/60">
                        Gerencie os cards de serviços, imagens e contatos exibidos na Landing Page.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Serviço</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((service) => {
                    const isEditing = editingId === service.id;

                    if (isEditing) {
                        return (
                            <div
                                key={service.id}
                                className="bg-white p-5 rounded-2xl border-2 border-brand-primary shadow-md space-y-4"
                            >
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-xs font-bold text-brand-primary">Editando Serviço</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-3 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleSave(service.id)}
                                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Salvar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Título do Serviço</label>
                                        <input
                                            type="text"
                                            value={formData.title || ""}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Descrição</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description || ""}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-zinc-700 mb-1">Imagem de Capa do Serviço</label>
                                        <div className="flex items-center gap-3">
                                            {formData.mediaUrl && (
                                                <div className="w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                                                    <img src={formData.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
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
                                            value={formData.mediaUrl || ""}
                                            onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none mt-2 text-[11px] text-zinc-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">Número do WhatsApp</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: 5518996942082"
                                                value={formData.whatsapp || ""}
                                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                                                O link wa.me é gerado automaticamente.
                                            </span>
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-zinc-700 mb-1">E-mail de Contato</label>
                                            <input
                                                type="text"
                                                placeholder="contato@empresa.com.br"
                                                value={formData.email || ""}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:border-brand-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={service.id}
                            className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow transition-all space-y-4 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100">
                                    <img
                                        src={service.mediaUrl}
                                        alt={service.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div>
                                    <h4 className="font-bold text-sm text-brand-text">{service.title}</h4>
                                    <p className="text-xs text-brand-text/70 mt-1 line-clamp-3 leading-relaxed">
                                        {service.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                                <div className="flex gap-2 text-zinc-400">
                                    {service.whatsapp && <MessageCircle className="w-4 h-4 text-emerald-600" />}
                                    {service.email && <Mail className="w-4 h-4 text-blue-600" />}
                                    {service.instagram && <Camera className="w-4 h-4 text-purple-600" />}
                                </div>

                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-brand-bg-primary rounded-lg transition-colors cursor-pointer"
                                        title="Editar Serviço"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Excluir Serviço"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
