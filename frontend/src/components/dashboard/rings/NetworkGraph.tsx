"use client";

import dynamic from "next/dynamic";

const NetworkGraphInner = dynamic(
  () => import("./NetworkGraphInner"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0D11] border border-white/5 rounded-2xl animate-pulse">
         <span className="text-secondary/50 font-space tracking-widest uppercase text-xs">Initializing Force Graph Engine...</span>
      </div>
    )
  }
);

export default NetworkGraphInner;
