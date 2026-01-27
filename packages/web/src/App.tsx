import { Terminal, Shield, Users, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Hero */}
      <header className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          <span className="text-6xl mr-3">🐟</span>
          <span className="text-blue-400">tuna</span>
        </h1>
        <p className="text-2xl text-slate-300 mb-8">
          Cloudflare Tunnels for humans
        </p>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
          Wrap any dev command with a secure, persistent tunnel. Free custom domains, 
          team collaboration, and Zero Trust access control — all from your terminal.
        </p>
        
        {/* Code example */}
        <div className="bg-slate-950 rounded-lg p-6 max-w-xl mx-auto text-left font-mono text-sm mb-12">
          <div className="text-slate-500 mb-2"># Just prefix your command</div>
          <div className="text-green-400">$ tuna vite dev</div>
          <div className="text-slate-400 mt-4">
            <span className="text-blue-400">✓</span> Tunnel active
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400 ml-2">https://my-app.example.com</span> <span className="text-slate-600">→ localhost:5173</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center">
          <a
            href="https://docs.tuna.oxc.sh"
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </a>
          <a
            href="https://github.com/zeroexcore/tuna"
            className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            View on GitHub
          </a>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">Why tuna?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Terminal className="w-8 h-8" />}
            title="Zero Config"
            description="Just add two lines to package.json. No YAML, no dashboard clicking."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Persistent Tunnels"
            description="Runs as a service. Survives terminal restarts. Always available."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Team Friendly"
            description="$USER variables give each developer their own subdomain automatically."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Zero Trust"
            description="Restrict access by email or domain. Config-driven, no dashboard needed."
          />
        </div>
      </section>

      {/* Comparison */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">How it compares</h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl mx-auto">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4">Feature</th>
                <th className="text-center py-4 px-4 text-blue-400">tuna</th>
                <th className="text-center py-4 px-4">ngrok</th>
                <th className="text-center py-4 px-4">localtunnel</th>
                <th className="text-center py-4 px-4">cloudflared</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <ComparisonRow feature="Free custom domains" tuna ngrok={false} localtunnel={false} cloudflared />
              <ComparisonRow feature="Persistent tunnels" tuna ngrok={false} localtunnel={false} cloudflared />
              <ComparisonRow feature="Zero config" tuna ngrok={false} localtunnel cloudflared={false} />
              <ComparisonRow feature="Wrapper mode" tuna ngrok={false} localtunnel={false} cloudflared={false} />
              <ComparisonRow feature="Team collaboration" tuna ngrok={false} localtunnel={false} cloudflared={false} />
              <ComparisonRow feature="Access control (config)" tuna ngrok={false} localtunnel={false} cloudflared={false} />
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-slate-500">
        <p>MIT License • Built with Cloudflare Tunnels</p>
      </footer>
    </div>
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
    <div className="bg-slate-800/50 rounded-lg p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
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
  const Check = () => <span className="text-green-400">✓</span>;
  const Cross = () => <span className="text-slate-600">✗</span>;

  return (
    <tr className="border-b border-slate-800">
      <td className="py-3 px-4">{feature}</td>
      <td className="text-center py-3 px-4">{tuna ? <Check /> : <Cross />}</td>
      <td className="text-center py-3 px-4">{ngrok ? <Check /> : <Cross />}</td>
      <td className="text-center py-3 px-4">{localtunnel ? <Check /> : <Cross />}</td>
      <td className="text-center py-3 px-4">{cloudflared ? <Check /> : <Cross />}</td>
    </tr>
  );
}

export default App;
