'use server'

import { signIn } from "@/lib/auth"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  
  if (!email || !password) return { error: "Veuillez remplir tous les champs." }

  try {
    await signIn("credentials", { 
      email, 
      password,
      redirectTo: "/dashboard" 
    })
  } catch (error: any) {
    if (error.type === 'CredentialsSignin') {
      return { error: "Identifiants invalides." }
    }
    throw error // Required for NextAuth redirect
  }
}
