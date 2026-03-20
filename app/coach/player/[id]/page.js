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
ReferenceLine
} from "recharts"



export default function PlayerPage(){

const router = useRouter()
const { id } = useParams()
const [acwrTrend,setAcwrTrend] = useState([])

const [sessions,setSessions] = useState([])
const [player,setPlayer] = useState(null)
const spike = calculateSpike()
const [projRpe,setProjRpe] = useState(5)
const [projDuration,setProjDuration] = useState(60)
const [projectedAcwr,setProjectedAcwr] = useState(0)
const todayLabel = new Date().toLocaleDateString(undefined,{
  month:"short",
  day:"numeric"
})

const [showSessionModal,setShowSessionModal] = useState(false)
const [editingSession,setEditingSession] = useState(null)

const [sessionDate,setSessionDate] = useState("")
const [sessionRpe,setSessionRpe] = useState(5)
const [sessionDuration,setSessionDuration] = useState(60)
const [sessionType,setSessionType] = useState("")
const [sessionNotes,setSessionNotes] = useState("")

useEffect(()=>{
if(!id) return
loadPlayer()
loadSessions()
},[id])

useEffect(()=>{
calculateAcwrTrend()
},[sessions])

async function loadPlayer(){

const { data } = await supabase
.from("players")
.select("*")
.eq("id",id)
.single()

setPlayer(data)

}

async function loadSessions(){

const { data } = await supabase
.from("sessions")
.select("*")
.eq("player_id",id)
.order("date",{ascending:false})

setSessions(data || [])

}

function openAddSession(){

setEditingSession(null)

setSessionDate(new Date().toISOString().slice(0,10))
setSessionRpe(5)
setSessionDuration(60)
setSessionType("")
setSessionNotes("")

setShowSessionModal(true)

}

function openEditSession(session){

setEditingSession(session)

setSessionDate(session.date)
setSessionRpe(session.rpe)
setSessionDuration(session.duration)
setSessionType(session.session_type || "")
setSessionNotes(session.notes || "")

setShowSessionModal(true)

}

async function saveSession(){

const load = sessionRpe * sessionDuration

if(editingSession){

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

}else{

await supabase
.from("sessions")
.insert({
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

async function deleteSession(sessionId){

if(!confirm("Delete this session?")) return

await supabase
.from("sessions")
.delete()
.eq("id",sessionId)

loadSessions()

}

function calculateWeeklyLoad(){

const weeks={}

sessions.forEach(s=>{

const date = new Date(s.date)
const week = `${date.getFullYear()}-${Math.ceil(date.getDate()/7)}`

if(!weeks[week]) weeks[week]=0

weeks[week]+=Number(s.load||0)

})

return Object.entries(weeks).map(([week,load])=>({week,load}))
}

function calculateLoadTrend(){

if(!Array.isArray(sessions)) return []

const trend=[]

for(let i=27;i>=0;i--){

const d = new Date()
d.setDate(d.getDate()-i)

let acute=0
let chronic=0

sessions.forEach(s=>{

const load = Number(s.load || 0)
const sessionDate = new Date(s.date)

const diffDays = (d - sessionDate)/(1000*60*60*24)

if(diffDays<=7 && diffDays>=0) acute+=load
if(diffDays<=28 && diffDays>=0) chronic+=load

})

trend.push({
date: d.toLocaleDateString(undefined,{month:"short",day:"numeric"}),
acute,
chronic: chronic/4
})

}

return trend
}

function calculateStats(){

if(!Array.isArray(sessions)){
return {
totalSessions:0,
totalLoad:0,
acute:0,
chronic:0,
acwr:0,
avgLoad:0,
maxLoad:0
}
}

const today = new Date()

let acute = 0
let chronic = 0
let totalLoad = 0
let maxLoad = 0

sessions.forEach((s)=>{

const load = Number(s.load || 0)
const sessionDate = new Date(s.date)

const diffDays =
(today - sessionDate) / (1000*60*60*24)

totalLoad += load

if(load > maxLoad) maxLoad = load

if(diffDays <= 7) acute += load
if(diffDays <= 28) chronic += load

})

const chronicAvg = chronic / 4
const acwr = chronicAvg === 0 ? 0 : acute / chronicAvg
const avgLoad = sessions.length ? totalLoad / sessions.length : 0

return {
totalSessions: sessions.length,
totalLoad,
acute,
chronic: chronicAvg,
acwr,
avgLoad,
maxLoad
}

}


function calculateSpike(){

if(!Array.isArray(sessions) || sessions.length === 0){
return { spike:0, level:"None" }
}

const today = new Date()

let currentWeek = 0
let previousWeek = 0

sessions.forEach((s)=>{

const load = Number(s.load || 0)

const sessionDate = new Date(s.date)

const diffDays =
(today - sessionDate) / (1000*60*60*24)

if(diffDays <= 7) currentWeek += load

if(diffDays > 7 && diffDays <= 14)
previousWeek += load

})

if(previousWeek === 0){
return { spike:0, level:"None" }
}

const spike = ((currentWeek - previousWeek) / previousWeek) * 100

let level = "Safe"

if(spike > 30) level = "High Spike"
else if(spike > 10) level = "Moderate Spike"

return { spike, level }

}

function calculateProjectedAcwr(){

if(!Array.isArray(sessions)) return

const projectedLoad = projRpe * projDuration

const today = new Date()

let acute = 0
let chronic = 0

sessions.forEach((s)=>{

const load = Number(s.load || 0)
const sessionDate = new Date(s.date)

const diffDays =
(today - sessionDate) / (1000*60*60*24)

if(diffDays <= 7) acute += load
if(diffDays <= 28) chronic += load

})

const acuteProjected = acute + projectedLoad
const chronicProjected = chronic + projectedLoad

const chronicAvg = chronicProjected / 4

const acwr =
chronicAvg === 0 ? 0 : acuteProjected / chronicAvg

setProjectedAcwr(acwr)

}
useEffect(()=>{
calculateProjectedAcwr()
},[projRpe,projDuration,sessions])

function calculateAcwrTrend(){

if(!Array.isArray(sessions) || sessions.length === 0){
setAcwrTrend([])
return
}

const trend=[]

for(let i=27;i>=0;i--){

const d = new Date()
d.setDate(d.getDate()-i)

let acute=0
let chronic=0

sessions.forEach((s)=>{

const load = Number(s.load || 0)
const sessionDate = new Date(s.date)

const diffDays =
(d - sessionDate) / (1000*60*60*24)

if(diffDays <= 7 && diffDays >= 0)
acute += load

if(diffDays <= 28 && diffDays >= 0)
chronic += load

})

const chronicAvg = chronic / 4
const acwr = chronicAvg === 0 ? 0 : acute / chronicAvg

trend.push({
date: d.toLocaleDateString(undefined,{
month:"short",
day:"numeric"
}),
acwr: Number(acwr.toFixed(2))
})

}

setAcwrTrend(trend)

}

function getRisk(acwr){

if(acwr < 0.8)
return { label:"Undertraining", color:"bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" }

if(acwr <= 1.3)
return { label:"Optimal", color:"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" }

if(acwr <= 1.5)
return { label:"Risk Zone", color:"bg-orange-500/10 text-orange-400 border border-orange-500/20" }

return { label:"High Risk", color:"bg-red-500/10 text-red-400 border border-red-500/20" }

}

if(!player){
return (
  <div className="min-h-screen bg-slate-50 text-white flex items-center justify-center">
    Loading...
  </div>
)
}

const stats = calculateStats()
const risk = getRisk(stats.acwr)

const age = player.dob
? Math.floor((new Date() - new Date(player.dob)) / (365*24*60*60*1000))
: "N/A"

const chartData = sessions
.slice(0,28)
.map(s=>({
date: new Date(s.date).toLocaleDateString(undefined,{month:"short",day:"numeric"}),
load: s.load
}))
.reverse()

const loadTrend = calculateLoadTrend()
const weeklyLoad = calculateWeeklyLoad()

const minAcute = stats.chronic * 0.8
const maxAcute = stats.chronic * 1.3

const minNextLoad = Math.max(0, Math.round(minAcute - stats.acute))
const maxNextLoad = Math.max(0, Math.round(maxAcute - stats.acute))

return(

<div className="p-10 space-y-8 bg-slate-50 min-h-screen text-slate-900">

<button
onClick={()=>router.back()}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition"

>

← Back </button>

<h1 className="text-3xl font-bold">
{player.name}
</h1>

{/* PLAYER PROFILE */}

<div className="grid grid-cols-2 md:grid-cols-3 gap-4">

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-slate-500 text-sm">Age</p>
<p className="font-bold">{age}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-slate-500 text-sm">Phone</p>
<p className="font-bold">{player.phone || "N/A"}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-slate-500 text-sm">Position</p>
<p className="font-bold">{player.position || "N/A"}</p>
</div>

</div>

{/* PERFORMANCE STATS */}

<div className="grid grid-cols-2 md:grid-cols-6 gap-4">

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-sm text-slate-500">Sessions</p>
<p className="text-2xl font-bold">{stats.totalSessions}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-sm text-slate-500">Total Load</p>
<p className="text-2xl font-bold">{stats.totalLoad}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-sm text-slate-500">Avg Load</p>
<p className="text-2xl font-bold">{Math.round(stats.avgLoad)}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-sm text-slate-500">Max Load</p>
<p className="text-2xl font-bold">{stats.maxLoad}</p>
</div>

<div className="bg-white border border-slate-200 p-4 rounded-xl">
<p className="text-sm text-slate-500">Acute Load</p>
<p className="text-2xl font-bold">{Math.round(stats.acute)}</p>
</div>

<div className={`border p-4 rounded-xl ${risk.color}`}>
<p className="text-sm">ACWR</p>
<p className="text-2xl font-bold">
{stats.acwr.toFixed(2)}
</p>
<p>{risk.label}</p>
</div>
<div className={`border p-4 rounded-xl ${
spike.level === "High Spike"
? "bg-red-100 text-red-700 border border-red-200"
: spike.level === "Moderate Spike"
? "bg-orange-100 text-orange-600 border border-orange-200"
: "bg-green-100 text-emerald-600 border border-emerald-200"
}`}>

<p className="text-sm">Workload Spike</p>

<p className="text-2xl font-bold">
{spike.spike.toFixed(0)}%
</p>

<p>{spike.level}</p>

</div>

</div>


{/* ACWR TREND */}

<div className="bg-white border border-slate-200 rounded-xl p-6">

<h2 className="text-xl font-bold mb-4">
ACWR Trend (Last 28 Days)
</h2>

<div style={{ width:"100%", height:300 }}>

<ResponsiveContainer>

<LineChart data={acwrTrend}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="date"/>

<YAxis domain={[0,2]}/>

<Tooltip/>

<ReferenceArea y1={0} y2={0.8} fill="#fef9c3" fillOpacity={0.5}/>
<ReferenceArea y1={0.8} y2={1.3} fill="#dcfce7" fillOpacity={0.5}/>
<ReferenceArea y1={1.3} y2={1.5} fill="#fed7aa" fillOpacity={0.5}/>
<ReferenceArea y1={1.5} y2={2} fill="#fecaca" fillOpacity={0.5}/>

<Line
type="monotone"
dataKey="acwr"
stroke="#ef4444"
strokeWidth={3}
/>

</LineChart>

</ResponsiveContainer>

</div>

</div>

{/* ACUTE vs CHRONIC LOAD */}

<div className="bg-white border border-slate-200 rounded-xl p-6">

<h2 className="text-xl font-bold mb-4">
Acute vs Chronic Load
</h2>

<div style={{ width:"100%", height:300 }}>

<ResponsiveContainer>

<LineChart data={loadTrend}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="date"/>

<YAxis/>

<Tooltip/>

<Line
type="monotone"
dataKey="acute"
stroke="#ef4444"
strokeWidth={3}
name="Acute (7 days)"
/>

<Line
type="monotone"
dataKey="chronic"
stroke="#3b82f6"
strokeWidth={3}
name="Chronic Avg"
/>

</LineChart>

</ResponsiveContainer>

</div>

</div>


{/* PROJECTED ACWR */}

<div className="bg-white border border-slate-200 rounded-xl p-6">

<h2 className="text-xl font-bold mb-4">
Projected ACWR
</h2>

<div className="flex items-center gap-4 mb-4">

<div className="flex items-center gap-4 mb-4">

<div>
<p className="text-sm text-slate-500">RPE</p>
<input
type="number"
min="1"
max="10"
value={projRpe}
onChange={(e)=>setProjRpe(Number(e.target.value))}
className="border border-slate-300 rounded p-2 w-20"
/>
</div>

<div>
<p className="text-sm text-slate-500">Duration (min)</p>
<input
type="number"
value={projDuration}
onChange={(e)=>setProjDuration(Number(e.target.value))}
className="border border-slate-300 rounded p-2 w-28"
/>
</div>

<div>
<p className="text-sm text-slate-500">Session Load</p>
<p className="font-bold text-lg">
{projRpe * projDuration}
</p>
</div>

</div>

<p className="text-slate-600">
Simulate tomorrow's session load
</p>

</div>

<div className="space-y-4">

<div>
<p className="text-lg font-semibold">
Projected ACWR
</p>

<p className="text-3xl font-bold">
{projectedAcwr.toFixed(2)}
</p>
</div>

<div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-md">

<p className="text-sm text-slate-500">
Recommended Next Session Load
</p>

<p className="text-xl font-semibold">
{minNextLoad} – {maxNextLoad}
</p>

<p className="text-xs text-slate-400">
To remain in optimal ACWR range (0.8 – 1.3)
</p>

</div>

</div>

</div>

{/* WORKLOAD CHART */}

<div className="bg-white border border-slate-200 rounded-xl p-6">

<h2 className="text-xl font-bold mb-4">
28-Day Workload Trend
</h2>

<div style={{ width:"100%", height:300 }}>

<ResponsiveContainer>

<LineChart data={chartData}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="date"/>

<YAxis/>

<Tooltip/>

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

{/* WEEKLY LOAD */}

<div className="bg-white border border-slate-200 rounded-xl p-6">

<h2 className="text-xl font-bold mb-4">
Weekly Load
</h2>

<div style={{ width:"100%", height:300 }}>

<ResponsiveContainer>

<BarChart data={weeklyLoad}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="week"/>

<YAxis/>

<Tooltip/>

<Bar
dataKey="load"
fill="#6366f1"
radius={[6,6,0,0]}
/>

</BarChart>

</ResponsiveContainer>

</div>

</div>


{/* SESSION HISTORY */}

<div>

<div className="flex justify-between items-center mb-4">

<h2 className="text-xl font-bold">
Session History
</h2>

<button
onClick={openAddSession}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
>
+ Add Session
</button>

</div>

<table className="w-full border border-slate-200 bg-white">

<thead>

<tr className="bg-slate-100">
<th className="p-3 text-left">Date</th>
<th className="p-3">RPE</th>
<th className="p-3">Duration</th>
<th className="p-3">Load</th>
<th className="p-3">Actions</th>
</tr>

</thead>

<tbody>

{sessions.map((s)=>(

<tr key={s.id} className="border-t">

<td className="p-3">
{new Date(s.date).toLocaleDateString()}
</td>

<td className="p-3 text-center">{s.rpe}</td>

<td className="p-3 text-center">{s.duration}</td>

<td className="p-3 text-center">{s.load}</td>
<td className="p-3 text-center space-x-2">

<button
onClick={()=>openEditSession(s)}
className="text-blue-600 hover:underline"
>
Edit
</button>

<button
onClick={()=>deleteSession(s.id)}
className="text-red-600 hover:underline"
>
Delete
</button>

</td>
</tr>
))}

</tbody>

</table>

</div>
{showSessionModal && (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center">

<div className="bg-white rounded-xl p-6 w-96 space-y-4">

<h2 className="text-xl font-bold">
{editingSession ? "Edit Session" : "Add Session"}
</h2>

<div>
<p className="text-sm text-slate-500">Date</p>
<input
type="date"
value={sessionDate}
onChange={(e)=>setSessionDate(e.target.value)}
className="border rounded p-2 w-full"
/>
</div>

<div>
<p className="text-sm text-slate-500">RPE</p>
<input
type="number"
min="1"
max="10"
value={sessionRpe}
onChange={(e)=>setSessionRpe(Number(e.target.value))}
className="border rounded p-2 w-full"
/>
</div>

<div>
<p className="text-sm text-slate-500">Duration</p>
<input
type="number"
value={sessionDuration}
onChange={(e)=>setSessionDuration(Number(e.target.value))}
className="border rounded p-2 w-full"
/>
</div>

<div className="flex justify-end gap-3">

<button
onClick={()=>setShowSessionModal(false)}
className="px-4 py-2 border rounded"
>
Cancel
</button>

<button
onClick={saveSession}
className="bg-emerald-500 text-white px-4 py-2 rounded"
>
Save
</button>

</div>

</div>

</div>

)}
</div>




)

}
