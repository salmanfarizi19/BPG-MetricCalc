"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  AreaChart,
  Area
} from "recharts"
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Target,
  CheckCircle2,
  Calendar
} from "lucide-react"

export default function PlayerPage() {
  const router = useRouter()
  const { id } = useParams()
  const [acwrTrend, setAcwrTrend] = useState([])
  const [sessions, setSessions] = useState([])
  const [player, setPlayer] = useState(null)
  
  const [projRpe, setProjRpe] = useState(5)
  const [projDuration, setProjDuration] = useState(60)
  const [projectedAcwr, setProjectedAcwr] = useState(0)

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [sessionDate, setSessionDate] = useState("")
  const [sessionRpe, setSessionRpe] = useState(5)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [sessionType, setSessionType] = useState("")
  const [sessionNotes, setSessionNotes] = useState("")

  useEffect(() => {
    if (!id) return
    loadPlayer()
    loadSessions()
  }, [id])

  useEffect(() => {
    calculateAcwrTrend()
  }, [sessions])

  useEffect(() => {
    calculateProjectedAcwr()
  }, [projRpe, projDuration, sessions])

  async function loadPlayer() {
    const { data } = await supabase.from("players").select("*").eq("id", id).single()
    setPlayer(data)
  }

  async function loadSessions() {
    const { data } = await supabase.from("sessions").select("*").eq("player_id", id).order("date", { ascending: false })
    setSessions(data || [])
  }

  function openAddSession() {
    setEditingSession(null)
    setSessionDate(new Date().toISOString().slice(0, 10))
    setSessionRpe(5)
    setSessionDuration(60)
    setSessionType("")
    setSessionNotes("")
    setShowSessionModal(true)
  }

  function openEditSession(session) {
    setEditingSession(session)
    setSessionDate(session.date)
    setSessionRpe(session.rpe)
    setSessionDuration(session.duration)
    setSessionType(session.session_type || "")
    setSessionNotes(session.notes || "")
    setShowSessionModal(true)
  }

  async function saveSession() {
    const load = sessionRpe * sessionDuration

    if (editingSession) {
      await supabase
        .from("sessions")
        .update({
          date: sessionDate,
          rpe: sessionRpe,
          duration: sessionDuration,
          load,
          session_type: sessionType,
          notes: sessionNotes,
        })
        .eq("id", editingSession.id)
    } else {
      await supabase.from("sessions").insert({
        player_id: id,
        date: sessionDate,
        rpe: sessionRpe,
        duration: sessionDuration,
        load,
        session_type: sessionType,
        notes: sessionNotes,
      })
    }
    setShowSessionModal(false)
    loadSessions()
  }

  async function deleteSession(sessionId) {
    if (!confirm("Delete this session?")) return
    await supabase.from("sessions").delete().eq("id", sessionId)
    loadSessions()
  }

  function calculateWeeklyLoad() {
    const weeks = {}
    sessions.forEach(s => {
      const date = new Date(s.date)
      const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
      if (!weeks[week]) weeks[week] = 0
      weeks[week] += Number(s.load || 0)
    })
    return Object.entries(weeks).map(([week, load]) => ({ week, load })).reverse()
  }

  function calculateLoadTrend() {
    if (!Array.isArray(sessions)) return []
    const trend = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      let acute = 0
      let chronic = 0
      sessions.forEach(s => {
        const load = Number(s.load || 0)
        const sessionDate = new Date(s.date)
        const diffDays = (d - sessionDate) / (1000 * 60 * 60 * 24)
        if (diffDays <= 7 && diffDays >= 0) acute += load
        if (diffDays <= 28 && diffDays >= 0) chronic += load
      })
      trend.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        acute,
        chronic: chronic / 4
      })
    }
    return trend
  }

  function calculateStats() {
    if (!Array.isArray(sessions)) {
      return { totalSessions: 0, totalLoad: 0, acute: 0, chronic: 0, acwr: 0, avgLoad: 0, maxLoad: 0 }
    }
    const today = new Date()
    let acute = 0, chronic = 0, totalLoad = 0, maxLoad = 0

    sessions.forEach((s) => {
      const load = Number(s.load || 0)
      const sessionDate = new Date(s.date)
      const diffDays = (today - sessionDate) / (1000 * 60 * 60 * 24)

      totalLoad += load
      if (load > maxLoad) maxLoad = load
      if (diffDays <= 7) acute += load
      if (diffDays <= 28) chronic += load
    })

    const chronicAvg = chronic / 4
    const acwr = chronicAvg === 0 ? 0 : acute / chronicAvg
    const avgLoad = sessions.length ? totalLoad / sessions.length : 0

    return { totalSessions: sessions.length, totalLoad, acute, chronic: chronicAvg, acwr, avgLoad, maxLoad }
  }

  function calculateSpike() {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { spike: 0, level: "Safe" }
    }
    const today = new Date()
    let currentWeek = 0, previousWeek = 0

    sessions.forEach((s) => {
      const load = Number(s.load || 0)
      const sessionDate = new Date(s.date)
      const diffDays = (today - sessionDate) / (1000 * 60 * 60 * 24)

      if (diffDays <= 7) currentWeek += load
      if (diffDays > 7 && diffDays <= 14) previousWeek += load
    })

    if (previousWeek === 0) return { spike: 0, level: "Safe" }

    const spikeVal = ((currentWeek - previousWeek) / previousWeek) * 100
    let level = "Safe"
    if (spikeVal > 30) level = "High Spike"
    else if (spikeVal > 10) level = "Moderate Spike"

    return { spike: spikeVal, level }
  }

  function calculateProjectedAcwr() {
    if (!Array.isArray(sessions)) return
    const projectedLoad = projRpe * projDuration
    const today = new Date()
    let acute = 0, chronic = 0

    sessions.forEach((s) => {
      const load = Number(s.load || 0)
      const sessionDate = new Date(s.date)
      const diffDays = (today - sessionDate) / (1000 * 60 * 60 * 24)
      if (diffDays <= 7) acute += load
      if (diffDays <= 28) chronic += load
    })

    const acuteProjected = acute + projectedLoad
    const chronicProjected = chronic + projectedLoad
    const chronicAvg = chronicProjected / 4
    const acwr = chronicAvg === 0 ? 0 : acuteProjected / chronicAvg

    setProjectedAcwr(acwr)
  }

  function calculateAcwrTrend() {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      setAcwrTrend([])
      return
    }
    const trend = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      let acute = 0, chronic = 0

      sessions.forEach((s) => {
        const load = Number(s.load || 0)
        const sessionDate = new Date(s.date)
        const diffDays = (d - sessionDate) / (1000 * 60 * 60 * 24)

        if (diffDays <= 7 && diffDays >= 0) acute += load
        if (diffDays <= 28 && diffDays >= 0) chronic += load
      })

      const chronicAvg = chronic / 4
      const acwr = chronicAvg === 0 ? 0 : acute / chronicAvg

      trend.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        acwr: Number(acwr.toFixed(2))
      })
    }
    setAcwrTrend(trend)
  }

  function getRisk(acwr) {
    if (acwr < 0.8) return { label: "Undertraining", color: "bg-amber-50 text-amber-700 border-amber-200" }
    if (acwr <= 1.3) return { label: "Optimal", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    if (acwr <= 1.5) return { label: "Risk Zone", color: "bg-orange-50 text-orange-700 border-orange-200" }
    return { label: "High Risk", color: "bg-rose-50 text-rose-700 border-rose-200" }
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading player data...</p>
        </div>
      </div>
    )
  }

  const stats = calculateStats()
  const risk = getRisk(stats.acwr)
  const spike = calculateSpike()

  const age = player.dob ? Math.floor((new Date() - new Date(player.dob)) / (365 * 24 * 60 * 60 * 1000)) : "N/A"

  const chartData = sessions
    .slice(0, 28)
    .map(s => ({
      date: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      load: s.load
    }))
    .reverse()

  const loadTrend = calculateLoadTrend()
  const weeklyLoad = calculateWeeklyLoad()

  const minAcute = stats.chronic * 0.8
  const maxAcute = stats.chronic * 1.3
  const minNextLoad = Math.max(0, Math.round(minAcute - stats.acute))
  const maxNextLoad = Math.max(0, Math.round(maxAcute - stats.acute))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-xl font-black shadow-md">
              {player.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{player.name}</h1>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-1">
                <span className="flex items-center gap-1.5"><User size={14} /> Age: {age}</span>
                <span className="flex items-center gap-1.5"><Target size={14} /> Pos: {player.position || "N/A"}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} /> {player.phone || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* PERFORMANCE STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sessions</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalSessions}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Load</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalLoad}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Load</p>
            <p className="text-2xl font-black text-slate-800">{Math.round(stats.avgLoad)}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Max Load</p>
            <p className="text-2xl font-black text-slate-800">{stats.maxLoad}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Acute Load</p>
            <p className="text-2xl font-black text-slate-800">{Math.round(stats.acute)}</p>
          </div>
          
          <div className={`border p-5 rounded-2xl shadow-sm ${risk.color}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">ACWR</p>
            <p className="text-3xl font-black mb-1">{stats.acwr.toFixed(2)}</p>
            <p className="text-xs font-bold">{risk.label}</p>
          </div>
          
          <div className={`border p-5 rounded-2xl shadow-sm ${
            spike.level === "High Spike" ? "bg-rose-50 text-rose-700 border-rose-200" 
            : spike.level === "Moderate Spike" ? "bg-orange-50 text-orange-700 border-orange-200" 
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Spike</p>
            <p className="text-3xl font-black mb-1">{spike.spike > 0 ? '+' : ''}{spike.spike.toFixed(0)}%</p>
            <p className="text-xs font-bold">{spike.level}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ACWR TREND */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="text-blue-500" size={20} />
              <h2 className="text-lg font-extrabold text-slate-800">ACWR Trend (Last 28 Days)</h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <LineChart data={acwrTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis domain={[0, 2]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  
                  <ReferenceArea y1={0} y2={0.8} fill="#fef3c7" fillOpacity={0.4} />
                  <ReferenceArea y1={0.8} y2={1.3} fill="#d1fae5" fillOpacity={0.4} />
                  <ReferenceArea y1={1.3} y2={1.5} fill="#ffedd5" fillOpacity={0.4} />
                  <ReferenceArea y1={1.5} y2={2} fill="#ffe4e6" fillOpacity={0.4} />
                  
                  <Line type="monotone" dataKey="acwr" stroke="#0f172a" strokeWidth={3} dot={{ r: 3, fill: '#0f172a' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PROJECTED ACWR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-blue-400" size={20} />
                <h2 className="text-lg font-extrabold">Simulate Next Session</h2>
              </div>
              
              <div className="flex gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Target RPE</p>
                  <input type="number" min="1" max="10" value={projRpe} onChange={(e)=>setProjRpe(Number(e.target.value))} className="bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 w-full text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mins</p>
                  <input type="number" value={projDuration} onChange={(e)=>setProjDuration(Number(e.target.value))} className="bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 w-full text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-400">Projected Load</p>
                  <p className="text-2xl font-black text-blue-400">{projRpe * projDuration}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-400">Resulting ACWR</p>
                  <p className={`text-4xl font-black ${projectedAcwr > 1.5 ? 'text-rose-400' : projectedAcwr < 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {projectedAcwr.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-white border border-slate-200 rounded-xl p-4 text-slate-900 mt-auto">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> Optimal Target</p>
              <p className="text-lg font-black text-slate-800">
                {minNextLoad} <span className="text-slate-400 font-medium mx-1">to</span> {maxNextLoad} <span className="text-sm font-medium text-slate-500 ml-1">Load</span>
              </p>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ACUTE vs CHRONIC LOAD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-800 mb-6">Acute vs Chronic Load</h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer>
                <AreaChart data={loadTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAcute" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorChronic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  
                  <Area type="monotone" dataKey="chronic" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorChronic)" name="Chronic Avg" />
                  <Area type="monotone" dataKey="acute" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAcute)" name="Acute (7 days)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* WEEKLY LOAD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-800 mb-6">Weekly Total Load</h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer>
                <BarChart data={weeklyLoad} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="load" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SESSION HISTORY */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-emerald-500" /> Session History
            </h2>
            <button
              onClick={openAddSession}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              <Plus size={18} strokeWidth={3} /> Add Session
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Date</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">Type</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">RPE</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">Duration</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">Load</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-medium">No sessions logged yet.</td></tr>
                ) : sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600">
                        {s.session_type || "Training"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{s.rpe}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{s.duration} <span className="text-slate-400 font-normal text-xs">m</span></td>
                    <td className="px-6 py-4 text-center font-black text-emerald-600">{s.load}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEditSession(s)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteSession(s.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ADD/EDIT SESSION MODAL */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-slate-800">
                {editingSession ? "Edit Session" : "Log New Session"}
              </h2>
              <button onClick={() => setShowSessionModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">RPE (1-10)</label>
                  <input type="number" min="1" max="10" value={sessionRpe} onChange={(e) => setSessionRpe(Number(e.target.value))} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (mins)</label>
                  <input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Session Type</label>
                <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                  <option value="">Training</option>
                  <option value="Match">Match</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Gym">Gym</option>
                </select>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center mt-2">
                <span className="font-bold text-emerald-800">Calculated Load</span>
                <span className="text-2xl font-black text-emerald-600">{sessionRpe * sessionDuration}</span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowSessionModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={saveSession} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-500/20 transition-colors">
                {editingSession ? "Save Changes" : "Log Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}