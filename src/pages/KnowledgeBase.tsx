import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { BookOpen, Search, Plus, ThumbsUp, Eye, Clock, User, Star, ChevronRight, X, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

const CATEGORIES = ["Applications","Hardware","Network","Security","Messaging","Access","General"];

export function KnowledgeBase() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "General" });
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "kb_articles"), orderBy("views", "desc"));
    return onSnapshot(q, snap => setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedArticleId) {
        await updateDoc(doc(db, "kb_articles", selectedArticleId), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "kb_articles"), {
          ...form,
          views: 0,
          rating: 0,
          votes: 0,
          author: profile?.name || "Unknown",
          authorId: profile?.uid || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      setSelectedArticleId(null);
      setForm({ title: "", content: "", category: "General" });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleView = async (id: string) => {
    try { await updateDoc(doc(db, "kb_articles", id), { views: increment(1) }); } catch {}
  };

  const handleVote = async (id: string) => {
    try { await updateDoc(doc(db, "kb_articles", id), { votes: increment(1) }); } catch {}
  };

  const filtered = articles.filter(a =>
    (a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase())) &&
    (!category || a.category === category)
  );

  return (
    <div className="standard-page-layout">
      {/* Page Header */}
      <div className="standard-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-description">Find articles, documentation and troubleshooting guides</p>
        </div>
        <div className="w-full sm:w-96 relative group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
          <input type="text" placeholder="Search for articles, topics, or keywords..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl py-2 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="sn-card p-4">
            <h3 className="card-title mb-4">Categories</h3>
            <div className="space-y-1">
              <button onClick={() => setCategory("")}
                className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors",
                  !category ? "bg-sn-green/10 text-sn-green font-bold" : "text-sn-dark")}>
                All Articles <span className="text-xs text-muted-foreground">{articles.length}</span>
              </button>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat === category ? "" : cat)}
                  className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors",
                    category === cat ? "bg-sn-green/10 text-sn-green font-bold" : "text-sn-dark")}>
                  {cat}
                  <span className="text-xs text-muted-foreground">{articles.filter(a => a.category === cat).length}</span>
                </button>
              ))}
            </div>
          </div>
          {(profile?.role === "admin" || profile?.role === "agent") && (
            <Button className="w-full bg-sn-green text-sn-dark font-bold gap-2" onClick={() => { setSelectedArticleId(null); setForm({ title: "", content: "", category: "General" }); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Write Article
            </Button>
          )}
        </div>

        {/* Articles */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-sn-dark">
              {category ? `${category} Articles` : "All Articles"} ({filtered.length})
            </h2>
          </div>
          {filtered.length === 0 ? (
            <div className="sn-card p-12 text-center text-muted-foreground">
              {articles.length === 0 ? "No articles yet. Be the first to write one!" : "No articles match your search."}
            </div>
          ) : filtered.map(article => (
            <div key={article.id} className="sn-card p-6 hover:border-sn-green transition-all group cursor-pointer"
              onClick={() => handleView(article.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-grow">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase text-muted-foreground">{article.category}</span>
                    {article.votes > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                        <ThumbsUp className="w-3 h-3" /> {article.votes} helpful
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-sn-dark group-hover:text-sn-green transition-colors">{article.title}</h3>
                  {article.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                  )}
                  <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{article.author}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.views || 0} views</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />
                      {formatDate(article.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "ultra_super_admin" || article.authorId === profile?.uid) && (
                      <>
                        <button onClick={e => {
                          e.stopPropagation();
                          setSelectedArticleId(article.id);
                          setForm({ title: article.title, content: article.content, category: article.category });
                          setShowModal(true);
                        }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Article">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={async e => {
                          e.stopPropagation();
                          if (confirm(`Delete article: ${article.title}?`)) {
                            const { deleteDoc, doc } = await import("firebase/firestore");
                            await deleteDoc(doc(db, "kb_articles", article.id));
                          }
                        }} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Article">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleVote(article.id); }}
                    className="p-2 hover:bg-sn-green/10 rounded-lg transition-colors" title="Mark as helpful">
                    <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-sn-green" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-sn-green transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold">{selectedArticleId ? "Edit Knowledge Article" : "Write Knowledge Article"}</h3>
              <button onClick={() => { setShowModal(false); setSelectedArticleId(null); }} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                  className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Content <span className="text-red-500">*</span></label>
                <textarea required rows={8} value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
                  placeholder="Write the article content here..."
                  className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setSelectedArticleId(null); }}>Cancel</Button>
                <Button type="submit" className="bg-sn-green text-sn-dark font-bold" disabled={saving}>
                  {saving ? "Saving..." : selectedArticleId ? "Update Article" : "Publish Article"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
