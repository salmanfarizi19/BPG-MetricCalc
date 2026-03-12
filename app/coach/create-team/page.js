"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CreateTeam(){

  const [teamName,setTeamName] = useState("")
  const router = useRouter()

  function generateCode(){
    return Math.random().toString(36).substring(2,8).toUpperCase()
  }

  async function createTeam(){

    const { data: { user } } = await supabase.auth.getUser()

    const inviteCode = generateCode()

    const { error } = await supabase
      .from("teams")
      .insert({
        name: teamName,
        coach_id: user.id,
        invite_code: inviteCode
      })

    if(error){
      alert(error.message)
    }else{
      alert("Team created! Invite code: " + inviteCode)
      router.push("/coach")
    }

  }

  return(

    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">

      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm w-full max-w-md">

        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900">
          Create Team
        </h1>

        <input
          placeholder="Team Name"
          value={teamName}
          onChange={(e)=>setTeamName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />

        <div className="flex gap-3">

          <button
            onClick={createTeam}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-semibold transition"
          >
            Create Team
          </button>

          <button
            onClick={()=>router.back()}
            className="flex-1 border border-slate-300 hover:bg-slate-100 text-slate-700 py-3 rounded-lg transition"
          >
            Cancel
          </button>

        </div>

      </div>

    </div>

  )

}