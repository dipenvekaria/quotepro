import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useAuth() {
  // `email` state exists only for the invite prefill; the form fields are
  // uncontrolled and read via FormData at submit. Controlled inputs wiped
  // anything typed before hydration finished — a fast typist on a slow
  // connection filled the form, React replaced it with empty state, and the
  // submit died silently on `required`. Reproduced three times; no auth
  // request ever fired.
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // The DOM is the source of truth — it survives hydration; state does not.
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    if (!email || !password) {
      toast.error('Enter your email and password.')
      return
    }

    setIsLoading(true)

    // Honor ?next= (e.g. team invite links) so we return there after auth.
    const nextParam = new URLSearchParams(window.location.search).get('next')
    // Same-origin path only — reject '//evil.com' and '/\evil.com', which the
    // browser resolves as protocol-relative to another host.
    const dest =
      nextParam &&
      nextParam.startsWith('/') &&
      !nextParam.startsWith('//') &&
      !nextParam.startsWith('/\\')
        ? nextParam
        : '/app'

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
          toast.success('Welcome to Rivet.')
          router.push(dest)
          router.refresh()
        } else {
          // Confirmation-required project — nudge to check email.
          toast.success('Check your email to confirm your account.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        toast.success('Welcome back.')
        router.push(dest)
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
    isLoading,
    isSignUp,
    setIsSignUp,
    handleAuth,
    handleGoogleLogin,
  }
}
