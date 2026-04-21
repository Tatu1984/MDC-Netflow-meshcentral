'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Server,
  Monitor,
  Database,
  Network,
  Rocket,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  Users,
  Globe,
  Cpu,
  HardDrive,
  Activity,
  Sparkles,
  Cloud,
  User,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isEntraIDConfigured, getMsalInstance } from '@/lib/msal-config'

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    isEntraIDConfigured().then(setIsConfigured)
  }, [])

  const handleSignUp = async () => {
    setSignUpLoading(true)
    setSignUpError(null)
    try {
      const { loginRequest } = await import('@/lib/msal-config')
      const msalInstance = await getMsalInstance()
      if (!msalInstance) return
      await msalInstance.initialize()
      await msalInstance.loginPopup({ ...loginRequest, prompt: 'create' })
      window.location.href = '/auth/login'
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('user_cancelled')) {
        setSignUpError(err.message)
      }
    } finally {
      setSignUpLoading(false)
    }
  }

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const concepts = [
    {
      title: "Compute",
      description: "Virtual machines, Kubernetes clusters, and container orchestration with instant provisioning.",
      icon: Monitor,
      gradient: "from-blue-500 to-indigo-600",
      shadowColor: "shadow-blue-500/25",
    },
    {
      title: "Storage",
      description: "Block storage, object storage, and distributed file systems with high availability.",
      icon: HardDrive,
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/25",
    },
    {
      title: "Networking",
      description: "VPCs, load balancers, firewalls, and software-defined networking at scale.",
      icon: Network,
      gradient: "from-violet-500 to-purple-600",
      shadowColor: "shadow-violet-500/25",
    },
    {
      title: "Databases",
      description: "Managed PostgreSQL, MySQL, Redis, and MongoDB with automated backups.",
      icon: Database,
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-amber-500/25",
    }
  ]

  const stats = [
    { value: "99.9%", label: "Uptime SLA", icon: Activity },
    { value: "< 30s", label: "VM Deploy Time", icon: Zap },
    { value: "256-bit", label: "Encryption", icon: Shield },
    { value: "24/7", label: "Monitoring", icon: Globe },
  ]

  const features = [
    { icon: Shield, text: "Enterprise Security", description: "End-to-end encryption" },
    { icon: Zap, text: "Instant Deployment", description: "VMs ready in seconds" },
    { icon: Users, text: "Multi-Tenancy", description: "Role-based access control" },
    { icon: Cpu, text: "Auto-Scaling", description: "Dynamic resource allocation" },
  ]

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden flex flex-col items-center">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-sm opacity-75" />
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight">TS Edge Nest</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">Infrastructure Management</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                <User className="mr-2 h-4 w-4" />
                User Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto py-24 md:py-32 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-medium">Enterprise Cloud Infrastructure</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            <span className="text-white">Build & Scale Your</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Infrastructure
            </span>
            <br />
            <span className="text-white">with Confidence</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            The complete platform for managing cloud resources, virtual machines,
            and networking. <span className="text-slate-300">Deploy in seconds, scale without limits.</span>
          </p>

          {/* CTA Buttons - Sign Up & Sign In */}
          <div className="flex flex-col gap-4 pt-6">
            {/* Primary Sign Up Button */}
            {isConfigured && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSignUp}
                  disabled={signUpLoading}
                  className="text-lg px-10 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-xl shadow-emerald-500/30 transition-all hover:shadow-emerald-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  {signUpLoading ? 'Signing up...' : 'Sign Up with Microsoft'}
                </Button>
              </div>
            )}

            {/* Error Display */}
            {signUpError && (
              <div className="flex justify-center">
                <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <span>{signUpError}</span>
                  <button onClick={() => setSignUpError(null)} className="hover:text-red-300">&times;</button>
                </div>
              </div>
            )}

            {/* Sign In Options */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="text-lg px-8 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-xl shadow-blue-500/30 transition-all hover:shadow-blue-500/40 hover:scale-105"
                >
                  <User className="mr-2 h-5 w-5" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-8 text-sm">
            {features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-400">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
                  <feature.icon className="h-4 w-4 text-cyan-400" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Animated Dashboard Preview */}
        <div className="max-w-4xl mx-auto mt-20 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-violet-500/20 rounded-3xl blur-2xl" />

            {/* Dashboard Card */}
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700/50 p-1 shadow-2xl">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-slate-800/50 text-xs text-slate-400 font-mono">
                    cloud.platform.io/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content Preview */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500" />
                    <div>
                      <div className="h-3 w-24 bg-slate-700 rounded" />
                      <div className="h-2 w-16 bg-slate-800 rounded mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                      <span className="text-xs text-emerald-400">● Active</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="h-2 w-8 bg-slate-600 rounded mb-2" />
                      <div className="h-6 w-12 bg-gradient-to-r from-blue-500/50 to-cyan-500/50 rounded" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 h-24 rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                    <div className="flex items-end justify-between h-full">
                      {[40, 65, 45, 80, 55, 70, 85].map((h, i) => (
                        <div key={i} className="w-6 rounded-t bg-gradient-to-t from-blue-500 to-cyan-500" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="w-32 h-24 rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative w-full max-w-7xl mx-auto py-16 border-y border-white/5 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mb-3">
                <stat.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative w-full max-w-7xl mx-auto py-24 px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <Badge className="mb-4 bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20">
            Core Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              Succeed
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Powerful tools designed for modern cloud infrastructure management
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {concepts.map((concept, index) => (
            <Card
              key={concept.title}
              className={cn(
                "group relative bg-slate-900/50 border-slate-700/50 overflow-hidden transition-all duration-500 hover:border-slate-600/50 cursor-pointer animate-fade-in-up",
                activeFeature === index && "border-slate-500/50 shadow-xl"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setActiveFeature(index)}
            >
              {/* Hover Gradient */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                concept.gradient
              )} />

              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "relative p-3 rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                    concept.gradient,
                    concept.shadowColor
                  )}>
                    <concept.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-white group-hover:text-cyan-300 transition-colors">
                      {concept.title}
                    </CardTitle>
                    <CardDescription className="text-base text-slate-400 mt-2 leading-relaxed">
                      {concept.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>

              {/* Active Indicator */}
              {activeFeature === index && (
                <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r", concept.gradient)} />
              )}
            </Card>
          ))}
        </div>

        {/* Feature Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 text-center transition-all duration-500 hover:bg-slate-900/50 hover:border-slate-700/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
              <div className="font-medium text-white text-sm">{feature.text}</div>
              <div className="text-xs text-slate-500 mt-1">{feature.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full max-w-7xl mx-auto py-24 px-4">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <div className="relative">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-violet-600/20 rounded-3xl blur-3xl" />

            <Card className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-700/50 overflow-hidden">
              {/* Pattern Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

              <CardContent className="relative py-16 px-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-cyan-500/30 mb-6">
                  <Rocket className="h-8 w-8 text-white" />
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                  Ready to Get Started?
                </h2>

                <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                  Sign in with your Microsoft account to explore the full platform capabilities.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/login">
                    <Button
                      size="lg"
                      className="text-lg px-10 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-xl shadow-cyan-500/30 transition-all hover:shadow-cyan-500/40 hover:scale-105"
                    >
                      <User className="mr-2 h-5 w-5" />
                      User Dashboard
                    </Button>
                  </Link>
                </div>

                <p className="text-sm text-slate-500 mt-6">
                  <CheckCircle className="inline h-4 w-4 text-emerald-500 mr-1" />
                  Secured with Microsoft Entra ID
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full border-t border-white/5 py-12 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">TS Edge Nest</span>
                <p className="text-xs text-slate-500">Infrastructure Management</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span>© 2024 TS Edge Nest</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Powered by Next.js & Go</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
