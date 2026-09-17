import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSession, clearSession, dashboardPathForRole } from "@/lib/session";
import {
  Shield, Brain, MapPin, Zap, Users, Leaf, BarChart3,
  ClipboardList, Eye, Menu, X, Droplets, Twitter, Github, Linkedin,
  ChevronRight, Radio, Lightbulb, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroDrone } from "@/components/landing/HeroDrone";

/* ─── scroll fade-in hook ─── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.remove("opacity-0");
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("animate-fade-in-up");
          obs.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const FadeIn = ({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra delay after the element enters view (CSS animation-delay). */
  delayMs?: number;
}) => {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "opacity-0 motion-reduce:opacity-100 motion-reduce:translate-y-0",
        className
      )}
    >
      {children}
    </div>
  );
};

/* ─── Navbar ─── */
const NAV_LINKS = ["Home", "About", "Benefits", "Features"] as const;

function Navbar() {
  const navigate = useNavigate();
  const session = getSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scroll = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignOut = () => {
    clearSession();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <nav
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out animate-in fade-in slide-in-from-top-3 duration-700",
        scrolled ? "glass shadow-lg shadow-primary/5" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* logo */}
        <button
          onClick={() => scroll("home")}
          className="flex items-center gap-2 group motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md motion-safe:transition-all motion-safe:duration-300 group-hover:shadow-lg group-hover:shadow-primary/35">
            <Droplets className="text-primary-foreground" size={20} />
          </div>
          <span className="font-heading font-bold text-lg text-foreground">
            AquaGuard <span className="text-primary">AI</span>
          </span>
        </button>

        {/* desktop links */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <li key={l}>
              <button
                onClick={() => scroll(l.toLowerCase())}
                className="relative px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 after:absolute after:left-4 after:right-4 after:bottom-1 after:h-[2px] after:rounded-full after:bg-primary after:origin-left after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100 after:transition-all after:duration-300"
              >
                {l}
              </button>
            </li>
          ))}
        </ul>

        {/* desktop auth */}
        <div className="hidden md:flex items-center gap-2">
          {session ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="rounded-full motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.03]"
                asChild
              >
                <Link to={dashboardPathForRole(session.role)}>Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="rounded-full motion-safe:hover:border-primary/50" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-full motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.03] shadow-md shadow-primary/15"
                asChild
              >
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-border/40 px-6 pb-6 pt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {NAV_LINKS.map((l) => (
            <button key={l} onClick={() => scroll(l.toLowerCase())} className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {l}
            </button>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            {session ? (
              <div className="flex flex-col gap-2">
                <Button variant="default" size="sm" className="rounded-full w-full" asChild>
                  <Link to={dashboardPathForRole(session.role)} onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="rounded-full w-full" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full flex-1" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" className="rounded-full flex-1" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  const highlights = [
    { icon: Radio, text: "Real-time detection" },
    { icon: Lightbulb, text: "Smart recommendations" },
    { icon: Navigation, text: "Live tracking" },
  ];

  return (
    <section
      id="home"
      className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden mesh-hero scroll-mt-24"
    >
      {/* bg blobs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/12 blur-3xl animate-blob motion-reduce:animate-none" />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-secondary/14 blur-3xl animate-blob motion-reduce:animate-none"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[min(90vw,720px)] h-64 rounded-full bg-ocean-light/8 blur-3xl motion-safe:animate-pulse motion-reduce:opacity-70"
        aria-hidden
      />

      {/* subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.2] [background-image:linear-gradient(hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.35)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,black,transparent)]"
        aria-hidden
      />

      {/* aerial drone — desktop */}
      <div
        className="pointer-events-none absolute z-[1] w-[min(220px,26vw)] aspect-square top-[10%] right-[4%] md:right-[8%] lg:right-[12%] hidden sm:block"
        aria-hidden
      >
        <HeroDrone />
      </div>

      <div className="relative z-[2] max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* left */}
        <div className="space-y-8">
          <p className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:fill-mode-both motion-safe:duration-700">
            <span className="pointer-events-none absolute inset-0 -translate-x-full motion-safe:animate-[hero-shimmer_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent motion-reduce:hidden" aria-hidden />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="relative">UAV &amp; AI monitoring live-ready</span>
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl xl:text-6xl leading-[1.1] text-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both motion-safe:duration-700">
            AI-Powered Plastic Pollution{" "}
            <span className="text-gradient-brand">Detection</span>{" "}
            &amp; Action System
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700 motion-safe:delay-150">
            Monitor, predict, and eliminate plastic waste with intelligent automation — protecting our oceans for future generations.
          </p>
          <div className="flex flex-wrap gap-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700 motion-safe:delay-200">
            <Button
              size="lg"
              className="rounded-full px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.98] group"
              asChild
            >
              <Link to="/signup" className="inline-flex items-center gap-2">
                Get Started
                <ChevronRight
                  size={18}
                  className="motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 transition-all duration-300 hover:border-primary/40 hover:bg-accent/80"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Explore Features
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            {highlights.map((h, i) => (
              <div
                key={h.text}
                className={cn(
                  "flex items-center gap-2 text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-700",
                  i === 0 && "motion-safe:delay-300",
                  i === 1 && "motion-safe:delay-500",
                  i === 2 && "motion-safe:delay-700"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-110 motion-safe:hover:rotate-3">
                  <h.icon size={16} className="text-primary" />
                </div>
                {h.text}
              </div>
            ))}
          </div>

          {/* mobile / small — drone strip */}
          <div className="flex justify-center pt-2 sm:hidden">
            <HeroDrone compact className="w-40 h-40" />
          </div>
        </div>

        {/* right – ocean illustration */}
        <div className="relative hidden lg:flex items-center justify-center min-h-[420px]">
          <div className="absolute -top-4 right-8 z-20 w-48 h-48 motion-safe:drop-shadow-xl">
            <HeroDrone />
          </div>
          <div className="relative w-[420px] h-[420px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-secondary/15 to-accent animate-blob motion-reduce:animate-none ring-1 ring-primary/10 shadow-inner" />
            <div
              className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/20 animate-blob motion-reduce:animate-none"
              style={{ animationDelay: "2s" }}
            />

            <div className="absolute inset-[18%] rounded-full bg-primary/5 motion-safe:animate-hero-glow-pulse motion-reduce:animate-none blur-sm" />

            {/* floating elements */}
            <div className="absolute top-8 right-12 w-16 h-16 rounded-2xl glass-card flex items-center justify-center animate-float shadow-xl motion-reduce:animate-none transition-shadow duration-300 hover:shadow-primary/20">
              <Eye size={28} className="text-primary" />
            </div>
            <div className="absolute bottom-16 left-4 w-14 h-14 rounded-2xl glass-card flex items-center justify-center animate-float-slow shadow-xl motion-reduce:animate-none transition-transform duration-300 hover:scale-105">
              <MapPin size={24} className="text-secondary" />
            </div>
            <div
              className="absolute top-1/2 right-0 w-12 h-12 rounded-xl glass-card flex items-center justify-center animate-float shadow-lg motion-reduce:animate-none"
              style={{ animationDelay: "3s" }}
            >
              <BarChart3 size={20} className="text-primary" />
            </div>
            <div
              className="absolute bottom-8 right-20 w-14 h-14 rounded-2xl glass-card flex items-center justify-center animate-float-slow shadow-xl motion-reduce:animate-none"
              style={{ animationDelay: "1s" }}
            >
              <Brain size={24} className="text-secondary" />
            </div>

            {/* center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-24 h-24 rounded-3xl bg-primary/90 shadow-2xl shadow-primary/30 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-105 motion-safe:hover:rotate-1">
                <Droplets size={44} className="text-primary-foreground" />
                <span className="absolute inset-0 rounded-3xl ring-2 ring-primary-foreground/20 motion-safe:animate-ping motion-reduce:animate-none opacity-40" />
              </div>
            </div>

            {/* scan ring */}
            <div className="absolute inset-8 rounded-full border-2 border-dashed border-primary/25 animate-[spin_24s_linear_infinite] motion-reduce:animate-none" />
            <div className="absolute inset-14 rounded-full border border-primary/10 animate-[spin_32s_linear_infinite_reverse] motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── About ─── */
function About() {
  const steps = [
    { icon: Eye, title: "Detect", desc: "AI cameras and drones scan waterways in real time to identify plastic waste." },
    { icon: Brain, title: "Analyze", desc: "Machine learning models predict pollution trends and hotspots." },
    { icon: Zap, title: "Act", desc: "Automated alerts and cleanup recommendations reach authorities instantly." },
  ];

  return (
    <section id="about" className="py-24 bg-muted/40 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-medium text-primary tracking-wide uppercase motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
            About Us
          </span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl mt-3 text-foreground">About AquaGuard AI</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            AquaGuard AI combines computer vision, predictive analytics, and community engagement
            to create a powerful platform that detects plastic pollution, forecasts trends, and helps
            authorities take decisive action to protect our waterways.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <FadeIn key={s.title} delayMs={i * 90}>
              <div className="glass-card rounded-2xl p-8 text-center border border-transparent hover:border-primary/20 hover:shadow-xl hover:-translate-y-1 motion-safe:hover:scale-[1.02] transition-all duration-500 h-full">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <s.icon size={28} className="text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Benefits ─── */
function Benefits() {
  const items = [
    { icon: Radio, title: "Real-time Monitoring", desc: "Continuous surveillance of water bodies with instant pollution alerts." },
    { icon: Zap, title: "Faster Cleanup", desc: "AI-prioritized cleanup routes reduce response time by up to 60%." },
    { icon: Users, title: "Community Involvement", desc: "Engage citizens through gamified reporting and local cleanup events." },
    { icon: Leaf, title: "Sustainable Impact", desc: "Data-driven strategies that create lasting environmental change." },
  ];

  return (
    <section id="benefits" className="py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-medium text-secondary tracking-wide uppercase motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
            Benefits
          </span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl mt-3 text-foreground">Why AquaGuard AI?</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our platform delivers measurable environmental impact through cutting-edge technology and community collaboration.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((b, i) => (
            <FadeIn key={b.title}>
              <div className="group glass-card rounded-2xl p-8 border border-transparent hover:border-secondary/25 hover:shadow-xl hover:-translate-y-1 motion-safe:hover:scale-[1.015] transition-all duration-500 h-full">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
                  <b.icon size={24} className="text-secondary" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{b.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    { icon: Shield, title: "AI Plastic Detection", desc: "Advanced computer vision identifies plastic waste across water surfaces with 95%+ accuracy." },
    { icon: BarChart3, title: "Pollution Prediction", desc: "Machine learning models forecast pollution hotspots before they escalate." },
    { icon: Lightbulb, title: "Smart Recommendations", desc: "Automated cleanup strategies optimized for cost, speed, and environmental impact." },
    { icon: ClipboardList, title: "Task Assignment", desc: "Assign and track cleanup tasks across teams with real-time progress updates." },
    { icon: MapPin, title: "Live Dashboard & Heatmaps", desc: "Interactive maps showing real-time pollution data, trends, and cleanup progress." },
  ];

  return (
    <section id="features" className="py-24 bg-muted/40 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-medium text-primary tracking-wide uppercase motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
            Features
          </span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl mt-3 text-foreground">Powerful Tools for a Cleaner Planet</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Everything you need to detect, analyze, and act on plastic pollution — all in one platform.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <FadeIn key={f.title}>
              <div className="group glass-card rounded-2xl p-8 border border-transparent hover:border-primary/20 hover:shadow-xl hover:-translate-y-1 motion-safe:hover:scale-[1.015] transition-all duration-500 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <f.icon size={24} className="text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const links = ["Home", "About", "Benefits", "Features"];
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          {/* brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Droplets className="text-primary-foreground" size={20} />
              </div>
              <span className="font-heading font-bold text-lg text-foreground">AquaGuard <span className="text-primary">AI</span></span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              AI-powered plastic pollution detection and cleanup platform — building cleaner oceans, one algorithm at a time.
            </p>
          </div>

          {/* links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l}>
                  <button onClick={() => scroll(l.toLowerCase())} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* social */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Connect</h4>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-300 motion-safe:hover:scale-110 motion-safe:active:scale-95"
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AquaGuard AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Index() {
  return (
    <div className="font-body min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <About />
      <Benefits />
      <Features />
      <Footer />
    </div>
  );
}
