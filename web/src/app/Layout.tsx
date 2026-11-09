import { Outlet, ScrollRestoration } from 'react-router'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pb-32 pt-safe">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </>
  )
}
