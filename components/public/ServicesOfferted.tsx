"use client";

import {
    Home,
    Key,
    ShieldCheck,
    ClipboardCheck,
    Scale,
    TrendingUp,
    MessageCircle,
    Mail,
    Camera,
    ArrowUpRight,
    Briefcase
} from "lucide-react";

export interface IActions {
    whatsapp?: string;
    email?: string;
    instagram?: string;
}

export interface ServiceItem {
    id?: string;
    mediaUrl: string;
    title: string;
    description: string;
    icon?: any;
    whatsapp?: string;
    email?: string;
    instagram?: string;
    actions?: IActions;
}

export interface IServicesOffertedProps {
    services?: ServiceItem[];
}

const DEFAULT_SERVICES: ServiceItem[] = [
    {
        id: "1",
        icon: Home,
        mediaUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
        title: "Intermediação de Vendas",
        description: "Assessoria completa na compra e venda de imóveis com ampla divulgação, curadoria personalizada e transparência em todas as etapas.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
    {
        id: "2",
        icon: Key,
        mediaUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
        title: "Gestão de Locação",
        description: "Administração segura do seu imóvel com cobrança automatizada, análise rigorosa de fiadores e repasse pontual garantido.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
    {
        id: "3",
        icon: ClipboardCheck,
        mediaUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80",
        title: "Vistorias Detalhadas",
        description: "Laudos cautelares completos com fotografias em alta definição e registros minuciosos para total proteção de locador e locatário.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
    {
        id: "4",
        icon: Scale,
        mediaUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        title: "Assessoria Jurídica",
        description: "Análise prévia minuciosa de certidões, regularização imobiliária e elaboração de contratos por advogados especialistas no setor.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
    {
        id: "5",
        icon: TrendingUp,
        mediaUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
        title: "Avaliação Imobiliária",
        description: "Parecer técnico mercadológico fundamentado em dados estatísticos reais do mercado local para identificar o valor justo do seu patrimônio.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
    {
        id: "6",
        icon: ShieldCheck,
        mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        title: "Consultoria de Patrimônio",
        description: "Orientações estratégicas e inteligência imobiliária para investidores que buscam alta rentabilidade e diversificação patrimonial.",
        whatsapp: "5518996942082",
        email: "contato@scatolinimoveis.com.br",
        instagram: "https://instagram.com/scatolinimoveis"
    },
];

export function ServicesOfferted({ services }: IServicesOffertedProps) {
    const displayServices = services ?? DEFAULT_SERVICES;

    return (
        <section id="servicos" className="py-16 md:py-24 px-4 bg-brand-bg-primary/30 border-t border-zinc-100">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header section */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
                        <Briefcase className="w-4 h-4" />
                        <span>Soluções Imobiliárias</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-brand-text tracking-tight">
                        Serviços Oferecidos
                    </h2>
                    <p className="text-brand-text/70 text-sm md:text-base leading-relaxed">
                        Oferecemos uma esteira completa de soluções especializadas para quem deseja comprar, alugar ou administrar imóveis com total tranquilidade.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {displayServices.map((service, index) => {
                        const Icon = service.icon || Home;
                        
                        // Extrai e limpa o número de WhatsApp
                        const rawWa = service.whatsapp || service.actions?.whatsapp || "5518996942082";
                        const digits = rawWa.replace(/\D/g, "");
                        const waNumber = digits.length >= 8 ? digits : "5518996942082";
                        const waMsg = encodeURIComponent(`Olá! Gostaria de informações sobre ${service.title}.`);
                        const waUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

                        const rawEmail = service.email || service.actions?.email || "contato@scatolinimoveis.com.br";
                        const emailUrl = rawEmail.startsWith("mailto:") ? rawEmail : `mailto:${rawEmail}?subject=${encodeURIComponent(service.title)}`;
                        const instaUrl = service.instagram || service.actions?.instagram || "https://instagram.com/scatolinimoveis";

                        return (
                            <div
                                key={service.id || index}
                                className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col h-full group"
                            >
                                {/* 1. Foto / Media */}
                                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                                    <img
                                        src={service.mediaUrl}
                                        alt={service.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                                    {/* Floating Icon Badge */}
                                    <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center text-brand-primary shadow-md group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Content Container */}
                                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                                    <div className="space-y-2.5">
                                        <h3 className="text-xl font-bold text-brand-text group-hover:text-brand-primary transition-colors duration-300">
                                            {service.title}
                                        </h3>
                                        <p className="text-brand-text/75 text-sm leading-relaxed font-normal">
                                            {service.description}
                                        </p>
                                    </div>

                                    {/* Call Actions */}
                                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow group/btn cursor-pointer"
                                        >
                                            <MessageCircle className="w-4 h-4 fill-white/20" />
                                            <span>Falar no WhatsApp</span>
                                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                        </a>

                                        <div className="flex items-center gap-1.5">
                                            {emailUrl && (
                                                <a
                                                    href={emailUrl}
                                                    title="Enviar E-mail"
                                                    className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-brand-primary/10 text-zinc-600 hover:text-brand-primary flex items-center justify-center transition-colors"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </a>
                                            )}
                                            {instaUrl && (
                                                <a
                                                    href={instaUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Ver no Instagram"
                                                    className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-brand-primary/10 text-zinc-600 hover:text-brand-primary flex items-center justify-center transition-colors"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default ServicesOfferted;
