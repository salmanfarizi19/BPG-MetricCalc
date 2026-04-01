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
  Zap,
  Edit2,
  Trash2
} from "lucide-react"
import {
  AreaChart,
  Area,
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
  const [playerId,setPlayerId] = useState(null)
  const [wellness,setWellness] = useState(null)
const [showWellnessModal,setShowWellnessModal] = useState(false)

const [sleep,setSleep] = useState(3)
const [fatigue,setFatigue] = useState(3)
const [soreness,setSoreness] = useState(3)
const [stress,setStress] = useState(3)
const [mood,setMood] = useState(3)
const [wellnessNotes,setWellnessNotes] = useState("")


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

useEffect(()=>{
if(playerId){
loadSessions()
loadWellness()
}
},[playerId])
async function checkUser(){

const { data: { user } } = await supabase.auth.getUser()

if(!user){
router.push("/login")
return
}

const { data, error } = await supabase
.from("players")
.select("id,name")
.eq("user_id", user.id)
.maybeSingle()

if(!data){
router.push("/complete-profile")
return
}

setPlayerName(data.name)
setPlayerId(data.id)



}
async function loadSessions(){

if(!playerId) return

const { data, error } = await supabase
.from("sessions")
.select("*")
.eq("player_id", playerId)
.order("date", { ascending: false })

if(error){
console.error(error)
}else{
setSessions(data || [])
}

}
async function loadWellness(){

const today = new Date().toISOString().slice(0,10)

const { data } = await supabase
.from("wellness_logs")
.select("*")
.eq("player_id",playerId)
.eq("date",today)
.maybeSingle()

if(data){
setWellness(data)

setSleep(data.sleep)
setFatigue(data.fatigue)
setSoreness(data.soreness)
setStress(data.stress)
setMood(data.mood)
setWellnessNotes(data.notes || "")
}

}

async function saveWellness(){

const today = new Date().toISOString().slice(0,10)

await supabase
.from("wellness_logs")
.upsert({
player_id: playerId,
date: today,
sleep,
fatigue,
soreness,
stress,
mood,
notes: wellnessNotes
},{
onConflict:"player_id,date"
})

setShowWellnessModal(false)
loadWellness()

}


    async function logout(){

    await supabase.auth.signOut()

    router.push("/login")

  }
async function submitSession(e){

if(!playerId){
alert("Player profile not loaded")
return
}
    e.preventDefault()
    setIsSubmitting(true)

    const load = rpe * duration

const { error } = await supabase
.from("sessions")
.insert({
player_id: playerId,
date,
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

function getDotColor(value, type){

const reverse = ["fatigue","soreness","stress"]
const isReversed = reverse.includes(type)

if(isReversed){
  if(value <= 2) return "bg-emerald-500"
  if(value === 3) return "bg-yellow-400"
  return "bg-red-500"
}else{
  if(value >= 4) return "bg-emerald-500"
  if(value === 3) return "bg-yellow-400"
  return "bg-red-500"
}

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
  <>
    {showWellnessModal && (

     <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">

      <div className="w-full max-w-md px-4">
          
         <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                Daily Wellness Check
              </h2>

              <button
                onClick={()=>setShowWellnessModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-6 space-y-6 overflow-y-auto">

              {[
  ["Sleep Quality",sleep,setSleep,"sleep"],
  ["Fatigue Level",fatigue,setFatigue,"fatigue"],
  ["Muscle Soreness",soreness,setSoreness,"soreness"],
  ["Stress Levels",stress,setStress,"stress"],
  ["General Mood",mood,setMood,"mood"]
].map(([label,value,setter,type])=>(

                <div key={label}>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">
                      {label}
                    </p>

                    <span className="text-sm font-bold text-emerald-600">
                      {value}/5
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={value}
                    onChange={(e)=>setter(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />

                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                  {["fatigue","soreness","stress"].includes(type) ? (
  <>
    <span>LOW</span>
    <span>HIGH</span>
  </>
) : (
  <>
    <span>POOR</span>
    <span>EXCELLENT</span>
  </>
)}
                  </div>
                </div>

              ))}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Notes (Optional)
                </p>

                <textarea
                  value={wellnessNotes}
                  onChange={(e)=>setWellnessNotes(e.target.value)}
                  placeholder="How are you feeling today?"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-50 h-24"
                />
              </div>

              <div className="flex gap-3 pt-2">

                <button
                  onClick={()=>setShowWellnessModal(false)}
                  className="flex-1 border border-slate-200 py-3 rounded-xl font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={saveWellness}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold"
                >
                  Save Wellness
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    )}

    {/* MAIN PAGE */}
    <div className="relative min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">

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
className="w-9 h-9 font-semibold text-sm rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold hover:bg-emerald-600"
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


        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* WELLNESS */}

<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">

<div className="flex justify-between items-center mb-4">
<h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
Daily Wellness
</h2>

<button
onClick={()=>setShowWellnessModal(true)}
className="text-emerald-600 hover:text-emerald-700 text-sm"
>
{wellness ? "Edit" : "Add"}
</button>
</div>

{wellness ? (

<div className="space-y-2">

{[
["Sleep",sleep,"sleep"],
["Fatigue",fatigue,"fatigue"],
["Soreness",soreness,"soreness"],
["Stress",stress,"stress"],
["Mood",mood,"mood"]
].map(([label,value,type])=>(

<div key={label} className="flex justify-between items-center text-sm">

<span className="text-slate-600">{label}</span>

<div className="flex gap-1">
{[1,2,3,4,5].map(i=>(
<div
key={i}
className={`w-2 h-2 rounded-full ${
i <= value
? getDotColor(value, type)
: "bg-slate-200"
}`}
/>
))}
</div>

</div>

))}

</div>

) : (

<p className="text-sm text-slate-400">
No data today
</p>

)}

</div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">

            <div className="flex justify-between items-start text-slate-500 mb-4">
              <span className="font-medium">Current ACWR</span>
              <Activity size={20}/>
            </div>

            <div>
<span className="text-5xl font-extrabold text-slate-800">
{acwr}
</span>

<p className="text-sm text-slate-400 mt-1">
Acute:Chronic Ratio
</p>
            </div>

          </div>

          

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">

            <div className="flex justify-between items-start text-slate-500 mb-4">
              <span className="font-medium">Acute Load (7 Days)</span>
              <Zap size={20} className="text-indigo-500"/>
            </div>

            <span className="text-3xl font-bold text-slate-800">
              {sessions.reduce((sum,s)=>{
  const diff = (new Date() - new Date(s.date)) / (1000*60*60*24)
  return diff <= 7 ? sum + s.load : sum
},0)}
            </span>

          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">

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
<AreaChart data={chartData}>

<defs>
<linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
<stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
</linearGradient>
</defs>

<CartesianGrid strokeDasharray="3 3" vertical={false}/>

<XAxis dataKey="date"/>

<YAxis/>

<Tooltip/>

<Area
type="monotone"
dataKey="load"
stroke="#10b981"
strokeWidth={3}
fill="url(#colorLoad)"
/>

</AreaChart>
{/* <LineChart data={chartData}>

<CartesianGrid strokeDasharray="3 3" vertical={false}/>

<XAxis dataKey="date" tick={{fontSize:12}}/>

<YAxis tick={{fontSize:12}}/>

<Tooltip
contentStyle={{
borderRadius:"10px",
border:"none",
boxShadow:"0 4px 10px rgba(0,0,0,0.1)"
}}
/>

<Line
type="monotone"
dataKey="load"
stroke="#10b981"
strokeWidth={3}
dot={false}
/>

</LineChart> */}

</ResponsiveContainer>



</div>

</div>

        {/* Form */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity size={20}/>
            Log Session
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-sm text-slate-600">

<p className="font-semibold mb-2">How to log your session</p>

<p className="mb-2">
<strong>RPE (Rate of Perceived Exertion)</strong> is how hard the session felt.
</p>

<ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">

<li>1–2: Very easy (walking)</li>
<li>3–4: Easy (light training)</li>
<li>5–6: Moderate</li>
<li>7–8: Hard</li>
<li>9: Very hard</li>
<li>10: Maximum effort</li>

</ul>

<p className="mt-3">
<strong>Training Load = RPE × Duration</strong>
</p>

<p className="text-xs text-slate-500 mt-1">
Example: RPE 6 × 60 min = Load 360
</p>

</div>

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
              <div className="flex justify-between text-xs text-slate-400 mt-1">
<span>Easy</span>
<span>Moderate</span>
<span>Max</span>
</div>

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
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
              />

            </div>

<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">

<p className="text-sm text-slate-600">
Estimated Load
</p>

<p className="text-xl font-bold text-emerald-600">
{rpe} × {duration} = {rpe * duration}
</p>

<p className="text-xs text-slate-500">
Higher load = higher physical stress
</p>

</div>
<p className="text-xs text-slate-500 mt-2">
Typical loads:
<br/>
100–300: Light  
<br/>
300–600: Moderate  
<br/>
600+: Heavy session
</p>

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

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200">

<div className="p-6 border-b border-slate-100 flex items-center gap-2">

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

          {/* <table className="w-full text-sm min-w-full">

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

          </table> */}

<div>

{/* HEADER */}
<div className="grid grid-cols-5 px-6 py-3 text-sm text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
  <div>Date</div>
  <div className="text-center">RPE</div>
  <div>Duration</div>
  <div className="text-right">Load</div>
  <div className="text-center">Actions</div>
</div>

{/* ROWS */}
{sessions.slice(0,10).map((s)=>{

const rpeColor =
  s.rpe >= 8 ? "bg-red-100 text-red-600"
  : s.rpe >= 6 ? "bg-yellow-100 text-yellow-600"
  : "bg-emerald-100 text-emerald-600"

return (

<div key={s.id} className="grid grid-cols-5 px-6 py-5 items-center border-t border-slate-100 hover:bg-slate-50/50 transition group">

  {/* DATE */}
  <div className="text-slate-700">
    {new Date(s.date).toLocaleDateString(undefined,{
      weekday:"short",
      day:"numeric",
      month:"short"
    })}
  </div>

  {/* RPE BADGE */}
  <div className="flex justify-center">
    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${rpeColor}`}>
      {s.rpe}
    </div>
  </div>

  {/* DURATION */}
  <div className="text-slate-600">
    {s.duration} min
  </div>

  {/* LOAD */}
  <div className="text-right font-bold text-slate-800">
    {s.load}
  </div>

  {/* ACTIONS */}
<div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">

<button
onClick={()=>editSession(s)}
className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200"
>
<Edit2 size={16}/>
</button>

<button
onClick={()=>deleteSession(s.id)}
className="p-2 rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600"
>
<Trash2 size={16}/>
</button>

</div>

</div>

)})}

</div>


        </div>
        </div>

      </div>

    </div>
  </>
  )

}