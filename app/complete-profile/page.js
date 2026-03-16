"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CompleteProfile(){

const router = useRouter()

const [name,setName] = useState("")
const [phone,setPhone] = useState("")
const [height,setHeight] = useState("")
const [weight,setWeight] = useState("")
const [position,setPosition] = useState("")
const [inviteCode,setInviteCode] = useState("")

useEffect(()=>{

async function loadUser(){

const { data:{ user } } = await supabase.auth.getUser()

if(user){
setName(user.user_metadata?.full_name || "")
}

}

loadUser()

},[])

async function saveProfile(){

const { data:{ user } } = await supabase.auth.getUser()

if(!user) return

const { data: newPlayer, error } = await supabase
.from("players")
.insert({
user_id: user.id,
name,
phone,
height: height ? Number(height) : null,
weight: weight ? Number(weight) : null,
position,
role:"athlete"
})
.select()
.single()

if(error){
console.error(error)
return
}

if(inviteCode){

const { data: team } = await supabase
.from("teams")
.select("id")
.eq("invite_code",inviteCode)
.single()

if(team){

await supabase.from("team_members").insert({
team_id: team.id,
player_id: newPlayer.id
})

}

}

router.push("/dashboard")

}

return(

<div className="min-h-screen flex items-center justify-center bg-slate-50">

<div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full max-w-sm space-y-4">

<h1 className="text-xl font-bold text-center">
Complete Your Profile
</h1>

<input
value={name}
onChange={(e)=>setName(e.target.value)}
placeholder="Full Name"
className="w-full border p-3 rounded"
/>

<input
value={phone}
onChange={(e)=>setPhone(e.target.value)}
placeholder="Phone"
className="w-full border p-3 rounded"
/>

<input
type="number"
value={height}
onChange={(e)=>setHeight(e.target.value)}
placeholder="Height (cm)"
className="w-full border p-3 rounded"
/>

<input
type="number"
value={weight}
onChange={(e)=>setWeight(e.target.value)}
placeholder="Weight (kg)"
className="w-full border p-3 rounded"
/>

<select
value={position}
onChange={(e)=>setPosition(e.target.value)}
className="w-full border p-3 rounded"
>

<option value="">Select Position</option>
<option>Point Guard</option>
<option>Shooting Guard</option>
<option>Small Forward</option>
<option>Power Forward</option>
<option>Center</option>

</select>

<input
value={inviteCode}
onChange={(e)=>setInviteCode(e.target.value.toUpperCase())}
placeholder="Team Invite Code"
className="w-full border p-3 rounded"
/>

<button
onClick={saveProfile}
className="w-full bg-emerald-500 text-white py-3 rounded-lg"
>
Save Profile
</button>

</div>

</div>

)

}