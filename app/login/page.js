
"use client"
import { Suspense } from "react"
export const dynamic = "force-dynamic"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter,useSearchParams } from "next/navigation"

export default function Page(){
  return (
    <Suspense>
      <AuthPage/>
    </Suspense>
  )
}

function AuthPage(){

  const router = useRouter()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const params = useSearchParams()

const [mode,setMode] = useState(
  params.get("mode") || "login"
)
const [loading,setLoading] = useState(false)

const [name,setName] = useState("")
const [dob,setDob] = useState("")
const [phone,setPhone] = useState("")
const [height,setHeight] = useState("")
const [weight,setWeight] = useState("")
const [position,setPosition] = useState("")
const [inviteCode,setInviteCode] = useState("")


  async function handleAuth(){

  if(!email){
    alert("Please enter your email")
    return
  }

  if(mode !== "reset" && !password){
    alert("Please enter password")
    return
  }

  if(mode === "reset"){

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:3000/update-password"
  })

  if(error){
    alert(error.message)
  } else {
    alert("Password reset email sent!")
  }

  setLoading(false)
  return
}

setLoading(true)

if(mode === "login"){

const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password: password.trim()
})

if(error){
  alert(error.message)
  setLoading(false)
  return
}

const { data: player } = await supabase
  .from("players")
  .select("role")
  .eq("id", data.user.id)
  .single()

if(player.role === "coach"){
  router.push("/coach")
}else{
  router.push("/dashboard")
}

} else {



const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password: password.trim()
})

if(error){

  if(error.message.includes("User already registered")){
    alert("Account already exists. Please login.")
    setMode("login")
  }else{
    alert(error.message)
  }

  setLoading(false)
  return
}

// extra safety check
if(data?.user?.identities?.length === 0){
  alert("Account already exists. Please login.")
  setMode("login")
  setLoading(false)
  return
}

const user = data?.user || data?.session?.user

if(user){

await supabase.from("players").insert({
  id: user.id,
  name: name,
  dob: dob || null,
  phone: phone || null,
  height: height ? Number(height) : null,
  weight: weight ? Number(weight) : null,
  position: position || null,
  role: "athlete"
})

if(inviteCode){

const { data: team } = await supabase
  .from("teams")
  .select("id")
  .eq("invite_code",inviteCode)
  .single()

if(team){

await supabase.from("team_members").insert({
  team_id: team.id,
  player_id: user.id
})

}

}

}

alert("Account created! You can now login.")
setMode("login")

}

setLoading(false)

}
async function signInWithGoogle(){

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

}
return(

<div className="min-h-screen flex items-center justify-center bg-slate-50">

<div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full max-w-sm">

<h1 className="text-2xl font-bold mb-6 text-center">

{mode === "login" && "Login"}
{mode === "signup" && "Sign Up"}
{mode === "reset" && "Reset Password"}

</h1>

<div className="space-y-4">
<button
onClick={signInWithGoogle}
className="w-full border border-slate-300 rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-slate-50"
>
<img
src="https://www.svgrepo.com/show/475656/google-color.svg"
className="w-5 h-5"
/>
Sign in with Google
</button>

<div className="flex items-center gap-2 text-slate-400 text-sm">
<div className="flex-1 border-t"></div>
<span>or</span>
<div className="flex-1 border-t"></div>
</div>
{mode === "signup" && (

<div className="space-y-4">

<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full Name"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

<input type="date" value={dob} onChange={(e)=>setDob(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

<input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone Number"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

<input type="number" value={height} onChange={(e)=>setHeight(e.target.value)} placeholder="Height (cm)"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

<input type="number" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder="Weight (kg)"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

<select value={position} onChange={(e)=>setPosition(e.target.value)}
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none">

<option value="">Select Position</option>
<option>Point Guard</option>
<option>Shooting Guard</option>
<option>Small Forward</option>
<option>Power Forward</option>
<option>Center</option>

</select>

<input value={inviteCode} onChange={(e)=>setInviteCode(e.target.value.toUpperCase())}
placeholder="Team Invite Code"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

</div>

)}

<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
placeholder="example@email.com"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

{mode !== "reset" && (

<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
placeholder="Enter password"
className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"/>

)}

{mode === "login" && (

<button
className="text-sm text-emerald-600"
onClick={()=>setMode("reset")}
>
Forgot Password?
</button>

)}

<button
onClick={handleAuth}
disabled={loading}
className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg transition"
>

{loading ? "Loading..." :

mode === "login"
? "Login"
: mode === "signup"
? "Create Account"
: "Send Reset Email"}

</button>

</div>

<div className="text-center mt-6 text-sm">

{mode === "login" && (
<p>
Don't have an account?{" "}
<button className="text-emerald-600" onClick={()=>setMode("signup")}>
Sign Up
</button>
</p>
)}

{mode === "signup" && (
<p>
Already have an account?{" "}
<button className="text-emerald-600" onClick={()=>setMode("login")}>
Login
</button>
</p>
)}

{mode === "reset" && (
<p>
Remember your password?{" "}
<button className="text-emerald-600" onClick={()=>setMode("login")}>
Back to Login
</button>
</p>
)}

</div>

</div>
</div>

)

}