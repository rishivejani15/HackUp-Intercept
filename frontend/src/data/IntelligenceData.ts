import { Shield, Zap, Globe, AlertTriangle, BookOpen, Fingerprint } from "lucide-react";

export interface IntelligenceItem {
  id: string;
  type: "INTEL" | "AWARENESS" | "ALERT";
  title: string;
  description: string;
  neuralTakeaway: string;
  source: string;
  date: string;
  readTime: string;
  riskLevel?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  icon: any;
  steps?: string[];
}

export const INTELLIGENCE_FEED: IntelligenceItem[] = [
  {
    id: "1",
    type: "ALERT",
    title: "V4 DEEPFAKE AUDIO CAMPAIGN DETECTED",
    description: "Multi-layered voice cloning attacks targeting institutional capital controllers in the APAC region.",
    neuralTakeaway: "InterceptAI has updated its spectral analysis engine to neutralize this specific waveform anomaly.",
    source: "CENTRAL INTEL HUB",
    date: "12M AGO",
    readTime: "2m",
    riskLevel: "CRITICAL",
    icon: AlertTriangle
  },
  {
    id: "2",
    type: "AWARENESS",
    title: "Neutralizing 'Quishing' (QR Code Phishing) Attacks",
    description: "Malicious QR codes on printed invoices and public charging stations are on the rise. Learn the intercept sequence.",
    neuralTakeaway: "Always scan QR codes using a sandboxed environment or InterceptAI's vision layer.",
    source: "SECURITY PROTOCOL ALPHA",
    date: "2H AGO",
    readTime: "5m",
    icon: BookOpen,
    steps: [
      "Inspect physical medium for overlay stickers",
      "Verify URL destination matches institutional domain",
      "Monitor session tokens for unrequested MFA prompts",
      "Use sandboxed browser for initial landing"
    ]
  },
  {
    id: "3",
    type: "INTEL",
    title: "ISO-20022 Cross-Border Settlement Integration Shifts",
    description: "New institutional protocols for messaging-based security are being adopted across major European banking nodes.",
    neuralTakeaway: "Standardization of telemetry metadata will improve InterceptAI's global detection rate by 14%.",
    source: "SWIFT NETWORK INTELLIGENCE",
    date: "4H AGO",
    readTime: "4m",
    icon: Globe
  },
  {
    id: "4",
    type: "AWARENESS",
    title: "Neural Fingerprint Hardening: Best Practices",
    description: "Reduce your digital attack surface by diversifying behavioral telemetry markers.",
    neuralTakeaway: "A complex behavioral profile is 40x harder to spoof than traditional password/MFA combinations.",
    source: "SYSTEM GUIDES",
    date: "1D AGO",
    readTime: "8m",
    icon: Fingerprint,
    steps: [
      "Rotate biometric authentication keys quarterly",
      "Enable device-level encrypted persistent state",
      "Verify 'Trusted Environment' status in dashboard"
    ]
  },
  {
    id: "5",
    type: "INTEL",
    title: "Decentralized Capital Growth vs Synthetic Fraud",
    description: "In-depth analysis of how synthetic identity theft is evolving to exploit decentralized liquidity pools.",
    neuralTakeaway: "Capital flow through DEXs requires advanced temporal analysis to detect automated wash patterns.",
    source: "MARKET WATCH ALPHA",
    date: "1D AGO",
    readTime: "12m",
    icon: Zap
  }
];
