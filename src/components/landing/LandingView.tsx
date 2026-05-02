'use client'

import { useContext, useEffect, ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Heart,
  Users,
  Shield,
  ArrowRight,
  Moon,
  Sun,
  Gift,
  Calendar,
  UserPlus,
  HandHeart,
  CheckCircle,
  Globe,
  Mail,
  ExternalLink,
  FacebookIcon
} from 'lucide-react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import { HeartHandshake } from 'lucide-react'

function LandingView({ onRoleSelect }: { onRoleSelect: (role: string) => void }) {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const donationsCounter = useAnimatedCounter(500, 2000)
  const volunteersCounter = useAnimatedCounter(50, 2000)
  const eventsCounter = useAnimatedCounter(10, 2000)

  // Start counters on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      donationsCounter.start()
      volunteersCounter.start()
      eventsCounter.start()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-red-600 to-red-800" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoMnY0aC0yem0tNiA2aC00djJoNHYtMnptLTYgMGgtNHYyaDR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all z-10"
      >
        {theme === 'light' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12 mt-8 md:mt-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/90 backdrop-blur-sm mb-6 shadow-xl p-2">
            <img 
              src="/kin-logo.png" 
              alt="KIN Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            KIN Automation
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Join Us
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          <RoleCard
            icon={<HeartHandshake className="w-8 h-8" />}
            title="Donor"
            description="Make monetary or in-kind donations to support our causes"
            color="from-rose-500 to-pink-600"
            onClick={() => onRoleSelect('donor')}
          />
          <RoleCard
            icon={<Users className="w-8 h-8" />}
            title="Volunteer"
            description="Join our team and help with donation pickups and distributions"
            color="from-amber-500 to-orange-600"
            onClick={() => onRoleSelect('volunteer')}
          />
          <RoleCard
            icon={<Shield className="w-8 h-8" />}
            title="Admin"
            description="Manage donors, volunteers, events, and track all activities"
            color="from-violet-500 to-purple-600"
            onClick={() => onRoleSelect('admin')}
          />
        </div>

        {/* Animated Stat Counters */}
        <div className="grid grid-cols-3 gap-6 md:gap-12 max-w-3xl w-full mt-16 mb-16 px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm mb-3">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <p className="text-3xl md:text-4xl font-extrabold text-white">{donationsCounter.count}+</p>
            <p className="text-sm md:text-base text-white/70 mt-1">Donations</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm mb-3">
              <Users className="w-7 h-7 text-white" />
            </div>
            <p className="text-3xl md:text-4xl font-extrabold text-white">{volunteersCounter.count}+</p>
            <p className="text-sm md:text-base text-white/70 mt-1">Volunteers</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm mb-3">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <p className="text-3xl md:text-4xl font-extrabold text-white">{eventsCounter.count}+</p>
            <p className="text-sm md:text-base text-white/70 mt-1">Events</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl w-full px-4 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 ring-2 ring-white/30">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-8 right-0 hidden md:block translate-x-1/2">
                <ArrowRight className="w-6 h-6 text-white/40" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Register</h3>
              <p className="text-white/70 text-sm">Sign up as a donor to get started</p>
            </div>
            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 ring-2 ring-white/30">
                <HandHeart className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-8 right-0 hidden md:block translate-x-1/2">
                <ArrowRight className="w-6 h-6 text-white/40" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Donate</h3>
              <p className="text-white/70 text-sm">Contribute money, items, or your time as a volunteer</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 ring-2 ring-white/30">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Make Impact</h3>
              <p className="text-white/70 text-sm">Every contribution reaches those who need it most</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full max-w-5xl px-4 pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center p-1">
                <img 
                  src="/kin-logo.png" 
                  alt="KIN Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-white/70 text-sm">&copy; 2026 KIN-SUST</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://www.kinsust.org" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Website">
                <Globe className="w-4 h-4 text-white" />
              </a>
              <a href="mailto:contact@kinsust.org" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Email">
                <Mail className="w-4 h-4 text-white" />
              </a>
              <a href="https://facebook.com/KINSUST" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Facebook">
                <FacebookIcon className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function RoleCard({ icon, title, description, color, onClick }: {
  icon: ReactNode
  title: string
  description: string
  color: string
  onClick: () => void
}) {
  return (
    <Card 
      className="group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
      <CardFooter className="justify-center pt-2">
        <Button variant="ghost" className="group/btn">
          Get Started <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export { RoleCard, LandingView }
