import React, { useState } from"react";
import { collection, getDocs, deleteDoc, doc } from"firebase/firestore";
import { db } from"../lib/firebase";
import { Trash2, AlertTriangle, CheckCircle } from"lucide-react";
import { Button } from"@/components/ui/button";
import { useAuth } from"../contexts/AuthContext";

export function ClearUsers() {
 const { profile } = useAuth();
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

 // Only allow ultra_super_admin or super_admin to clear users
 const canClearUsers = profile?.role ==="ultra_super_admin" || profile?.role ==="super_admin" || profile?.role ==="admin";

 const handleClearUsers = async () => {
 if (!confirm("Are you sure you want to delete ALL users from the database?\n\nThis action cannot be undone!")) {
 return;
 }

 setLoading(true);
 setResult(null);

 try {
 const usersRef = collection(db,"users");
 const snapshot = await getDocs(usersRef);

 if (snapshot.empty) {
 setResult({ success: true, message:"No users found in the database.", count: 0 });
 setLoading(false);
 return;
 }

 let deletedCount = 0;
 const deletePromises = snapshot.docs.map(async (userDoc) => {
 await deleteDoc(doc(db,"users", userDoc.id));
 deletedCount++;
 });

 await Promise.all(deletePromises);

 setResult({
 success: true,
 message: `Successfully deleted ${deletedCount} users from the database.`,
 count: deletedCount
 });
 } catch (error: any) {
 setResult({
 success: false,
 message: `Error clearing users: ${error.message}`
 });
 } finally {
 setLoading(false);
 }
 };

 if (!canClearUsers) {
 return (
 <div className="max-w-2xl mx-auto p-8">
 <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
 <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
 <div>
 <h2 className="text-lg font-semibold text-red-700">Access Denied</h2>
 <p className="text-red-600 mt-1">
 Only administrators can access this page. Please contact an admin if you need to clear user data.
 </p>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-2xl mx-auto p-8 space-y-6">
 <div className="border border-border rounded-lg p-6 bg-card">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-red-100 rounded-lg">
 <Trash2 className="w-6 h-6 text-red-600" />
 </div>
 <div className="flex-grow">
 <h2 className="text-xl font-bold">Clear All Users</h2>
 <p className="text-muted-foreground mt-1">
 This will permanently delete all users from the Firestore database.
 This action cannot be undone.
 </p>
 </div>
 </div>

 <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
 <div className="flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
 <div className="text-sm text-yellow-800">
 <strong>Warning:</strong> Deleting all users will:
 <ul className="list-disc ml-5 mt-1 space-y-1">
 <li>Remove all user accounts from the database</li>
 <li>Log out all current users (after refresh)</li>
 <li>Reset all user-related data</li>
 </ul>
 </div>
 </div>
 </div>

 <div className="mt-6">
 <Button
 onClick={handleClearUsers}
 disabled={loading}
 variant="destructive"
 className="w-full bg-red-600 hover:bg-red-700 text-white"
 >
 {loading ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
 Clearing Users...
 </>
 ) : (
 <>
 <Trash2 className="w-4 h-4 mr-2" />
 Clear All Users
 </>
 )}
 </Button>
 </div>

 {result && (
 <div className={`mt-4 p-4 rounded-lg border ${result.success ?"bg-green-50 border-green-200" :"bg-red-50 border-red-200"}`}>
 <div className="flex items-start gap-3">
 {result.success ? (
 <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
 ) : (
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 )}
 <div className={result.success ?"text-green-800" :"text-red-800"}>
 <p className="font-medium">{result.success ?"Success" :"Error"}</p>
 <p className="text-sm mt-1">{result.message}</p>
 {result.count !== undefined && result.count > 0 && (
 <p className="text-sm mt-1 font-semibold">
 Deleted {result.count} user{result.count !== 1 ?"s" :""}
 </p>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
