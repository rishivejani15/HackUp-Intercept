"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";

export default function LandingNavbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
      scrolled ? "bg-background/80 backdrop-blur-xl border-black/10 py-4" : "bg-transparent border-transparent py-6"
    )}>
      <div className="max-w-[1400px] mx-auto px-10 md:px-16 lg:px-24 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <BrandLogo size={40} className="group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/20" />
          <span className="text-2xl font-bold font-space tracking-tighter text-foreground">
            INTERCEPT<span className="text-primary">AI</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          {["Features", "Security", "Intelligence", "FAQ"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`} 
              className="text-[10px] font-bold font-space uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          {!user ? (
            <>
              <Link href="/login" className="hidden sm:block text-[10px] font-bold font-space uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors">
                Login
              </Link>
              <Link 
                href="/signup" 
                className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 group"
              >
                <span>Get Started</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </>
          ) : (
            <Link 
              href="/dashboard" 
              className="h-12 px-6 rounded-2xl bg-slate-100 border border-black/15 text-foreground text-[10px] font-bold font-space uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>Go to Dashboard</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-primary" />
            </Link>
          )}
          
          <button 
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-black/10 p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          {["Features", "Security", "Intelligence", "FAQ"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`} 
              className="block text-[10px] font-bold font-space uppercase tracking-[0.25em] text-muted-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
