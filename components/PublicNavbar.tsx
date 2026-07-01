"use client";

import { useState } from "react";
import Link from "next/link";
import { Building, Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Comprar", href: "/#comprar" },
    { name: "Alugar", href: "/#alugar" },
    { name: "Loteamentos", href: "/loteamentos" },
    { name: "Sobre Nós", href: "/#sobre" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-brand-bg-secondary/90 backdrop-blur-md border-b border-brand-bg-primary/20 shadow-sm z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <Building className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-brand-primary">
            Scatolin <span className="font-light text-brand-text">Imóveis</span>
          </span>
        </Link>

        {/* Center Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-base font-medium text-brand-text/80 hover:text-brand-primary transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-brand-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right CTA (Desktop) */}
        <div className="hidden md:flex items-center">
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-lg bg-brand-primary text-white font-semibold text-sm transition-all hover:bg-brand-primary/95 shadow-md shadow-brand-primary/10 hover:shadow-lg hover:shadow-brand-primary/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            Área do Cliente
          </Link>
        </div>

        {/* Hamburger (Mobile) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-brand-text hover:text-brand-primary hover:bg-brand-bg-primary rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-brand-text/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-20 left-0 right-0 bg-brand-bg-secondary shadow-xl border-t border-brand-bg-primary/30 p-6 flex flex-col gap-4 z-50 md:hidden transition-all duration-300">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-brand-text/95 hover:text-brand-primary py-2 border-b border-brand-bg-primary/30"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="mt-2 w-full py-3 rounded-lg bg-brand-primary text-white text-center font-bold shadow-md shadow-brand-primary/15"
            >
              Área do Cliente
            </Link>
          </div>
        </>
      )}
    </nav>
  );
}
