"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ManageTeams(){

const router = useRouter()

const [teams,setTeams] = useState([])
const [selectedTeam,setSelectedTeam] = useState(null)
const [members,setMembers] = useState([])
const [name,setName] = useState("")
const [description,setDescription] = useState("")

useEffect(()=>{
loadTeams()
},[])

async function loadTeams(){

const { data:{ user } } = await supabase.auth.getUser()

const { data } = await supabase
.from("teams")
.select("*")
.eq("coach_id",user.id)

setTeams(data || [])

}

async function loadTeam(team){

setSelectedTeam(team)

setName(team.name || "")
setDescription(team.description || "")

const { data } = await supabase
.from("team_members")
.select("player_id, players(name)")
.eq("team_id",team.id)

setMembers(data || [])

}

async function updateTeam(){

await supabase
.from("teams")
.update({
name,
description
})
.eq("id",selectedTeam.id)

alert("Team updated")

loadTeams()

}

return(

<div className="flex min-h-screen bg-slate-50 text-slate-900">

{/* SIDEBAR */}

<aside className="w-64 bg-gradient-to-b from-[#0f172a] to-[#020617] text-white flex flex-col">

<div className="p-6 border-b border-slate-800">
<h2 className="text-xl font-bold">AthletiSync</h2>
</div>

<nav className="flex-1 px-4 py-6 space-y-2">

<Link
href="/coach"
className="block px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800"
>
Dashboard
</Link>

<Link
href="/coach/teams"
className="block px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400"
>
Manage Teams
</Link>

</nav>

</aside>

{/* MAIN */}

<div className="flex-1 p-8">

<h1 className="text-2xl font-bold mb-6">
Manage Teams
</h1>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

{/* TEAM LIST */}

<div className="bg-white rounded-2xl border border-slate-200 p-6">

<h2 className="font-semibold mb-4">
Your Teams
</h2>

<div className="space-y-2">

{teams.map(team=>(
<button
key={team.id}
onClick={()=>loadTeam(team)}
className={`w-full text-left p-3 rounded-lg border ${
selectedTeam?.id === team.id
? "bg-emerald-50 border-emerald-300"
: "border-slate-200 hover:bg-slate-50"
}`}
>
{team.name}
</button>
))}

</div>

</div>

{/* TEAM EDIT */}

<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">

{selectedTeam ? (

<div className="space-y-6">

<h2 className="text-xl font-semibold">
Edit Team
</h2>

<div>

<label className="block text-sm mb-1">
Team Name
</label>

<input
value={name}
onChange={(e)=>setName(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3"
/>

</div>

<div>

<label className="block text-sm mb-1">
Description
</label>

<textarea
value={description}
onChange={(e)=>setDescription(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3"
/>

</div>

<button
onClick={updateTeam}
className="bg-emerald-500 text-white px-5 py-3 rounded-lg"
>
Save Changes
</button>

{/* MEMBERS */}

<div>

<h3 className="font-semibold mt-8 mb-3">
Team Members
</h3>

<div className="border rounded-lg divide-y">

{members.map((m,i)=>(
<div key={i} className="p-3">
{m.players?.name}
</div>
))}

</div>

</div>

</div>

) : (

<p className="text-slate-500">
Select a team to edit.
</p>

)}

</div>

</div>

</div>

</div>

)

}