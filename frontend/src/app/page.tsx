import LandingNavbar from "@/components/landing/LandingNavbar";
import LiveTicker from "@/components/landing/LiveTicker";
import Hero from "@/components/landing/Hero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30">
      <LandingNavbar />
      <div className="max-w-[1400px] mx-auto px-10 md:px-16 lg:px-24">
        <div className="pt-[80px]">
          <LiveTicker />
        </div>
        <Hero />
        <LandingFeatures />
        <LandingFAQ />
      </div>
      <LandingFooter />
    </main>
  );
}
