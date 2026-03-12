"use client"

import React, { useState, useEffect, useRef  } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Zap
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"


export default function Dashboard() {

  const [rpe, setRpe] = useState(5)
  const [duration, setDuration] = useState(60)
  const [date, setDate] = useState(
  new Date().toISOString().split("T")[0]
)
  const [sessions, setSessions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [menuOpen,setMenuOpen] = useState(false)
const menuRef = useRef(null)
  const router = useRouter()
  const [playerName,setPlayerName] = useState("")


  useEffect(()=>{

function handleClickOutside(event){

if(menuRef.current && !menuRef.current.contains(event.target)){
setMenuOpen(false)
}

}

document.addEventListener("mousedown",handleClickOutside)

return ()=>{
document.removeEventListener("mousedown",handleClickOutside)
}

},[])


  useEffect(() => {
    checkUser()
  }, [])
async function checkUser(){

const { data: { user } } = await supabase.auth.getUser()

if(!user){
router.push("/login")
return
}

// load player profile
const { data } = await supabase
.from("players")
.select("name")
.eq("id",user.id)
.single()

setPlayerName(data?.name || "")

loadSessions()

}
  async function loadSessions(){

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("player_id", user.id)
      .order("date", { ascending: false })

    if(error){
      console.error(error)
    } else {
      setSessions(data || [])
    }

  }
    async function logout(){

    await supabase.auth.signOut()

    router.push("/login")

  }
  async function submitSession(e){

    e.preventDefault()
    setIsSubmitting(true)

    const load = rpe * duration

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("sessions")
      .insert({
        player_id: user.id,
        date: date,
        rpe,
        duration,
        load
      })

    if(error){
      alert(error.message)
    } else {
      showNotification("Session saved successfully!")
      setRpe(5)
      setDuration(60)
      setDate(new Date().toISOString().split("T")[0])
      loadSessions()
    }

    setIsSubmitting(false)

  }

async function deleteSession(id){

  const confirmed = confirm("Delete this session?")

  if(!confirmed) return

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id",id)

  if(error){
    alert(error.message)
  }else{
    loadSessions()
  }

}


async function editSession(session){

  const newDate = prompt(
    "Enter Date (YYYY-MM-DD)",
    session.date.split("T")[0]
  )

  const newRpe = prompt("Enter RPE", session.rpe)

  const newDuration = prompt("Enter Duration (minutes)", session.duration)

  if(!newDate || !newRpe || !newDuration) return

  const load = newRpe * newDuration

  const { error } = await supabase
    .from("sessions")
    .update({
      date: newDate,
      rpe: Number(newRpe),
      duration: Number(newDuration),
      load
    })
    .eq("id",session.id)

  if(error){
    alert(error.message)
  }else{
    loadSessions()
  }

}


  function showNotification(message) {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

function calculateACWR() {

  if(sessions.length === 0) return 0

  const today = new Date()

  let acute = 0
  let chronic = 0

  sessions.forEach(s => {

    const sessionDate = new Date(s.date)

    const diffDays =
      (today - sessionDate) / (1000 * 60 * 60 * 24)

    if(diffDays <= 7){
      acute += s.load
    }

    if(diffDays <= 28){
      chronic += s.load
    }

  })

  const chronicAvg = chronic / 4

  if(chronicAvg === 0) return 0

  return (acute / chronicAvg).toFixed(2)

}

  




  function getRiskData(acwr) {

    const value = parseFloat(acwr)

    if (value === 0)
      return { label: "No Data", color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", icon: Activity }

    if (value < 0.8)
      return { label: "Undertraining", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertCircle }

    if (value <= 1.3)
      return { label: "Optimal", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle }

    if (value <= 1.5)
      return { label: "Risk Zone", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: AlertTriangle }

    return { label: "High Injury Risk", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle }

  }

  const acwr = calculateACWR()
  const riskData = getRiskData(acwr)
  const StatusIcon = riskData.icon

  const gaugePercent = Math.min((parseFloat(acwr) / 2.0) * 100, 100)
  const chartData = sessions
    .slice(0, 28)
    .map(s => ({
      date: new Date(s.date).toLocaleDateString(undefined,{ month:"short", day:"numeric" }),
      load: s.load
    }))
    .reverse()


const initials = playerName
? playerName
    .split(" ")
    .map(n=>n[0])
    .join("")
    .toUpperCase()
: "?"
  return (

    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

          <div>
<h1 className="text-3xl font-bold tracking-tight text-slate-900">
  Welcome, {playerName}
</h1>

            <p className="text-slate-500 mt-1">
              Track your workload and monitor injury risk.
            </p>
          </div>

<div className="flex items-center gap-4">

<div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${riskData.bg} ${riskData.border} ${riskData.color}`}>
<StatusIcon size={20}/>
<span className="font-semibold">{riskData.label}</span>
</div>

<div ref={menuRef} className="relative">

<button
onClick={()=>setMenuOpen(!menuOpen)}
className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold hover:bg-emerald-600"
>
{initials}
</button>

{menuOpen && (

<div className="absolute right-0 top-12 bg-white border rounded-xl shadow-lg w-44">

<button
onClick={()=>router.push("/profile")}
className="block w-full text-left px-4 py-2 hover:bg-slate-100"
>
Edit Profile
</button>

<button
onClick={()=>router.push("/update-password")}
className="block w-full text-left px-4 py-2 hover:bg-slate-100"
>
Change Password
</button>

<button
onClick={logout}
className="block w-full text-left px-4 py-2 text-red-600 hover:bg-slate-100"
>
Logout
</button>

</div>

)}

</div>

</div>
        </header>

        {/* Stats Row */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">

            <div className="flex justify-between items-start text-slate-500 mb-4">
              <span className="font-medium">Current ACWR</span>
              <Activity size={20}/>
            </div>

            <div>
              <span className="text-4xl font-bold text-slate-800">{acwr}</span>
              <span className="text-slate-400 ml-2 text-sm font-medium">ratio</span>
            </div>

          </div>

          

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">

            <div className="flex justify-between items-start text-slate-500 mb-4">
              <span className="font-medium">Acute Load (7 Days)</span>
              <Zap size={20} className="text-indigo-500"/>
            </div>

            <span className="text-3xl font-bold text-slate-800">
              {sessions.slice(0,7).reduce((sum,s)=>sum+s.load,0)}
            </span>

          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">

            <div className="flex justify-between items-start text-slate-500 mb-4">
              <span className="font-medium">Chronic Load (Avg)</span>
              <TrendingUp size={20} className="text-blue-500"/>
            </div>

            <span className="text-3xl font-bold text-slate-800">
              {Math.round(sessions.slice(0,28).reduce((sum,s)=>sum+s.load,0)/4 || 0)}
            </span>

          </div>

        </div>
        {/* FULL WIDTH WORKLOAD CHART */}

<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

<h2 className="text-xl font-bold mb-6 flex items-center gap-2">
<TrendingUp size={20}/>
28-Day Workload Trend
</h2>

<div style={{ width:"100%", height:320 }}>

<ResponsiveContainer>

<LineChart data={chartData}>

<CartesianGrid strokeDasharray="3 3" />

<XAxis dataKey="date" />

<YAxis />

<Tooltip />

<Line
type="monotone"
dataKey="load"
stroke="#10b981"
strokeWidth={3}
/>

</LineChart>

</ResponsiveContainer>

</div>

</div>

        {/* Form */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity size={20}/>
            Log Session
          </h2>

          <form onSubmit={submitSession} className="space-y-6">

            <div>

              <div className="flex justify-between mb-2">
                <label className="font-medium text-slate-700">RPE</label>
                <span className="font-bold text-emerald-600">{rpe}</span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={(e)=>setRpe(Number(e.target.value))}
                className="w-full"
              />

            </div>

            <div>
<div>

<label className="font-medium text-slate-700">
Date
</label>

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
/>

</div>
              <label className="font-medium text-slate-700">
                Duration (minutes)
              </label>

              <input
                type="number"
                value={duration}
                onChange={(e)=>setDuration(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
              />

            </div>

            <div className="font-semibold">
              Estimated Load: {rpe * duration}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
             className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-semibold transition"
            >
              {isSubmitting ? "Saving..." : "Submit Training"}
            </button>

            {notification && (
              <div className="text-green-600 text-center">
                {notification}
              </div>
            )}

          </form>

        </div>

        {/* History */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">

<div className="p-6 border-b flex justify-between items-center">

<h2 className="text-xl font-bold flex items-center gap-2">
  <Calendar size={20}/>
  Training History
</h2>

{/* <button
onClick={()=>window.scrollTo({ top: 0, behavior: "smooth" })}
className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
>
Add Session
</button> */}

</div>

          <table className="w-full text-sm">

            <thead className="bg-slate-50">
<tr>
<th className="p-4 text-left">Date</th>
<th className="p-4 text-center">RPE</th>
<th className="p-4">Duration</th>
<th className="p-4 text-right">Load</th>
<th className="p-4 text-center">Actions</th>
</tr>
            </thead>

            <tbody>

              {sessions.slice(0,10).map((s)=>(
<tr key={s.id} className="border-t">

<td className="p-4">
{new Date(s.date).toLocaleDateString()}
</td>

<td className="p-4 text-center">{s.rpe}</td>

<td className="p-4">{s.duration} min</td>

<td className="p-4 text-right font-bold">
{s.load}
</td>

<td className="p-4 text-center flex gap-2 justify-center">

<button
onClick={()=>editSession(s)}
className="bg-amber-400 hover:bg-amber-500 text-white px-3 py-1 rounded"
>
Edit
</button>

<button
onClick={()=>deleteSession(s.id)}
className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
>
Delete
</button>

</td>

</tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  )

}