"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ChevronRight, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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
      scrolled ? "bg-background/80 backdrop-blur-xl border-white/5 py-4" : "bg-transparent border-transparent py-6"
    )}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
            <Shield className="text-white" size={20} />
          </div>
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
              className="h-12 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-foreground text-[10px] font-bold font-space uppercase tracking-[0.2em] hover:bg-white/5 transition-all flex items-center justify-center space-x-2 group"
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
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-white/5 p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
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
