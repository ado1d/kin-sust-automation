'use client'

import { useContext, useEffect, ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
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
  FacebookIcon
} from 'lucide-react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import { HeartHandshake } from 'lucide-react'

const BG_IMAGE_URL =
  'https://scontent.fdac31-2.fna.fbcdn.net/v/t39.30808-6/347786637_624692802599312_2613031506735535629_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=1d70fc&_nc_eui2=AeHPDsUpEBOtfT_R_8KT2oJkaG5AKexzgy1obkAp7HODLamAI2ReERInH87QUWJITjFYC-vFZww7fPF84essAYA2&_nc_ohc=dNT1Ap48RFYQ7kNvwG50DEe&_nc_oc=AdoYn3pXSNfh46thJB9s6zGRRo1kl5Ri4SbSaS7BYah6ssCpJOgzIcbstOb_b-vI0_o&_nc_zt=23&_nc_ht=scontent.fdac31-2.fna&_nc_gid=Yfu-FN5W7ReFzqPOSC6GVw&_nc_ss=7b2a8&oh=00_Af6v_wDTazBJ6uYkF4vs5mMi9DIlidukgXnjLACKWh-cJA&oe=69FCE13A'

function LandingView({ onRoleSelect }: { onRoleSelect: (role: string) => void }) {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const donationsCounter = useAnimatedCounter(500, 2000)
  const volunteersCounter = useAnimatedCounter(50, 2000)
  const eventsCounter = useAnimatedCounter(10, 2000)

  useEffect(() => {
    const timer = setTimeout(() => {
      donationsCounter.start()
      volunteersCounter.start()
      eventsCounter.start()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* ── Background image ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('${BG_IMAGE_URL}')` }}
      />

      {/* ── Vignette & Dark overlay ── */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.2),rgba(0,0,0,0.8))]" />
      
      {/* ── Red tinted glow ── */}
      <div className="absolute inset-0 bg-gradient-to-tl from-red-900/40 via-transparent to-rose-900/30" />

      {/* ── Dot pattern ── */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2NHptMC02di00aDJ2NGgtMnptLTYgNmgtNHYyaDR2LTJ6bS02IDBoLTR2Mmg0di0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      {/* Theme toggle */}
      {/* <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all z-20 shadow-lg"
      >
        {theme === 'light' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
      </button> */}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center flex-1 px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14 mt-8 md:mt-20 animate-fade-in">
          <div className="inline-flex items-center justify-center w-auto h-35 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 mb-8 shadow-2xl p-3">
            <img src="/kin-logo.png" alt="KIN Logo" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-700 drop-shadow-md">
            KIN
          </h1>
          <p className="text-xl md:text-2xl font-light text-white/90 max-w-2xl mx-auto tracking-wide">
            A Voluntary Organization — <span className="font-semibold text-white">Join Us</span>
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-1 gap-8 max-w-lg w-full px-4 mb-20">
          <RoleCard
            icon={<HeartHandshake className="w-9 h-9" />}
            title="Donor"
            description="Make monetary or in-kind donations to support our causes"
            color="from-rose-500 to-red-700"
            onClick={() => onRoleSelect('donor')}
          />
        </div>

        {/* Animated Stat Counters */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 max-w-3xl w-full mb-20 shadow-xl">
          <div className="grid grid-cols-3 gap-6 md:gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/10">
                <Gift className="w-7 h-7 text-rose-400" />
              </div>
              <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {donationsCounter.count}+
              </p>
              <p className="text-xs md:text-sm text-white/60 mt-1 uppercase tracking-widest font-semibold">Donations</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/10">
                <Users className="w-7 h-7 text-rose-400" />
              </div>
              <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {volunteersCounter.count}+
              </p>
              <p className="text-xs md:text-sm text-white/60 mt-1 uppercase tracking-widest font-semibold">Volunteers</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/10">
                <Calendar className="w-7 h-7 text-rose-400" />
              </div>
              <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {eventsCounter.count}+
              </p>
              <p className="text-xs md:text-sm text-white/60 mt-1 uppercase tracking-widest font-semibold">Events</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl w-full px-4 mb-24">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12 tracking-tight">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center relative group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20 group-hover:bg-rose-500/20 group-hover:border-rose-400/50 transition-all duration-300">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-8 right-0 hidden md:block translate-x-1/2">
                <ArrowRight className="w-6 h-6 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Register</h3>
              <p className="text-white/50 text-sm">Sign up as a donor to get started</p>
            </div>
            <div className="text-center relative group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20 group-hover:bg-rose-500/20 group-hover:border-rose-400/50 transition-all duration-300">
                <HandHeart className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-8 right-0 hidden md:block translate-x-1/2">
                <ArrowRight className="w-6 h-6 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Donate</h3>
              <p className="text-white/50 text-sm">Contribute money, items, or your time</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20 group-hover:bg-rose-500/20 group-hover:border-rose-400/50 transition-all duration-300">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Make Impact</h3>
              <p className="text-white/50 text-sm">Every contribution reaches those in need</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full max-w-5xl px-4 pt-8 border-t border-white/10 mt-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center p-1 border border-white/10">
                <img src="/kin-logo.png" alt="KIN Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-white/50 text-sm font-medium">&copy; 2026 KIN-SUST</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://www.kinsust.org" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all" title="Website">
                <Globe className="w-4 h-4 text-white/80" />
              </a>
              <a href="mailto:contact@kinsust.org" className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all" title="Email">
                <Mail className="w-4 h-4 text-white/80" />
              </a>
              <a href="https://facebook.com/KINSUST" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all" title="Facebook">
                <FacebookIcon className="w-4 h-4 text-white/80" />
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
    <div 
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      {/* Outer Glow Effect on Hover */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${color} rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-all duration-500`} />
      
      {/* Main Card Container (Glassmorphism) */}
      <div className="relative h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300 overflow-hidden flex flex-col">
        
        {/* Top Gradient Accent Line */}
        <div className={`h-1 w-full bg-gradient-to-r ${color}`} />
        
        <div className="flex-1 flex flex-col items-center p-8 pt-10 text-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300 ring-4 ring-white/10`}>
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
          <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs">{description}</p>
          
          <button className={`mt-auto inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${color} text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group/btn`}>
            Get Started 
            <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { RoleCard, LandingView }