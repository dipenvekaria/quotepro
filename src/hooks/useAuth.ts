import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        // With email confirmation disabled (see supabase/config.toml), signUp
        // returns a session immediately. Redirect straight into onboarding.
        if (data.session) {
          toast.success('Welcome to QuotePro!')
          router.push('/app')
          router.refresh()
        } else {
          // Confirmation-required project — nudge to check email.
          toast.success('Check your email to confirm your account!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        toast.success('Welcome back!')
        router.push('/app')
        router.refresh()
      }
    } catch (error: unknown) {
      const err = error as { message: string }
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      console.log('OAuth redirect will be:', `${currentOrigin}/auth/callback`)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${currentOrigin}/auth/callback`,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })
      
      if (error) throw error
    } catch (error: unknown) {
      const err = error as { message: string }
      toast.error(err.message)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isSignUp,
    setIsSignUp,
    handleAuth,
    handleGoogleLogin
  }
}
