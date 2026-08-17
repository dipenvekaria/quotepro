'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import { setCatalogEditor } from './team-actions'

/**
 * Whether this teammate may change the price book.
 *
 * Shown per person rather than per role, because that is how the trust actually
 * works: an owner knows which of their salespeople they would let touch pricing
 * and it is not a property of the job title.
 *
 * Optimistic, and reverts on failure. Toggling a permission and watching a
 * spinner is a worse answer than showing the new state and taking it back if
 * the server disagrees — and the server is the one that decides either way.
 */
export function CatalogAccessToggle({
  userId,
  name,
  initial,
}: {
  userId: string
  name: string
  initial: boolean
}) {
  const router = useRouter()
  const [on, setOn] = useState(initial)
  const [, start] = useTransition()

  function toggle(next: boolean) {
    setOn(next)
    start(async () => {
      const res = await setCatalogEditor({ user_id: userId, can_edit: next })
      if (!res.ok) {
        setOn(!next)
        toast.error(res.error)
        return
      }
      toast.success(
        next ? `${name} can now edit the price book` : `${name} can no longer edit the price book`,
      )
      router.refresh()
    })
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">Price book</span>
      <Switch
        checked={on}
        onCheckedChange={toggle}
        aria-label={`Allow ${name} to edit the price book`}
      />
    </label>
  )
}
