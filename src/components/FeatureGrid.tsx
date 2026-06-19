import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Cpu, Users, BarChart3, ShieldCheck, Zap, Globe } from"lucide-react";
import { cn } from"@/lib/utils";

const features = [
 {
 title:"Generative AI for the Enterprise",
 description:"Boost productivity with built-in intelligence across your entire workflow. Get work done faster with Now Assist.",
 icon: Zap,
 color:"text-sn-green",
 large: true,
 },
 {
 title:"Technology Excellence",
 description:"Optimize IT spend and modernize operations.",
 icon: Cpu,
 color:"text-blue-500",
 },
 {
 title:"Employee Experience",
 description:"Simplify work for everyone, everywhere.",
 icon: Users,
 color:"text-sn-green",
 },
 {
 title:"Operating Excellence",
 description:"Streamline business processes and increase efficiency.",
 icon: BarChart3,
 color:"text-purple-500",
 },
 {
 title:"Security & Risk",
 description:"Build resilience and manage risk across the enterprise.",
 icon: ShieldCheck,
 color:"text-red-500",
 },
];

export function FeatureGrid() {
 return (
 <section className="bg-sn-dark py-24">
 <div className="container mx-auto px-4 lg:px-8">
 <div className="mb-16">
 <span className="mb-2 inline-block text-xs font-bold tracking-widest text-sn-green uppercase">
 Solutions
 </span>
 <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
 Put AI to work for your business
 </h2>
 </div>
 
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
 {features.map((feature, index) => (
 <Card 
 key={index} 
 className={cn(
"group relative flex flex-col justify-between overflow-hidden border-white/10 bg-white/5 transition-all hover:border-sn-green/30 hover:bg-white/10",
 feature.large &&"lg:col-span-1 lg:row-span-2 bg-gradient-to-br from-sn-green/10 to-sn-dark border-sn-green/30"
 )}
 >
 <CardHeader className="p-6">
 <div className={cn(
"mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sn-green font-bold text-sn-dark",
 !feature.large &&"bg-white/10 text-sn-green"
 )}>
 {feature.large ?"AI" : <feature.icon className="h-5 w-5" />}
 </div>
 <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0">
 <p className="text-sm leading-relaxed text-text-dim">
 {feature.description}
 </p>
 <div className="mt-6 flex items-center text-xs font-bold text-sn-green uppercase tracking-wider">
 Learn more <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 </section>
 );
}

