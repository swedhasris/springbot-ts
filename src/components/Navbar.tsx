import * as React from"react";
import { Search, Globe, User, Menu, X, ChevronDown } from"lucide-react";
import { Button } from"@/components/ui/button";
import {
 NavigationMenu,
 NavigationMenuContent,
 NavigationMenuItem,
 NavigationMenuLink,
 NavigationMenuList,
 NavigationMenuTrigger,
} from"@/components/ui/navigation-menu";
import { cn } from"@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from"@/components/ui/sheet";
import { GetStartedModal } from"@/src/components/GetStartedModal";

const components: { title: string; href: string; description: string }[] = [
 {
 title:"Platform",
 href:"#",
 description:"The intelligent platform for end-to-end digital transformation.",
 },
 {
 title:"Solutions",
 href:"#",
 description:"Industry-specific solutions to drive value and innovation.",
 },
 {
 title:"Services",
 href:"#",
 description:"Expert services to help you succeed at every step.",
 },
 {
 title:"Partners",
 href:"#",
 description:"Collaborate with our ecosystem of world-class partners.",
 },
];

export function Navbar() {
 return (
 <header className="sticky top-0 z-50 h-[72px] w-full border-b border-white/10 bg-sn-dark/95 backdrop-blur supports-[backdrop-filter]:bg-sn-dark/60">
 <div className="container mx-auto flex h-full items-center justify-between px-4 lg:px-10">
 <div className="flex items-center gap-12">
 <a href="/" className="flex items-center space-x-2">
 <span className="text-[22px] font-bold tracking-[-0.5px] text-white">
 service<span className="text-sn-green">now</span>
 </span>
 </a>
 <div className="hidden lg:flex">
 <NavigationMenu>
 <NavigationMenuList className="gap-8">
 <NavigationMenuItem>
 <NavigationMenuTrigger className="bg-transparent text-sm font-medium text-text-dim hover:bg-transparent hover:text-white focus:bg-transparent data-[state=open]:bg-transparent">Platform</NavigationMenuTrigger>
 <NavigationMenuContent>
 <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
 {components.map((component) => (
 <ListItem
 key={component.title}
 title={component.title}
 href={component.href}
 >
 {component.description}
 </ListItem>
 ))}
 </ul>
 </NavigationMenuContent>
 </NavigationMenuItem>
 <NavigationMenuItem>
 <NavigationMenuTrigger className="bg-transparent text-sm font-medium text-text-dim hover:bg-transparent hover:text-white focus:bg-transparent data-[state=open]:bg-transparent">Solutions</NavigationMenuTrigger>
 <NavigationMenuContent>
 <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
 <ListItem title="Technology Excellence" href="#">Optimize IT and security operations.</ListItem>
 <ListItem title="Customer Experience" href="#">Deliver seamless service experiences.</ListItem>
 <ListItem title="Employee Experience" href="#">Empower your workforce with AI.</ListItem>
 <ListItem title="Operating Excellence" href="#">Streamline business processes.</ListItem>
 </ul>
 </NavigationMenuContent>
 </NavigationMenuItem>
 <NavigationMenuItem>
 <a href="#" className="text-sm font-medium text-text-dim transition-colors hover:text-white">
 Resources
 </a>
 </NavigationMenuItem>
 <NavigationMenuItem>
 <a href="#" className="text-sm font-medium text-text-dim transition-colors hover:text-white">
 Partners
 </a>
 </NavigationMenuItem>
 </NavigationMenuList>
 </NavigationMenu>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <div className="hidden items-center gap-6 lg:flex">
 <Button variant="ghost" size="icon" className="text-text-dim hover:bg-transparent hover:text-white">
 <Search className="h-5 w-5" />
 </Button>
 <GetStartedModal trigger={
 <Button className="h-[40px] rounded-[4px] bg-sn-green px-6 text-sm font-semibold text-sn-dark hover:bg-sn-green/90">
 Get started
 </Button>
 } />
 </div>
 
 <div className="lg:hidden">
 <Sheet>
 <SheetTrigger render={
 <Button variant="ghost" size="icon" className="text-white">
 <Menu className="h-6 w-6" />
 </Button>
 } />
 <SheetContent side="right" className="border-white/10 bg-sn-dark text-white">
 <div className="flex flex-col gap-6 py-8">
 <a href="#" className="text-lg font-semibold">Platform</a>
 <a href="#" className="text-lg font-semibold">Solutions</a>
 <a href="#" className="text-lg font-semibold">Resources</a>
 <a href="#" className="text-lg font-semibold">Partners</a>
 <hr className="border-white/10" />
 <GetStartedModal trigger={
 <Button className="w-full bg-sn-green font-semibold text-sn-dark">Get started</Button>
 } />
 </div>
 </SheetContent>
 </Sheet>
 </div>
 </div>
 </div>
 </header>
 );
}

const ListItem = React.forwardRef<
 React.ElementRef<"a">,
 React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
 return (
 <li>
 <NavigationMenuLink
 render={
 <a
 ref={ref}
 className={cn(
"block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
 className
 )}
 {...props}
 >
 <div className="text-sm font-medium leading-none">{title}</div>
 <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
 {children}
 </p>
 </a>
 }
 />
 </li>
 );
});
ListItem.displayName ="ListItem";
