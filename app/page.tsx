"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* BACKGROUND GLOW */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">

        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-3xl" />

        <div className="absolute bottom-[-250px] left-[-150px] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="absolute bottom-[-250px] right-[-150px] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />

      </div>

      {/* HEADER */}

      <header className="relative z-10 border-b border-slate-800 bg-[#050d19]/80 backdrop-blur">

        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>

            <h1 className="text-xl font-bold text-blue-400">
              CivicPulse AI
            </h1>

            <p className="text-xs text-slate-500">
              From Citizen Voices to Infrastructure Priorities
            </p>

          </div>

          <div className="text-xs text-slate-500">
            AI-Powered Civic Infrastructure
          </div>

        </div>

      </header>

      {/* HERO */}

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-12">

        <div className="text-center max-w-3xl mx-auto">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-semibold mb-6">

            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />

            AI FOR DIGITAL PUBLIC INFRASTRUCTURE

          </div>

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">

            Turning Citizen Voices Into

            <span className="block text-blue-400 mt-2">
              Infrastructure Action
            </span>

          </h2>

          <p className="text-slate-400 text-base md:text-lg mt-6 leading-relaxed">

            CivicPulse AI connects citizens and government
            through intelligent complaint analysis, hotspot
            detection and transparent infrastructure
            prioritization.

          </p>

        </div>

      </section>

      {/* PORTAL SELECTION */}

      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">

        <p className="text-center text-slate-500 text-sm mb-6">
          Choose your portal to continue
        </p>

        <div className="grid md:grid-cols-2 gap-6">

          {/* CITIZEN PORTAL */}

          <button
            onClick={() => router.push("/login?role=citizen")}
            className="group text-left bg-[#0d1b2e] border border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
          >

            <div className="flex items-start justify-between">

              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
                👤
              </div>

              <span className="text-slate-600 group-hover:text-blue-400 transition text-xl">
                →
              </span>

            </div>

            <h3 className="text-2xl font-bold mt-6">
              Citizen Portal
            </h3>

            <p className="text-slate-400 mt-3 leading-relaxed">
              Report infrastructure problems, submit
              complaints and track government action
              on your requests.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                Report Issues
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                Track Complaints
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                AI Analysis
              </span>

            </div>

            <div className="mt-7 text-blue-400 font-semibold text-sm">
              Enter Citizen Portal →
            </div>

          </button>

          {/* GOVERNMENT PORTAL */}

          <button
            onClick={() => router.push("/login?role=admin")}
            className="group text-left bg-[#0d1b2e] border border-slate-700 hover:border-purple-500/60 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10"
          >

            <div className="flex items-start justify-between">

              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl">
                🏛️
              </div>

              <span className="text-slate-600 group-hover:text-purple-400 transition text-xl">
                →
              </span>

            </div>

            <h3 className="text-2xl font-bold mt-6">
              Government Portal
            </h3>

            <p className="text-slate-400 mt-3 leading-relaxed">
              Analyze citizen demand, identify infrastructure
              hotspots and manage complaints using
              AI-powered insights.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                Hotspot Detection
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                Priority Scoring
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
                AI Intelligence
              </span>

            </div>

            <div className="mt-7 text-purple-400 font-semibold text-sm">
              Enter Government Portal →
            </div>

          </button>

        </div>

      </section>

      {/* ABOUT CIVICPULSE AI */}

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <div className="border-t border-slate-800 pt-16">
          <p className="text-sm font-semibold text-blue-400">ABOUT CIVICPULSE AI</p>
          <h2 className="mt-3 text-3xl font-bold">About CivicPulse AI</h2>
          <p className="mt-5 max-w-4xl leading-relaxed text-slate-400">
            CivicPulse AI is an AI-powered civic infrastructure platform that connects citizen voices with government action. Citizens can report infrastructure problems through text or voice, while government administrators can analyze complaints, identify infrastructure hotspots, prioritize urgent issues, and track action through a centralized dashboard.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <p className="text-sm font-semibold text-blue-400">HOW IT WORKS</p>
        <h2 className="mt-3 text-3xl font-bold">How CivicPulse AI Works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Report", "Citizens submit infrastructure issues using text or voice."],
            ["02", "Analyze", "AI analyzes the complaint and identifies relevant category, severity, and infrastructure information."],
            ["03", "Prioritize", "Citizen reports are grouped into infrastructure hotspots and prioritized using transparent, data-driven scoring."],
            ["04", "Act", "Government administrators manage complaints, assign actions, and track resolution."],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl border border-slate-700 bg-[#0d1b2e] p-5">
              <p className="text-sm font-semibold text-blue-400">{number}</p>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT CIVICPULSE ENABLES */}

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <p className="text-sm font-semibold text-blue-400">CIVIC INFRASTRUCTURE SUPPORT</p>
        <h2 className="mt-3 text-3xl font-bold">What CivicPulse Enables</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Citizen Voice", "Multilingual text and voice-based infrastructure reporting."],
            ["AI Analysis", "AI-assisted analysis of citizen infrastructure complaints."],
            ["Hotspot Detection", "Identify areas with concentrated infrastructure demand."],
            ["Government Action", "Manage complaints, track progress, and monitor resolution."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-slate-700 bg-[#0d1b2e] p-5">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT US */}

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-700 bg-[#0d1b2e] p-6 md:p-8">
          <p className="text-sm font-semibold text-blue-400">CONTACT US</p>
          <h2 className="mt-3 text-3xl font-bold">Contact Us</h2>
          <p className="mt-4 text-slate-400">Have questions about CivicPulse AI or want to learn more about the project?</p>
          <div className="mt-6 space-y-2 text-sm text-slate-300">
            <p>Team: DuoLogic</p>
            <p>Project: CivicPulse AI</p>
            <p>Email: pranavshimpi2006@gmail.com</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="relative z-10 border-t border-slate-800">

        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">

          <p className="text-xs text-slate-600">
            CivicPulse AI
          </p>

          <p className="text-xs text-slate-600">
            From Citizen Voices to Infrastructure Priorities
          </p>

          <p className="text-xs text-slate-600">DuoLogic</p>

        </div>

      </footer>

    </main>
  );
}
