"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function AuthCallback(){

const router = useRouter()

useEffect(()=>{

async function checkUser(){

await supabase.auth.refreshSession()

const { data:{ user } } = await supabase.auth.getUser()

if(!user){
router.push("/login")
return
}

const { data: player } = await supabase
.from("players")
.select("*")
.eq("user_id", user.id)
.maybeSingle()

if(player){

if(player.role === "coach"){
router.push("/coach")
}else{
router.push("/dashboard")
}

}else{

router.push("/complete-profile")

}

}

checkUser()

},[])

return (
<div className="min-h-screen flex items-center justify-center">
Loading...
</div>
)

}