import { listTrades } from '@/lib/catalog/starter'

import { OnboardingForm } from './onboarding-form'

export default function OnboardingPage() {
  // Read on the server so the 100-trade list never ships to the browser as
  // props on a route that renders before anyone has an account.
  const trades = listTrades()

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            1
          </span>
          Company setup
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Let’s set up your workspace
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Four numbers and you’ll have a full price book. You can edit everything later.
        </p>

        <OnboardingForm trades={trades} />
      </div>
    </div>
  )
}
