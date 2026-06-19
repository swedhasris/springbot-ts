import { motion } from"motion/react";

const logos = [
"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png",
"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png",
"https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/2560px-IBM_logo.svg.png",
"https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/2560px-Netflix_2015_logo.svg.png",
"https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2560px-Microsoft_logo.svg.png",
];

export function CustomerStories() {
 return (
 <section className="bg-sn-dark py-24">
 <div className="container mx-auto px-4 lg:px-8">
 <div className="mb-16 flex flex-col items-center justify-between gap-8 lg:flex-row lg:items-end">
 <div className="max-w-2xl">
 <span className="mb-2 inline-block text-xs font-bold tracking-widest text-sn-green uppercase">
 Customer Stories
 </span>
 <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
 Trusted by the world's leading organizations
 </h2>
 <p className="text-lg text-text-dim">
 See how companies across every industry are using Manage My Desk to transform their business and deliver extraordinary results.
 </p>
 </div>
 <a href="#" className="text-lg font-semibold text-sn-green hover:underline">
 View all customer stories →
 </a>
 </div>

 <div className="grid gap-8 lg:grid-cols-2">
 <div className="group relative overflow-hidden rounded-[12px] border border-white/10 bg-white/5 text-white">
 <img
 src="https://picsum.photos/seed/office/800/600"
 alt="Customer Success"
 className="h-[400px] w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
 referrerPolicy="no-referrer"
 />
 <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-sn-dark to-transparent">
 <span className="mb-2 text-[11px] font-bold uppercase tracking-widest text-sn-green">Case Study</span>
 <h3 className="mb-4 text-2xl font-bold">How a global retailer transformed their customer service with AI</h3>
 <p className="text-text-dim">"Manage My Desk has completely changed how we interact with our customers, reducing response times by 40%."</p>
 </div>
 </div>
 
 <div className="flex flex-col gap-8">
 <div className="rounded-[12px] border border-white/10 bg-white/5 p-8">
 <blockquote className="mb-6 text-xl font-medium italic text-white">
"The Manage My Desk platform is the backbone of our digital transformation journey. It allows us to move faster and innovate more effectively."
 </blockquote>
 <div className="flex items-center gap-4">
 <div className="h-12 w-12 rounded-full bg-white/10" />
 <div>
 <div className="font-bold text-white">Jane Doe</div>
 <div className="text-sm text-text-dim">CTO, Global Tech Corp</div>
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
 {logos.map((logo, index) => (
 <div key={index} className="flex h-20 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 p-4 grayscale transition-all hover:grayscale-0">
 <img src={logo} alt="Partner Logo" className="max-h-8 w-auto object-contain invert opacity-60 hover:opacity-100" referrerPolicy="no-referrer" />
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}

