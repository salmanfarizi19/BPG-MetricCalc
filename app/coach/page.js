"use client"

import { useEffect,useState ,useRef} from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Papa from "papaparse"
import {
ResponsiveContainer,
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
BarChart,
Bar,
CartesianGrid
} from "recharts"
// import { User } from "lucide-react"
import {
LayoutDashboard,
Users,
UploadCloud,
DownloadCloud,
AlertTriangle,
UserCircle,
LogOut,
Settings,
ChevronDown,
FileSpreadsheet,
Activity,
CheckCircle2,
TrendingUp,
X
} from "lucide-react"
import { Cell } from "recharts"

export default function CoachDashboard(){

const [players,setPlayers] = useState([])
const [teams,setTeams] = useState([])
const [selectedTeam,setSelectedTeam] = useState("all")
const [menuOpen,setMenuOpen] = useState(false)
const [coachName,setCoachName] = useState("")
const [teamLoadData,setTeamLoadData] = useState([])
const [chartMode,setChartMode] = useState("total")
const [alerts,setAlerts] = useState([])
const [showAlerts,setShowAlerts] = useState(false)
const [playerLoadData,setPlayerLoadData] = useState([])
const [importFile,setImportFile] = useState(null)
const [toast,setToast] = useState(null)




const initials = coachName
  ? coachName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  : "?"

const menuRef = useRef(null)
const router = useRouter()

useEffect(()=>{
initPage()
},[selectedTeam])

async function initPage(){
await checkRole()
await loadPlayers()
}

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

async function handleLogout(){

  await supabase.auth.signOut()

  router.push("/login")

}

async function checkRole(){

const { data:{ session } } = await supabase.auth.getSession()
const user = session?.user

if(!user){
router.push("/login")
return
}

const { data } = await supabase
.from("players")
.select("role")
.eq("user_id", user.id)
.single()

if(!data || data.role !== "coach"){
router.push("/dashboard")
return
}

}


function showToast(message,type="info"){
setToast({message,type})
setTimeout(()=>setToast(null),4000)
}


async function handleCSVImport(){

if(!importFile){
showToast("Please upload a CSV file","error")
return
}

if(selectedTeam === "all"){
alert("Please select a team first")
return
}

Papa.parse(importFile,{
header:true,
skipEmptyLines:true,

complete: async (results)=>{

const rows = results.data

// STEP 1 — collect unique players
const playerKeys = new Set()

rows.forEach(r=>{
playerKeys.add(`${r.name}|${r.dob}`)
})

const playerList = []

rows.forEach(r => {

const key = `${r.name}|${r.dob}`

if(!playerList.find(p => p.key === key)){
playerList.push({
key,
name: r.name,
dob: r.dob,
position: r.position || null,
height: r.height || null,
weight: r.weight || null
})
}

})

// STEP 2 — get existing players only from CSV

const names = playerList.map(p => p.name)
const dobs = playerList.map(p => p.dob)

const { data: existingPlayers } = await supabase
.from("players")
.select("id,name,dob")
.in("name", names)
.in("dob", dobs)

const playerMap = {}

// map existing players
existingPlayers.forEach(p=>{
playerMap[`${p.name}|${p.dob}`] = p
})

// STEP 3 — detect missing players
const newPlayers = []

playerList.forEach(p => {

const key = `${p.name}|${p.dob}`

if(!playerMap[key]){
newPlayers.push({
name: p.name,
dob: p.dob,
position: p.position,
height: p.height ? Number(p.height) : null,
weight: p.weight ? Number(p.weight) : null,
role: "athlete"
})
}

})

// STEP 4 — bulk create players
if(newPlayers.length > 0){

const { data:createdPlayers, error:createError } = await supabase
.from("players")
.insert(newPlayers)
.select()

if(createError){
console.error("Player insert error:", createError?.message, createError)
}

if(createdPlayers && createdPlayers.length > 0){
createdPlayers.forEach(p=>{
playerMap[`${p.name}|${p.dob}`] = p
})
}

}

// STEP 5 — create team_members
const teamMembersMap = new Map()

rows.forEach(row => {

const key = `${row.name}|${row.dob}`
const player = playerMap[key]

if(!player) return

const uniqueKey = `${selectedTeam}-${player.id}`

if(!teamMembersMap.has(uniqueKey)){
teamMembersMap.set(uniqueKey,{
team_id: selectedTeam,
player_id: player.id
})
}

})

const teamMembers = Array.from(teamMembersMap.values())

await supabase
.from("team_members")
.upsert(teamMembers,{
onConflict:"team_id,player_id"
})

// STEP 6 — prepare sessions
const sessions = []

rows.forEach(row=>{

const key = `${row.name}|${row.dob}`
const player = playerMap[key]

if(!player) return
if(!row.date || !row.rpe || !row.duration) return

sessions.push({
player_id: player.id,
date: row.date,
rpe: Number(row.rpe),
duration: Number(row.duration),
load: Number(row.rpe) * Number(row.duration)
})

})

// STEP 7 — bulk insert sessions
if(sessions.length > 0){
console.log("Sessions to insert:", sessions)
const { error:sessionError } = await supabase
.from("sessions")
.upsert(sessions,{
onConflict:"player_id,date"
})

if(sessionError){
console.error("Session insert error:",sessionError)
}

}

showToast("CSV Import Complete","success")
setImportFile(null) 

initPage()

}

})

}

async function handleExportCSV(){

if(selectedTeam === "all"){
alert("Please select a team before exporting")
return
}

const { data: members } = await supabase
.from("team_members")
.select("player_id")
.eq("team_id", selectedTeam)

const playerIds = members.map(m => m.player_id)

const { data: players } = await supabase
.from("players")
.select("id,name,dob,position,height,weight")
.in("id", playerIds)

const { data: sessions } = await supabase
.from("sessions")
.select("*")
.in("player_id", playerIds)

if(!sessions || sessions.length === 0){
alert("No session data to export")
return
}

// map players
const playerMap = {}
players.forEach(p=>{
playerMap[p.id] = p
})

let csv = "name,dob,position,height,weight,date,rpe,duration\n"

sessions.forEach(s=>{

const player = playerMap[s.player_id]

if(!player) return

csv += `${player.name},${player.dob},${player.position || ""},${player.height || ""},${player.weight || ""},${s.date},${s.rpe},${s.duration}\n`

})

const blob = new Blob([csv],{type:"text/csv"})
const url = URL.createObjectURL(blob)

const a = document.createElement("a")
a.href = url
a.download = "team_sessions.csv"
a.click()

}

async function loadPlayers(){

const { data:{ user } } = await supabase.auth.getUser()
const { data: coach } = await supabase
.from("players")
.select("name")
.eq("user_id",user.id)
.single()

setCoachName(coach?.name || "")

const { data: teams } = await supabase
.from("teams")
.select("*")
.eq("coach_id",user.id)

setTeams(teams || [])

const { data: members } = await supabase
.from("team_members")
.select("*")

// players belonging to selected team
const teamPlayerIds = (members || [])
.filter(m => selectedTeam === "all" || m.team_id === selectedTeam)
.map(m => m.player_id)

const { data: sessions } = await supabase
.from("sessions")
.select("*")
.order("date",{ascending:false})


// TEAM LOAD TREND (last 28 days)

// TEAM LOAD TREND (last 28 days)

const today = new Date()

const dailyLoads = {}
const dailyCounts = {}

for(let i=0;i<28;i++){

const d = new Date()
d.setDate(today.getDate()-i)

const key = d.toISOString().slice(0,10)

dailyLoads[key] = 0
dailyCounts[key] = 0

}

for(const s of sessions || []){

if(!teamPlayerIds.includes(s.player_id)) continue

const date = new Date(s.date)
const diffDays = (today - date)/(1000*60*60*24)

if(diffDays <= 28){

const key = s.date

if(dailyLoads[key] !== undefined){
dailyLoads[key] += Number(s.load || 0)
dailyCounts[key] += 1
}

}

}

const chartData = Object.entries(dailyLoads)
.map(([date,load])=>({

date,
total:load,
avg: dailyCounts[date] ? load / dailyCounts[date] : 0

}))
.sort((a,b)=>new Date(a.date)-new Date(b.date))

setTeamLoadData(chartData)

const sessionsByPlayer = {}

for(const s of sessions || []){

if(!sessionsByPlayer[s.player_id]){
sessionsByPlayer[s.player_id] = []
}

sessionsByPlayer[s.player_id].push(s)

}

const results=[]
const alertList=[]
const loadDistribution=[]

const playerIds = [...new Set((members || []).map(m => m.player_id))]

const { data: playersData } = await supabase
.from("players")
.select("*")
.in("id",playerIds)

for(const member of members || []){

const player = playersData.find(p=>p.id===member.player_id)

if(!player) continue

const playerSessions = sessionsByPlayer[player.id] || []

playerSessions.sort(
(a,b)=>new Date(b.date)-new Date(a.date)
)

const today = new Date()

let acute = 0
let chronic = 0
let currentWeek = 0
let previousWeek = 0

for(const s of playerSessions){

const load = Number(s.load || 0)

const sessionDate = new Date(s.date)

const diffDays = (today - sessionDate) / (1000*60*60*24)

if(diffDays <= 7){
acute += load
currentWeek += load
}

if(diffDays <= 28){
chronic += load
}

if(diffDays > 7 && diffDays <= 14){
previousWeek += load
}

}

const chronicAvg = chronic / 4
const acwr = chronicAvg === 0 ? 0 : acute / chronicAvg

let spike = 0

if(previousWeek !== 0){
spike = ((currentWeek - previousWeek) / previousWeek) * 100
}

const playerData = {
id:player.id,
name:player.name,
team_id:member.team_id,
acwr:acwr.toFixed(2),
spike:spike.toFixed(0)
}

results.push(playerData)

const nameParts = player.name.split(" ")

const shortName =
nameParts.length > 1
? `${nameParts[0]} ${nameParts[1][0]}.`
: nameParts[0]

if(selectedTeam === "all" || member.team_id === selectedTeam){

loadDistribution.push({
name: shortName,
load: acute
})

}


// ALERT CONDITIONS

if(acwr > 1.5){
alertList.push({
type:"acwr",
player:player.name,
value:acwr.toFixed(2)
})
}

if(spike > 30){
alertList.push({
type:"spike",
player:player.name,
value:spike.toFixed(0)
})
}

}

setPlayers(results)
setAlerts(alertList)

loadDistribution.sort((a,b)=>b.load-a.load)
setPlayerLoadData(loadDistribution)

}








return(

<div className="flex min-h-screen bg-slate-50 text-slate-900">
{/* SIDEBAR */}

<aside className="w-64 bg-gradient-to-b from-[#0f172a] to-[#020617] text-white flex flex-col">

{/* LOGO */}
<div className="p-6 flex items-center gap-3 border-b border-slate-800">

<div className="w-8 h-8 flex items-center justify-center text-emerald-400">
<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
<path d="M2 12h4l2-6 4 12 2-6h8"/>
</svg>
</div>

<h2 className="text-xl font-bold tracking-tight">
BPG MetricCalc
</h2>

</div>


{/* NAVIGATION */}
<nav className="flex-1 px-4 py-6 space-y-2">

<Link
href="/coach"
className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 font-medium"
>

<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
<rect x="3" y="3" width="5" height="5"/>
<rect x="10" y="3" width="5" height="5"/>
<rect x="3" y="10" width="5" height="5"/>
<rect x="10" y="10" width="5" height="5"/>
</svg>

Dashboard

</Link>


<Link
href="/coach/create-team"
className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
>

<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
<circle cx="8" cy="8" r="3"/>
<path d="M2 18c1-3 5-5 6-5s5 2 6 5"/>
</svg>

Manage Teams

</Link>

</nav>


{/* FOOTER */}
<div className="p-6 border-t border-slate-800 text-sm text-slate-500">

© {new Date().getFullYear()} TSF

</div>

</aside>

{/* MAIN CONTENT */}
<div className="flex-1 p-8 bg-slate-50">

<header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">

{/* LEFT SIDE */}
<div>

<h1 className="text-2xl font-bold text-slate-900">
Welcome back, Coach! 👋
</h1>

<p className="text-sm text-slate-500 mt-1">
Here's what's happening with your teams today.
</p>

</div>


{/* RIGHT SIDE */}
<div ref={menuRef} className="relative">

<button
onClick={()=>setMenuOpen(!menuOpen)}
className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full transition"
>

{/* Avatar */}
<div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">

{initials}

</div>

<span className="text-sm font-medium text-slate-700">

{coachName || "Coach"}

</span>

<svg
className={`w-4 h-4 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
fill="none"
stroke="currentColor"
strokeWidth="2"
viewBox="0 0 24 24"
>
<path d="M6 9l6 6 6-6"/>
</svg>

</button>


{/* DROPDOWN */}
{menuOpen && (

<div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">

<button
onClick={()=>router.push("/profile")}
className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700"
>
Edit Profile
</button>

<button
onClick={()=>router.push("/update-password")}
className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700"
>
Change Password
</button>

<button
onClick={handleLogout}
className="block w-full text-left px-4 py-2 text-red-600 hover:bg-slate-100"
>
Logout
</button>

</div>

)}

</div>

</header>

{/* ALERT SUMMARY */}

{alerts.length > 0 && (

<div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex justify-between items-center mb-8">

<div className="flex items-center gap-4">

<div className="bg-red-100 p-3 rounded-xl">
⚠
</div>

<div>
<h2 className="font-bold text-red-700 text-lg">
{alerts.length} Players At Risk
</h2>

<p className="text-red-500 text-sm">
Action may be required to prevent injury.
</p>
</div>

</div>

<button
onClick={()=>setShowAlerts(!showAlerts)}
className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
>
{showAlerts ? "Hide Details" : "View Details"}
</button>

</div>

)}

{/* <button
onClick={()=>router.push("/coach/create-team")}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg mb-6 transition"

>

Create Team </button> */}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

{/* DATA MANAGEMENT */}

<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

<h3 className="font-bold text-lg mb-5 flex items-center gap-2">
📄 Data Management
</h3>

<div className="flex flex-col sm:flex-row gap-4 items-center">

<label
htmlFor="csvUpload"
className="flex-1 cursor-pointer border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 flex items-center justify-center text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 transition"
>

<input
id="csvUpload"
type="file"
accept=".csv"
onChange={(e)=>setImportFile(e.target.files?.[0] || null)}
className="hidden"
/>

{importFile ? importFile.name : "Browse CSV File..."}

</label>

<button
onClick={handleCSVImport}
disabled={!importFile}
className={`px-4 py-2 rounded-xl font-semibold transition
${importFile
? "bg-emerald-500 hover:bg-emerald-600 text-white"
: "bg-slate-200 text-slate-400 cursor-not-allowed"}
`}
>
Import
</button>

<button
onClick={handleExportCSV}
className="border border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-100"
>
Export
</button>

</div>

</div>


{/* BUILD TEAM CARD */}

<div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between">

<div>

<h3 className="text-xl font-bold mb-2">
Build Your Roster
</h3>

<p className="text-slate-300 text-sm mb-6">
Create a new team and invite athletes to start tracking loads.
</p>

</div>

<button
onClick={()=>router.push("/coach/create-team")}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold"
>
+ Create New Team
</button>

</div>

</div>

{/* <h1 className="text-3xl font-bold mb-6">
Team Dashboard
</h1> */}

{/* TEAM TABS */}

<div className="flex gap-2 mb-8">

<button
onClick={()=>setSelectedTeam("all")}
className={`px-4 py-2 rounded-lg border ${
selectedTeam==="all"
?"bg-emerald-500 text-white"
:"bg-white text-slate-700 border-slate-200"
}`}

>

All Teams </button>

{teams.map(team=>(
<button
key={team.id}
onClick={()=>setSelectedTeam(team.id)}
className={`px-4 py-2 rounded-lg border ${
selectedTeam===team.id
?"bg-emerald-500 text-white"
:"bg-white text-slate-700 border-slate-200"
}`}

>

{team.name} </button>
))}

</div>
{/* TEAM LOAD GRAPH */}

<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">

<h2 className="font-semibold mb-4">
{selectedTeam==="all"
? "All Teams Load Trend"
: `${teams.find(t=>t.id===selectedTeam)?.name || ""} Load Trend`}
</h2>

<div className="flex gap-2 mb-4">

<button
onClick={()=>setChartMode("total")}
className={`px-3 py-1 rounded-lg border ${
chartMode==="total"?"bg-emerald-500 text-white":"bg-white text-slate-700 border-slate-200"
}`}
>
Total Load
</button>

<button
onClick={()=>setChartMode("avg")}
className={`px-3 py-1 rounded-lg border ${
chartMode==="avg"?"bg-emerald-500 text-white":"bg-white text-slate-700 border-slate-200"
}`}
>
Avg Load
</button>

</div>

<ResponsiveContainer width="100%" height={250}>

<LineChart data={teamLoadData}>

<XAxis
dataKey="date"
tickFormatter={(d)=>d.slice(5)}
/>

<YAxis />

<Tooltip />

<Line
type="monotone"
dataKey={chartMode==="total"?"total":"avg"}
stroke="#10b981"
strokeWidth={2}
dot={false}
/>

</LineChart>

</ResponsiveContainer>

</div>

{/* PLAYER LOAD DISTRIBUTION */}

<div className="bg-white p-6 rounded-xl border border-slate-200 mb-8">

<h2 className="font-semibold mb-4">
Player Load Distribution (7 Days)
</h2>

<div className="overflow-x-auto">

<div style={{ width: Math.max(playerLoadData.length * 80, 600) }}>

<ResponsiveContainer width="100%" height={340}>

<BarChart data={playerLoadData}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis
dataKey="name"
interval={0}
angle={-45}
textAnchor="end"
height={90}
tick={{fontSize:12}}
/>

<YAxis/>

<Tooltip/>

<Bar
dataKey="load"
fill="#10b981"
radius={[4,4,0,0]}
maxBarSize={40}
/>

</BarChart>

</ResponsiveContainer>

</div>

</div>

</div>






{/* TEAM SECTIONS */}

{teams
.filter(team=>selectedTeam==="all"||team.id===selectedTeam)
.map(team=>{

const teamPlayers = players.filter(p=>p.team_id===team.id)

const highRisk = teamPlayers.filter(p=>p.acwr>1.5).length
const under = teamPlayers.filter(p=>p.acwr<0.8).length
const optimal = teamPlayers.filter(p=>p.acwr>=0.8 && p.acwr<=1.3).length

return(

<div key={team.id} className="mb-12">

{/* TEAM CARD */}

<div className="bg-white text-slate-700 border-slate-200 p-4 rounded-xl border mb-6">

<h2 className="font-bold text-lg">
{team.name}
</h2>

<p className="text-slate-400">
Invite Code:
<span className="font-mono font-bold ml-2">
{team.invite_code}
</span>
</p>

</div>

{/* TEAM STATS */}

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
<p className="text-sm text-slate-500 mb-2">Total Roster</p>
<p className="text-4xl font-black text-slate-800">{teamPlayers.length}</p>
</div>

<div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
<div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-100 rounded-full opacity-50"></div>
<p className="text-red-600 font-bold text-sm mb-2">High Risk</p>
<p className="text-4xl font-black text-red-700">{highRisk}</p>
</div>

<div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
<div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-100 rounded-full opacity-50"></div>
<p className="text-amber-700 font-bold text-sm mb-2">Undertraining</p>
<p className="text-4xl font-black text-amber-600">{under}</p>
</div>

<div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
<div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-100 rounded-full opacity-50"></div>
<p className="text-emerald-700 font-bold text-sm mb-2">Optimal Zone</p>
<p className="text-4xl font-black text-emerald-600">{optimal}</p>
</div>

</div>

{/* PLAYER TABLE */}

<table className="w-full border border-slate-200 bg-white">

<thead>

<tr className="bg-slate-100">
<th className="p-3 text-left">Player</th>
<th className="p-3">ACWR</th>
<th className="p-3">Spike</th>
<th className="p-3">Risk</th>
</tr>

</thead>

<tbody className="divide-y divide-slate-100">

{teamPlayers.map((p,i)=>{

let risk="Optimal"
let badge="bg-emerald-100 text-emerald-700"

if(p.acwr<0.8){
risk="Undertraining"
badge="bg-amber-100 text-amber-700"
}
else if(p.acwr<=1.3){
risk="Optimal"
}
else if(p.acwr<=1.5){
risk="Warning"
badge="bg-orange-100 text-orange-700"
}
else{
risk="High Risk"
badge="bg-red-100 text-red-700"
}

return(

<tr key={i} className="hover:bg-slate-50">

<td className="p-4 flex items-center gap-3">

<div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
{p.name.charAt(0)}
</div>

<Link
href={`/coach/player/${p.id}`}
className="font-semibold text-slate-800 hover:text-emerald-600"
>
{p.name}
</Link>

</td>

<td className="p-4 text-center">{p.acwr}</td>

<td className="p-4 text-center">
{p.spike>0?`+${p.spike}%`:`${p.spike}%`}
</td>

<td className="p-4 text-right">

<span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>
{risk}
</span>

</td>

</tr>

)

})}

</tbody>

</table>

</div>

)

})}
</div>


{toast && (

<div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border
${
toast.type === "error"
? "bg-red-50 text-red-700 border-red-200"
: toast.type === "success"
? "bg-emerald-50 text-emerald-700 border-emerald-200"
: "bg-white text-slate-800 border-slate-200"
}`}>

{toast.type === "error" && <AlertTriangle className="w-5 h-5 text-red-500"/>}

{toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500"/>}

<p className="font-medium">{toast.message}</p>

<button
onClick={()=>setToast(null)}
className="ml-2 opacity-50 hover:opacity-100"
>
<X className="w-4 h-4"/>
</button>

</div>

)}
</div>

)

}