import { Facebook, Twitter, Linkedin, Youtube, Instagram } from"lucide-react";

const footerLinks = [
 {
 title:"Products",
 links: ["Platform","IT Service Management","IT Operations Management","Strategic Portfolio Management","Security Operations"],
 },
 {
 title:"Solutions",
 links: ["Technology Excellence","Customer Experience","Employee Experience","Operating Excellence","Industry Solutions"],
 },
 {
 title:"Company",
 links: ["About Us","Careers","Newsroom","Events","Investor Relations"],
 },
 {
 title:"Support",
 links: ["Customer Support","Product Documentation","Community","Developer Program","Training & Certification"],
 },
];

export function Footer() {
 return (
 <footer className="bg-sn-dark pt-20 pb-10 text-white">
 <div className="container mx-auto px-4 lg:px-8">
 <div className="grid gap-12 lg:grid-cols-5">
 <div className="lg:col-span-1">
 <a href="/" className="mb-8 block">
 <span className="text-2xl font-bold tracking-tighter text-sn-green">
 Manage My Desk
 </span>
 </a>
 <p className="mb-8 text-sm text-gray-400">
 Manage My Desk is making the world of work, work better for people. Our cloud-based platform and solutions deliver digital workflows that create great experiences and unlock productivity.
 </p>
 <div className="flex gap-4">
 <a href="#" className="text-gray-400 hover:text-sn-green"><Linkedin className="h-5 w-5" /></a>
 <a href="#" className="text-gray-400 hover:text-sn-green"><Twitter className="h-5 w-5" /></a>
 <a href="#" className="text-gray-400 hover:text-sn-green"><Facebook className="h-5 w-5" /></a>
 <a href="#" className="text-gray-400 hover:text-sn-green"><Youtube className="h-5 w-5" /></a>
 <a href="#" className="text-gray-400 hover:text-sn-green"><Instagram className="h-5 w-5" /></a>
 </div>
 </div>
 
 {footerLinks.map((section, index) => (
 <div key={index}>
 <h4 className="mb-6 text-sm font-bold uppercase tracking-widest text-white">
 {section.title}
 </h4>
 <ul className="space-y-4 text-sm text-gray-400">
 {section.links.map((link, linkIndex) => (
 <li key={linkIndex}>
 <a href="#" className="hover:text-sn-green hover:underline">
 {link}
 </a>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 
 <div className="mt-20 border-t border-white/10 pt-10 text-center text-xs text-gray-500">
 <div className="mb-4 flex flex-wrap justify-center gap-6">
 <a href="#" className="hover:text-white">Privacy Statement</a>
 <a href="#" className="hover:text-white">Terms of Use</a>
 <a href="#" className="hover:text-white">Cookie Policy</a>
 <a href="#" className="hover:text-white">Sitemap</a>
 <a href="#" className="hover:text-white">Modern Slavery Statement</a>
 </div>
 <p>© 2024 Manage My Desk, Inc. All rights reserved.</p>
 </div>
 </div>
 </footer>
 );
}
