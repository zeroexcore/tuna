import {
  Terminal,
  Shield,
  Users,
  Zap,
  Github,
  BookOpen,
  Globe,
  Smartphone,
  Package,
  LayoutGrid,
  Check,
  X,
  MapPin,
} from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-100 px-6 py-6 flex items-center justify-between text-sm font-medium tracking-tight">
        <div className="flex items-center gap-10">
          <a href="/" className="flex items-center group">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-extrabold text-xl transition-transform group-hover:rotate-12">
              t.
            </div>
          </a>
          <div className="hidden lg:flex items-center gap-8 text-text-muted">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#compare" className="hover:text-white transition-colors">
              Compare
            </a>
            <a
              href="https://docs.tuna.oxc.sh"
              className="hover:text-white transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <a
            href="https://github.com/zeroexcore/tuna"
            className="hidden md:flex items-center gap-2 text-text-muted hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="https://docs.tuna.oxc.sh"
            className="px-5 py-2.5 bg-surface-alt hover:bg-white hover:text-black border border-border-light rounded-lg transition-all duration-300"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-110 hidden md:flex items-center gap-2 p-2 glass-nav rounded-2xl shadow-2xl">
        <div className="flex items-center gap-1 pr-4 border-r border-border-light">
          <NavButton icon={<LayoutGrid className="w-5 h-5" />} href="#features" title="Features" />
          <NavButton icon={<Globe className="w-5 h-5" />} href="#compare" title="Compare" />
          <NavButton icon={<Smartphone className="w-5 h-5" />} href="https://docs.tuna.oxc.sh" title="Docs" />
          <NavButton icon={<Package className="w-5 h-5" />} href="https://www.npmjs.com/package/@zeroexcore/tuna" title="npm" />
        </div>
        <a
          href="https://github.com/zeroexcore/tuna"
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-black font-bold text-sm tracking-wide uppercase rounded-xl transition-all"
        >
          Star on GitHub
        </a>
      </div>

      {/* Hero */}
      <header className="relative h-screen w-full flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#050505_70%)] opacity-60" />
        </div>

        <div className="relative z-10 animate-fade-up">
          <h1 className="hero-text font-bold text-white text-center">/tuna</h1>
        </div>

        <p className="relative z-10 mt-8 text-xl md:text-2xl text-text-muted font-medium tracking-tight animate-fade-up-delay-1">
          Cloudflare Tunnels for humans
        </p>

        {/* Code example */}
        <div className="relative z-10 mt-12 bg-surface rounded-2xl p-8 max-w-xl w-full mx-6 font-mono text-sm border border-border animate-fade-up-delay-2">
          <div className="text-text-dim mb-2"># Just prefix your command</div>
          <div className="text-accent font-semibold">$ tuna vite dev</div>
          <div className="text-text-muted mt-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            Tunnel active
          </div>
          <div className="text-text-muted mt-1">
            <span className="text-accent ml-6">
              https://my-app.example.com
            </span>{' '}
            <span className="text-text-faint">→ localhost:5173</span>
          </div>
        </div>

        {/* Bottom overlays */}
        <div className="absolute bottom-12 left-8 md:left-12 flex items-center gap-5 group animate-fade-up-delay-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <p className="text-xs md:text-sm font-medium leading-tight text-text-muted group-hover:text-white transition-colors">
            Open source.
            <br />
            Free forever.
          </p>
        </div>

        <div className="absolute bottom-12 right-8 md:right-12 text-right animate-fade-up-delay-3">
          <a
            href="https://docs.tuna.oxc.sh"
            className="text-white font-medium hover:text-accent transition-colors border-b-2 border-white hover:border-accent pb-1"
          >
            Get started →
          </a>
        </div>
      </header>

      {/* Benefits */}
      <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-text-dim uppercase">
            Why launch slow when you can move fast?
          </span>
        </div>

        <h2 className="text-4xl md:text-7xl font-medium leading-[1.05] tracking-tight text-white max-w-5xl mb-24">
          Secure tunnels that help you{' '}
          <span className="text-text-dim">ship faster</span> and collaborate
          everywhere.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Benefit Card 1 */}
          <div className="bg-surface rounded-[2.5rem] p-12 min-h-[520px] flex flex-col justify-between relative overflow-hidden group hover:bg-surface-hover transition-all duration-500">
            <div className="absolute top-10 right-10 bg-surface-alt text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-widest text-text-muted border border-border-light">
              Zero Config
            </div>
            <div className="mt-auto">
              <h3 className="text-5xl md:text-7xl font-semibold tracking-tighter mb-2 text-white">
                Start faster.
              </h3>
              <h3 className="text-5xl md:text-7xl font-semibold tracking-tighter text-text-faint group-hover:text-text-dim transition-colors">
                Ship sooner.
              </h3>
            </div>
          </div>

          {/* Benefit Card 2 — Terminal mockup */}
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[2.5rem] p-8 md:p-12 min-h-[520px] flex items-center justify-center relative overflow-hidden group">
            <div className="w-full max-w-md bg-[#0d0d0d] rounded-xl shadow-2xl overflow-hidden transform group-hover:scale-105 transition-transform duration-700 ease-out">
              <div className="bg-[#1a1a1a] px-4 py-3 border-b border-[#333] flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-4 text-[10px] text-[#666] font-mono">
                  ~/my-project
                </span>
              </div>
              <div className="p-6 font-mono text-sm space-y-3">
                <div className="text-[#666]">
                  $ npm install -g @zeroexcore/tuna
                </div>
                <div className="text-green-400">✓ Installed</div>
                <div className="text-[#666] mt-2">$ tuna vite dev</div>
                <div className="text-white mt-2">
                  <span className="text-blue-400">⠋</span> Starting Cloudflare
                  tunnel...
                </div>
                <div className="text-green-400">
                  ✓ Tunnel active
                </div>
                <div className="text-accent">
                  → https://my-app.example.com
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-20 border-b border-border pb-10">
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-accent">
            Features
          </h2>
          <span className="hidden md:block text-text-faint text-xs font-medium uppercase tracking-widest">
            Built on Cloudflare
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
          <FeatureCard
            icon={<Terminal className="w-7 h-7" />}
            title="Minimal Config"
            description="Two lines in package.json. No YAML files, no dashboard clicking. Prefix any command and go."
          />
          <FeatureCard
            icon={<Zap className="w-7 h-7" />}
            title="Persistent Tunnels"
            description="Runs as a service. Survives terminal restarts. Your tunnel stays available even when you step away."
          />
          <FeatureCard
            icon={<Users className="w-7 h-7" />}
            title="Team Friendly"
            description="$USER variables give each developer their own subdomain automatically. No conflicts, no coordination."
          />
          <FeatureCard
            icon={<Shield className="w-7 h-7" />}
            title="Zero Trust"
            description="Restrict access by email or domain. Config-driven access control, no dashboard needed."
          />
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-20 border-b border-border pb-10">
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-accent">
            How it Compares
          </h2>
          <span className="hidden md:block text-text-faint text-xs font-medium uppercase tracking-widest">
            Feature Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl mx-auto">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-5 px-6 text-text-muted text-xs font-bold uppercase tracking-widest">
                  Feature
                </th>
                <th className="text-center py-5 px-6 text-accent text-xs font-bold uppercase tracking-widest">
                  tuna
                </th>
                <th className="text-center py-5 px-6 text-text-dim text-xs font-bold uppercase tracking-widest">
                  ngrok
                </th>
                <th className="text-center py-5 px-6 text-text-dim text-xs font-bold uppercase tracking-widest">
                  localtunnel
                </th>
                <th className="text-center py-5 px-6 text-text-dim text-xs font-bold uppercase tracking-widest">
                  cloudflared
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                feature="Free custom domains"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared
              />
              <ComparisonRow
                feature="Wrap dev commands"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared={false}
              />
              <ComparisonRow
                feature="Per-developer subdomains"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared={false}
              />
              <ComparisonRow
                feature="Config in package.json"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared={false}
              />
              <ComparisonRow
                feature="Run as OS service"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared
              />
              <ComparisonRow
                feature="Config-driven access control"
                tuna
                ngrok={false}
                localtunnel={false}
                cloudflared={false}
              />
              <ComparisonRow
                feature="No account required"
                tuna={false}
                ngrok={false}
                localtunnel
                cloudflared={false}
              />
              <ComparisonRow
                feature="Traffic inspection"
                tuna={false}
                ngrok
                localtunnel={false}
                cloudflared={false}
              />
              <ComparisonRow
                feature="Fully free"
                tuna
                ngrok={false}
                localtunnel
                cloudflared
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative pt-48 pb-32 px-6 md:px-12 border-t border-surface-alt">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-16">
          <div className="flex-1">
            <h2 className="text-[14vw] md:text-[10vw] leading-[0.85] font-black tracking-tighter text-white mb-12 select-none">
              LET'S
              <br />
              TUNNEL.
            </h2>
            <div className="flex flex-col gap-6">
              <a
                href="https://docs.tuna.oxc.sh"
                className="text-3xl md:text-4xl font-semibold hover:text-accent transition-all w-fit"
              >
                Get started now →
              </a>
              <p className="text-text-dim flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Open source. Works everywhere.
              </p>
            </div>
          </div>

          <div className="flex gap-4 md:mb-6">
            <SocialLink
              href="https://github.com/zeroexcore/tuna"
              icon={<Github className="w-5 h-5" />}
            />
            <SocialLink
              href="https://docs.tuna.oxc.sh"
              icon={<BookOpen className="w-5 h-5" />}
            />
            <SocialLink
              href="https://www.npmjs.com/package/@zeroexcore/tuna"
              icon={<Package className="w-5 h-5" />}
            />
            <SocialLink
              href="https://tuna.oxc.sh"
              icon={<Globe className="w-5 h-5" />}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-40 pt-10 border-t border-surface flex flex-col md:flex-row justify-between text-text-ghost text-[10px] font-bold uppercase tracking-widest">
          <p>MIT License — Built on Cloudflare Tunnels</p>
          <div className="flex gap-10 mt-6 md:mt-0">
            <a
              href="https://github.com/zeroexcore/tuna"
              className="hover:text-text-dim transition-colors"
            >
              Source Code
            </a>
            <a
              href="https://docs.tuna.oxc.sh"
              className="hover:text-text-dim transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavButton({
  icon,
  href,
  title,
}: {
  icon: React.ReactNode;
  href: string;
  title: string;
}) {
  return (
    <a
      href={href}
      className="p-3 hover:bg-[#222] rounded-xl transition-all text-white"
      title={title}
    >
      {icon}
    </a>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="group cursor-default">
      <div className="flex items-start gap-6">
        <div className="p-4 rounded-2xl border border-border-light text-accent group-hover:bg-accent group-hover:text-black group-hover:border-transparent transition-all duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight mb-3 group-hover:text-accent transition-colors">
            {title}
          </h3>
          <p className="text-text-muted leading-relaxed max-w-md">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function ComparisonRow({
  feature,
  tuna,
  ngrok,
  localtunnel,
  cloudflared,
}: {
  feature: string;
  tuna: boolean;
  ngrok: boolean;
  localtunnel: boolean;
  cloudflared: boolean;
}) {
  return (
    <tr className="border-b border-border group hover:bg-surface/50 transition-colors">
      <td className="py-5 px-6 text-text-primary font-medium">{feature}</td>
      <td className="text-center py-5 px-6">
        {tuna ? (
          <Check className="w-5 h-5 text-accent mx-auto" />
        ) : (
          <X className="w-5 h-5 text-text-ghost mx-auto" />
        )}
      </td>
      <td className="text-center py-5 px-6">
        {ngrok ? (
          <Check className="w-5 h-5 text-green-400 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-text-ghost mx-auto" />
        )}
      </td>
      <td className="text-center py-5 px-6">
        {localtunnel ? (
          <Check className="w-5 h-5 text-green-400 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-text-ghost mx-auto" />
        )}
      </td>
      <td className="text-center py-5 px-6">
        {cloudflared ? (
          <Check className="w-5 h-5 text-green-400 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-text-ghost mx-auto" />
        )}
      </td>
    </tr>
  );
}

function SocialLink({
  href,
  icon,
}: {
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-14 h-14 border border-border-light rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all hover:-translate-y-2"
    >
      {icon}
    </a>
  );
}

export default App;
