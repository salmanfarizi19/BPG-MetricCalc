"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ProfilePage(){

const [name,setName] = useState("")
const [phone,setPhone] = useState("")
const [height,setHeight] = useState("")
const [weight,setWeight] = useState("")
const [position,setPosition] = useState("")
const [role,setRole] = useState("")

const router = useRouter()

useEffect(()=>{
loadProfile()
},[])

async function loadProfile(){

const { data:{ user } } = await supabase.auth.getUser()

if(!user) return

const { data } = await supabase
.from("players")
.select("*")
.eq("user_id", user.id)
.single()

if(data){
setName(data.name || "")
setPhone(data.phone || "")
setHeight(data.height || "")
setWeight(data.weight || "")
setPosition(data.position || "")
setRole(data.role || "")
}

}

async function updateProfile(){

const { data:{ user } } = await supabase.auth.getUser()

if(!user) return

await supabase
.from("players")
.update({
name,
phone,
height,
weight,
position
})
.eq("user_id", user.id)

if(role === "coach"){
router.push("/coach")
}else{
router.push("/dashboard")
}

}

return(

<div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">

<div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-10">

<h1 className="text-3xl font-bold mb-8 text-slate-900">
Edit Profile
</h1>

<div className="space-y-6">

<div>
<label className="block text-sm font-semibold text-slate-600 mb-1">
Name
</label>
<input
value={name}
onChange={e=>setName(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
/>
</div>

<div>
<label className="block text-sm font-semibold text-slate-600 mb-1">
Phone
</label>
<input
value={phone}
onChange={e=>setPhone(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
/>
</div>

<div>
<label className="block text-sm font-semibold text-slate-600 mb-1">
Height (cm)
</label>
<input
value={height}
onChange={e=>setHeight(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
/>
</div>

<div>
<label className="block text-sm font-semibold text-slate-600 mb-1">
Weight (kg)
</label>
<input
value={weight}
onChange={e=>setWeight(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
/>
</div>

<div>
<label className="block text-sm font-semibold text-slate-600 mb-1">
Position
</label>
<select
value={position}
onChange={e=>setPosition(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3"
>
<option value="">Select Position</option>
<option>Point Guard</option>
<option>Shooting Guard</option>
<option>Small Forward</option>
<option>Power Forward</option>
<option>Center</option>
</select>
</div>

<div className="flex gap-4 pt-2">

<button
onClick={updateProfile}
className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition"
>
Save Changes
</button>

<button
onClick={()=>router.back()}
className="border border-slate-300 hover:bg-slate-100 px-6 py-3 rounded-lg transition"
>
Cancel
</button>

</div>

</div>

</div>

</div>

)

}