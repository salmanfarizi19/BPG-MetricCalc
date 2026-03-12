"use client"

import { useEffect,useState ,useRef} from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
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

const { data:{ user } } = await supabase.auth.getUser()

if(!user){
router.push("/login")
return
}

const { data } = await supabase
.from("players")
.select("role")
.eq("id",user.id)
.single()

if(!data || data.role !== "coach"){
router.push("/dashboard")
return
}

}


async function loadPlayers(){

const { data:{ user } } = await supabase.auth.getUser()
const { data: coach } = await supabase
.from("players")
.select("name")
.eq("id",user.id)
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

const playerIds = (members || []).map(m=>m.player_id)

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
loadDistribution.push({
name: player.name,
load: acute
})


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
setPlayerLoadData(loadDistribution)

}

return(

<div className="flex min-h-screen bg-slate-50 text-slate-900">
{/* SIDEBAR */}

<div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col">

<h2 className="text-xl font-bold mb-8 text-slate-900">
Athlete Monitoring
</h2>

<nav className="flex flex-col gap-2">

<Link
href="/coach"
className="px-3 py-2 rounded-lg hover:bg-slate-100 font-medium text-slate-700"
>
Dashboard
</Link>

<Link
href="/coach/create-team"
className="px-3 py-2 rounded-lg hover:bg-slate-100 font-medium text-slate-700"
>
Create Team
</Link>

</nav>

</div>

{/* MAIN CONTENT */}
<div className="flex-1 p-10">

<div className="flex justify-between items-center mb-8">

<h1 className="text-2xl font-bold text-slate-900">
Hey, {coachName}!
</h1>

<div ref={menuRef} className="relative">

<button
onClick={()=>setMenuOpen(!menuOpen)}
className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold hover:bg-slate-100"
>
{initials}
</button>

{menuOpen && (

<div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg w-44">

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

</div>

{/* ALERT SUMMARY */}

{alerts.length > 0 && (

<div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-8">

<div className="flex justify-between items-center">

<h2 className="font-semibold text-red-400">
⚠ {alerts.length} Players At Risk
</h2>

<button
onClick={()=>setShowAlerts(!showAlerts)}
className="text-sm text-red-400 underline"
>
{showAlerts ? "Hide Details" : "Show Details"}
</button>

</div>

{showAlerts && (

<div className="mt-3 space-y-1">

{alerts.map((a,i)=>{

if(a.type==="acwr"){
return(
<p key={i} className="text-red-400 text-sm">
⚠ {a.player} — High ACWR ({a.value})
</p>
)
}

if(a.type==="spike"){
return(
<p key={i} className="text-red-400 text-sm">
⚠ {a.player} — Weekly Spike +{a.value}%
</p>
)
}

})}

</div>

)}

</div>

)}

<button
onClick={()=>router.push("/coach/create-team")}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg mb-6 transition"

>

Create Team </button>

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

<div className="bg-white p-6 rounded-xl border border-slate-200 mb-8">

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

<ResponsiveContainer width="100%" height={300}>

<BarChart data={playerLoadData}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="name"/>

<YAxis/>

<Tooltip/>

<Bar
dataKey="load"
fill="#10b981"
/>

</BarChart>

</ResponsiveContainer>

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

<div className="grid grid-cols-4 gap-4 mb-6">

<div className="bg-white text-slate-700 border-slate-200 p-4 rounded-xl border">
<p className="text-slate-500 text-sm">Players</p>
<p className="text-2xl font-bold">{teamPlayers.length}</p>
</div>

<div className="bg-red-50 p-4 rounded-xl border border-red-200">
<p className="text-red-400 text-sm">High Risk</p>
<p className="text-2xl font-bold text-red-600">{highRisk}</p>
</div>

<div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
<p className="text-yellow-700 text-sm">Undertraining</p>
<p className="text-2xl font-bold text-yellow-600">{under}</p>
</div>

<div className="bg-green-50 p-4 rounded-xl border border-green-200">
<p className="text-green-700 text-sm">Optimal</p>
<p className="text-2xl font-bold text-green-600">{optimal}</p>
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

<tbody>

{teamPlayers.map((p,i)=>{

let risk="Optimal"
let color="bg-green-100 text-green-700"

if(p.acwr<0.8){
risk="Undertraining"
color="bg-yellow-100 text-yellow-700"
}
else if(p.acwr<=1.3){
risk="Optimal"
}
else if(p.acwr<=1.5){
risk="Risk Zone"
color="bg-orange-100 text-orange-700"
}
else{
risk="High Risk"
color="bg-red-100 text-red-400"
}

return(

<tr key={i} className="border-t hover:bg-slate-100">

<td className="p-3">
<Link href={`/coach/player/${p.id}`} className="text-emerald-600 hover:text-emerald-700 hover:underline">
{p.name}
</Link>
</td>

<td className="p-3 text-center">
{p.acwr}
</td>
<td className="p-3 text-center">
{p.spike}%
</td>

<td className="p-3 text-center">

<span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
{risk} </span>

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
</div>

)

}