"use client";

import { Users } from "lucide-react";

export interface MediaItem {
    id?: string;
    mediaUrl?: string;
    imageUrl?: string;
    title: string;
    description?: string;
    category?: string;
    badge?: string;
}

export interface IKnowIMobProps {
    medias?: MediaItem[];
}


export function KnowIMob({ medias }: IKnowIMobProps) {
    const displayMedias = (medias && medias.length > 0) ? medias : [];

    return (
        <section id="equipe" className="py-16 md:py-24 px-4 bg-white border-t border-zinc-100">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header section */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
                        <Users className="w-4 h-4" />
                        <span>Nossa Equipe & iMob</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-brand-text tracking-tight">
                        Conheça nossa equipe
                    </h1>
                    <p className="text-brand-text/70 text-sm md:text-base leading-relaxed">
                        Profissionais comprometidos em transformar sua experiência imobiliária com segurança, transparência e alto padrão de atendimento.
                    </p>
                </div>

                {/* Media items container - 60% Left (Text) / 40% Right (Image) */}
                <div className="space-y-8 md:space-y-12">
                    {displayMedias.map((item, index) => {
                        const badgeText = item.badge || item.category;
                        const imgSrc = item.imageUrl || item.mediaUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&q=80";

                        return (
                            <div
                                key={item.id || index}
                                className="bg-brand-bg-primary/30 border border-zinc-200/80 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-500 group"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
                                    {/* Text Container - 60% Left (3 of 5 cols) */}
                                    <div className="lg:col-span-3 space-y-4 flex flex-col justify-center">
                                        {badgeText && (
                                            <div>
                                                <span className="inline-block px-3 py-1 text-xs font-bold text-brand-primary bg-brand-primary/10 rounded-full">
                                                    {badgeText}
                                                </span>
                                            </div>
                                        )}
                                        <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight group-hover:text-brand-primary transition-colors duration-300">
                                            {item.title}
                                        </h2>
                                        {item.description && (
                                            <p className="text-brand-text/80 text-sm sm:text-base md:text-lg leading-relaxed font-normal">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Image Container - 40% Right (2 of 5 cols) */}
                                    <div className="lg:col-span-2">
                                        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl aspect-[4/3] shadow-md group-hover:shadow-2xl transition-all duration-500">
                                            <img
                                                src={imgSrc}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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

export default KnowIMob;
