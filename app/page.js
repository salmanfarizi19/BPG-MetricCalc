"use client"

import React from "react"
import Link from "next/link"
import { Activity, Trophy, Shield, ArrowRight, BarChart3 } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">

      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Activity size={24} className="text-white"/>
            </div>

            <span className="text-xl font-bold tracking-tight">
              BPG MetricCalc<span className="text-emerald-500">.</span>
            </span>
          </div>

          <div className="flex items-center gap-4">

            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
            >
              Log In
            </Link>

<Link
  href="/login?mode=signup"
  className="text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full transition-all shadow-lg shadow-emerald-500/20"
>
  Sign Up
</Link>

          </div>
        </div>
      </nav>


      {/* Hero */}
      <main className="relative overflow-hidden">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"/>

        <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center relative z-10">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-emerald-400 shadow-sm mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
            Built for Elite Basketball Programs
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">

            Manage Load.<br/>

            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              Maximize the Season.
            </span>

          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">

            The ultimate RPE training load tracker for basketball coaches.
            Monitor player fatigue, calculate ACWR, prevent injuries,
            and ensure your squad peaks for the playoffs.

          </p>

<Link
  href="/login?mode=signup"
  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-emerald-500/25"
>
  Get Started
  <ArrowRight size={20}/>
</Link>

        </div>


        {/* Features */}
        <div className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200">

          <div className="text-center mb-16">

            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Why Use BPG MetricCalc
            </h2>

            <p className="text-slate-600 max-w-2xl mx-auto">
              Stop guessing when to push and when to rest. Let data drive your practice planning and game-day rotations.
            </p>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">


            {/* Feature 1 */}
            <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">

              <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition">

                <BarChart3 size={28} className="text-slate-500 group-hover:text-emerald-500"/>

              </div>

              <h3 className="text-xl font-bold mb-3">
                Load Monitoring
              </h3>

              <p className="text-slate-600">
                Players log their Session RPE (sRPE) in seconds after practices, games, or workouts.
              </p>

            </div>


            {/* Feature 2 */}
            <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">

              <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition">

                <Shield size={28} className="text-slate-500 group-hover:text-emerald-500"/>

              </div>

              <h3 className="text-xl font-bold mb-3">
                Injury Prevention
              </h3>

              <p className="text-slate-600">
                Automatic Acute:Chronic Workload Ratio (ACWR) calculations flag players at risk.
              </p>

            </div>


            {/* Feature 3 */}
            <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">

              <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition">

                <Trophy size={28} className="text-slate-500 group-hover:text-emerald-500"/>

              </div>

              <h3 className="text-xl font-bold mb-3">
                Peak Performance
              </h3>

              <p className="text-slate-600">
                Optimize training intensity so players peak when it matters most.
              </p>

            </div>

          </div>

        </div>

      </main>


      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 text-center text-slate-500 text-sm">

        © {new Date().getFullYear()} TSF.Co All rights reserved.
      </footer>

    </div>
  )
}