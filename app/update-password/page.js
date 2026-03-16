"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function UpdatePassword(){

  const [password,setPassword] = useState("")
  const router = useRouter()

async function updatePassword(){

  if(password.length < 6){
    alert("Password must be at least 6 characters")
    return
  }

  const { error } = await supabase.auth.updateUser({
    password
  })

  if(error){
    alert(error.message)
  } else {
    alert("Password updated!")
    router.push("/login")
  }

}

  return(

    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8">

        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900">
          Set New Password
        </h1>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="flex gap-3">

 <button
onClick={updatePassword}
disabled={password.length < 6}
className="flex-1 bg-emerald-500 disabled:bg-slate-300 text-white py-3 rounded-lg font-semibold"
>
Update Password
</button>
          <button
          onClick={()=>router.back()}
          className="flex-1 border border-slate-300 hover:bg-slate-100 py-3 rounded-lg transition"
          >
          Cancel
          </button>

        </div>

      </div>

    </div>

  )
}