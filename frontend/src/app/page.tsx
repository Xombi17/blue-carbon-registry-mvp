import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Waves, Shield, Leaf, Globe, Users, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Hero Section */}
      <section className="relative px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-ocean-500 p-4">
                <Waves className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Protecting Ocean Ecosystems with{' '}
              <span className="text-ocean-600">Blockchain Technology</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              The world's first blockchain-powered registry for blue carbon credits, enabling transparent 
              tracking and verification of mangrove, seagrass, and salt marsh restoration projects.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/register">
                <Button className="bg-ocean-600 hover:bg-ocean-700 text-white px-8 py-3 text-lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/registry">
                <Button variant="outline" className="px-8 py-3 text-lg border-ocean-300 text-ocean-700 hover:bg-ocean-50">
                  Explore Registry
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Secure, Transparent, Verifiable
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Our blockchain-based platform ensures the integrity of blue carbon projects
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-ocean-100 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-ocean-600" />
                  </div>
                  <CardTitle className="text-xl">Blockchain Security</CardTitle>
                  <CardDescription>
                    Immutable records on the blockchain ensure data integrity and prevent fraud
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Environmental Impact</CardTitle>
                  <CardDescription>
                    Track and verify real environmental benefits from blue carbon projects
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Global Registry</CardTitle>
                  <CardDescription>
                    Access a comprehensive database of verified blue carbon projects worldwide
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-24 sm:py-32 bg-ocean-900 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-16">
              Making a Global Impact
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ocean-800">
                  <BarChart3 className="h-10 w-10 text-ocean-300" />
                </div>
                <h3 className="mt-6 text-3xl font-semibold">2.5M</h3>
                <p className="text-ocean-200">Tons CO₂ Sequestered</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ocean-800">
                  <Leaf className="h-10 w-10 text-ocean-300" />
                </div>
                <h3 className="mt-6 text-3xl font-semibold">1,247</h3>
                <p className="text-ocean-200">Active Projects</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ocean-800">
                  <Globe className="h-10 w-10 text-ocean-300" />
                </div>
                <h3 className="mt-6 text-3xl font-semibold">45</h3>
                <p className="text-ocean-200">Countries</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ocean-800">
                  <Users className="h-10 w-10 text-ocean-300" />
                </div>
                <h3 className="mt-6 text-3xl font-semibold">8,430</h3>
                <p className="text-ocean-200">Verified Users</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Simple steps to register and verify your blue carbon projects
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="space-y-12">
              {[
                {
                  step: '1',
                  title: 'Submit Your Project',
                  description: 'Upload project details, location data, and supporting evidence through our secure platform'
                },
                {
                  step: '2',
                  title: 'Expert Verification',
                  description: 'Our network of qualified validators reviews and verifies your project documentation'
                },
                {
                  step: '3',
                  title: 'Blockchain Registration',
                  description: 'Approved projects are permanently recorded on the blockchain with unique NFT certificates'
                },
                {
                  step: '4',
                  title: 'Earn Carbon Credits',
                  description: 'Receive tradeable carbon credits based on verified environmental impact'
                }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ocean-600 text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to Start Your Blue Carbon Journey?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Join thousands of conservationists, researchers, and organizations making a difference
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/register">
                <Button className="bg-ocean-600 hover:bg-ocean-700 text-white px-8 py-3 text-lg">
                  Create Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/registry">
                <Button variant="outline" className="px-8 py-3 text-lg">
                  Browse Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
