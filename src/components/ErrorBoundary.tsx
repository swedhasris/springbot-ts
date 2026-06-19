import React from"react";
import { AlertTriangle, RefreshCcw } from"lucide-react";
import { Button } from"@/components/ui/button";

interface Props {
 children: React.ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
 state: any;
 props: any;

 constructor(props: any) {
 super(props);
 this.state = {
 hasError: false,
 error: null
 };
 }

 static getDerivedStateFromError(error: any) {
 return { hasError: true, error };
 }

 componentDidCatch(error: any, errorInfo: any) {
 console.error("Uncaught error:", error, errorInfo);
 }

 render() {
 if (this.state.hasError) {
 return (
 <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-muted/10 rounded-xl border-2 border-dashed border-border">
 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
 <AlertTriangle className="w-8 h-8" />
 </div>
 <div className="space-y-2">
 <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
 <p className="text-muted-foreground max-w-md mx-auto">
 An unexpected error occurred while rendering this component. 
 {this.state.error?.message && (
 <code className="block mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100">
 {this.state.error.message}
 </code>
 )}
 </p>
 </div>
 <Button 
 onClick={() => window.location.reload()} 
 className="bg-sn-green text-sn-dark font-bold gap-2"
 >
 <RefreshCcw className="w-4 h-4" /> Reload Application
 </Button>
 </div>
 );
 }

 return this.props.children;
 }
}
