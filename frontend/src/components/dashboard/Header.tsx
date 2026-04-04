"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Settings,
  Search,
  LogOut,
  ChevronDown,
  Network,
  User
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Graph Rings", icon: Network, href: "/dashboard/rings" },
  { label: "Simulator", icon: FileText, href: "/test-simulator" },
];

export default function Header() {
  const { user, profile, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 items-center justify-between px-6 lg:px-10">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3 group cursor-pointer">
          <BrandLogo size={40} className="animate-glow ring-1 ring-black/15" />
          <div className="flex flex-col">
            <span className="text-lg font-bold font-space tracking-tight text-foreground leading-none">
              INTERCEPT<span className="text-primary opacity-80">AI</span>
            </span>
            <span className="text-[9px] font-space font-bold tracking-[0.2em] text-primary/60 mt-1 uppercase">
              Explainable AI Defense
            </span>
          </div>
        </div>

        {/* Center: Navigation Pills */}
        <nav className="hidden xl:flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-black/10 mx-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-xl text-[11px] font-bold font-space uppercase tracking-wider transition-all duration-300",
                  isActive 
                    ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(185,199,224,0.15)]" 
                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                )}
              >
                <item.icon size={14} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-black/10">
            <div className="relative flex h-1.5 w-1.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
               <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
            </div>
            <span className="text-[9px] font-space font-bold uppercase tracking-widest text-secondary">Live</span>
          </div>

          <div className="flex items-center space-x-2">
            <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 border border-black/10 text-muted-foreground hover:bg-slate-200 hover:text-primary transition-all">
              <Search size={18} />
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 pl-2 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-all group"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold font-space text-foreground leading-tight">
                  {profile?.full_name || user?.email?.split("@")[0] || "Analyst-01"}
                </p>
                <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-black/15 flex items-center justify-center text-primary group-hover:animate-glow transition-all">
                <User size={20} />
              </div>
              <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-black/15 bg-card shadow-2xl shadow-black/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-black/10">
                  <p className="text-xs font-bold text-foreground">{profile?.full_name || "Analyst"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-all"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings size={14} />
                    <span>Account Settings</span>
                  </Link>
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
