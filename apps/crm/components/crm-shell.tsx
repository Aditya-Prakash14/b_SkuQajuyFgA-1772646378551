'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Users, Truck, Sparkles, FileText, Settings,
  LogOut, Menu, ChevronRight, ChevronsUpDown, type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Role = 'staff' | 'admin' | 'super_admin'
export interface ShellAdmin {
  full_name: string
  email: string
  role: Role
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

const ALL: Role[] = ['staff', 'admin', 'super_admin']
const MANAGER: Role[] = ['admin', 'super_admin']

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Overview', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL }] },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/orders', label: 'Orders', icon: ClipboardList, roles: ALL },
      { href: '/dashboard/customers', label: 'Customers', icon: Users, roles: ALL },
      { href: '/dashboard/vendors', label: 'Vendors', icon: Truck, roles: ALL },
    ],
  },
  {
    label: 'Catalog & billing',
    items: [
      { href: '/dashboard/services', label: 'Services', icon: Sparkles, roles: MANAGER },
      { href: '/dashboard/invoices', label: 'Invoices', icon: FileText, roles: MANAGER },
    ],
  },
  { label: 'Admin', items: [{ href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['super_admin'] }] },
]

const ROLE_META: Record<Role, { label: string; variant: BadgeProps['variant'] }> = {
  super_admin: { label: 'Super Admin', variant: 'default' },
  admin: { label: 'Admin', variant: 'brand' },
  staff: { label: 'Staff', variant: 'secondary' },
}

export default function CrmShell({
  admin,
  configured,
  children,
}: {
  admin: ShellAdmin | null
  configured: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // Radix DropdownMenu uses useId(); rendering it only after mount avoids an
  // SSR/client id hydration mismatch on the trigger.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const role: Role = admin?.role ?? 'super_admin'
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length)
  const flat = groups.flatMap((g) => g.items)

  const isActive = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href))
  const current = flat.find((n) => isActive(n.href))
  const crumbSub = current && pathname !== current.href ? (pathname.endsWith('/new') ? 'New' : 'Details') : null

  async function signOut() {
    if (configured) await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const initials = (admin?.full_name ?? 'Preview')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const userButton = (
    <Button variant="ghost" className="h-auto gap-2 py-1 pl-1 pr-2 text-left">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials}</AvatarFallback>
      </Avatar>
      <span className="hidden leading-tight sm:block">
        <span className="block text-sm font-semibold">{admin?.full_name ?? 'Preview Mode'}</span>
        <span className="block text-[11px] font-normal text-muted-foreground">{ROLE_META[role].label}</span>
      </span>
      <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
    </Button>
  )

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground shadow-sm">M</div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-sidebar-foreground">MyPrimeCompany</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Operations CRM</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                    <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', configured ? 'bg-green-500' : 'bg-amber-500')} />
          {configured ? 'Connected to Supabase' : 'Dev preview'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border md:block">{sidebar}</aside>

      {/* Mobile nav. Sheet brings the focus trap, scroll lock, Escape handling
          and exit animation the hand-rolled overlay was missing. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 border-sidebar-border p-0 md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">CRM</span>
            {current && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className={cn(crumbSub ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{current.label}</span>
              </>
            )}
            {crumbSub && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="font-semibold text-foreground">{crumbSub}</span>
              </>
            )}
          </nav>

          <div className="flex-1" />

          {!configured && <Badge variant="warning" className="hidden sm:inline-flex">Dev preview</Badge>}
          <ThemeToggle />

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{userButton}</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{admin?.full_name ?? 'Preview Mode'}</p>
                  <p className="truncate text-xs text-muted-foreground">{admin?.email ?? 'Supabase not connected'}</p>
                  <Badge variant={ROLE_META[role].variant} className="mt-1.5">{ROLE_META[role].label}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()} className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-500/10">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            userButton
          )}
        </header>

        {!configured && (
          <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Running in <strong>dev preview</strong>. Add your Supabase keys to{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">apps/crm/.env.local</code>, run the migrations, then sign in.
          </div>
        )}

        <main className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
