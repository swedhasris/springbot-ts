/**
 * AI Engine — Rule-Based Intelligence
 * =====================================
 * Completely self-contained AI logic using keyword matching and business rules.
 * No external AI services, no API keys, no third-party dependencies.
 *
 * Features:
 * - Ticket summarization
 * - Category suggestion
 * - Priority recommendation
 * - Team assignment recommendation
 * - Knowledge article matching
 * - Response template suggestion
 * - Trend analysis
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIAnalysis {
 summary: string;
 suggestedCategory: string;
 suggestedPriority: string;
 suggestedTeam: string;
 confidence: number; // 0–100
 keywords: string[];
 recommendedArticles: RecommendedArticle[];
 suggestedTemplate: ResponseTemplate | null;
}

export interface RecommendedArticle {
 id: string;
 title: string;
 category: string;
 matchScore: number;
 snippet: string;
}

export interface ResponseTemplate {
 id: string;
 name: string;
 subject: string;
 body: string;
 category: string;
}

export interface TrendData {
 topCategories: { name: string; count: number; percentage: number }[];
 topPriorities: { name: string; count: number; percentage: number }[];
 topTeams: { name: string; count: number; percentage: number }[];
 recurringIssues: { title: string; count: number }[];
 totalAnalyzed: number;
 resolutionRate: number;
 avgResponseKeywords: string[];
}

// ─── Keyword Maps ─────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
"Email Issue": [
"email","outlook","mail","smtp","exchange","inbox","mailbox",
"attachment","calendar invite","distribution list","imap","pop3",
"email client","send","receive","bounce","spam","phishing"
 ],
"Hardware Issue": [
"laptop","desktop","hardware","printer","monitor","keyboard","mouse",
"screen","display","battery","charger","dock","docking station",
"webcam","headset","scanner","copier","toner","ink",
"usb","port","ram","memory","disk","hard drive","ssd"
 ],
"Network Issue": [
"vpn","internet","network","wifi","connectivity","slow network",
"connection","ping","latency","bandwidth","firewall","proxy",
"ethernet","cable","router","switch","lan","wan","dns","ip",
"offline","disconnected","no internet","network drive","shared drive"
 ],
"Software Issue": [
"software","application","app","install","crash","error","update",
"bug","freeze","hang","not responding","blue screen","bsod",
"license","activation","upgrade","uninstall","reinstall",
"microsoft office","excel","word","powerpoint","teams","zoom",
"browser","chrome","firefox","edge","plugin","extension"
 ],
"Access Issue": [
"password","login","access","locked","account","authentication",
"permission","cannot access","unauthorized","forbidden","mfa",
"two factor","2fa","sso","single sign","credentials","token",
"expired","reset password","forgot password","user account"
 ],
"Infrastructure Issue": [
"server","database","down","outage","production","service unavailable",
"500","error 503","critical","system down","down time","maintenance",
"backup","restore","recovery","disaster","failover","load balancer",
"cloud","vm","virtual machine","hypervisor"
 ],
"Device Issue": [
"phone","mobile","device","smartphone","iphone","android","tablet",
"ipad","sim","cellular","mobile data","roaming","device management",
"mdm","company phone","work phone"
 ],
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
"1 - Critical": [
"critical","server down","outage","production down","emergency",
"system down","entire company","all users","complete failure",
"data loss","security breach","hacked","ransomware","all staff",
"business stopped","cannot work","nobody can"
 ],
"2 - High": [
"urgent","production","high priority","asap","severe","important",
"blocking","many users","department down","deadline","escalate",
"manager","director","executive","vip","time sensitive"
 ],
"3 - Moderate": [
"moderate","normal","standard","some users","workaround","intermittent",
"sometimes","occasional","few users","business hours"
 ],
"4 - Low": [
"low","minor","general","question","inquiry","when possible",
"no rush","enhancement","request","nice to have","future",
"suggestion","feedback","information"
 ],
};

const TEAM_MAP: Record<string, string> = {
"Email Issue":"Messaging Team",
"Hardware Issue":"Desktop Support Team",
"Network Issue":"Network Team",
"Software Issue":"Software Support Team",
"Access Issue":"Security Team",
"Infrastructure Issue":"Infrastructure Team",
"Device Issue":"Desktop Support Team",
};

// ─── Response Templates ───────────────────────────────────────────────────────

export const RESPONSE_TEMPLATES: ResponseTemplate[] = [
 {
 id:"tmpl-password-reset",
 name:"Password Reset",
 category:"Access Issue",
 subject:"Re: Password Reset Request",
 body: `Dear {{caller}},

Thank you for contacting IT Support.

We have received your request to reset your password. Please follow the steps below:

1. Visit the Self-Service Portal at [your portal URL]
2. Click"Forgot Password" 
3. Enter your registered email address
4. Check your email for the reset link (valid for 24 hours)
5. Click the link and create a new password

If you are unable to complete this process, please call the IT Help Desk and we will assist you immediately.

For security reasons, please ensure your new password:
- Is at least 8 characters long
- Contains uppercase and lowercase letters
- Includes at least one number and special character

Best regards,
IT Support Team`,
 },
 {
 id:"tmpl-vpn-troubleshoot",
 name:"VPN Troubleshooting",
 category:"Network Issue",
 subject:"Re: VPN Connectivity Issue",
 body: `Dear {{caller}},

Thank you for contacting IT Support regarding your VPN connection issue.

Please try the following steps to resolve your VPN connectivity problem:

1. **Disconnect and Reconnect**: Close the VPN client and restart it
2. **Check Internet Connection**: Ensure you have a working internet connection
3. **Restart VPN Client**: Right-click the VPN icon → Exit → Reopen
4. **Clear VPN Cache**: Go to Settings → Clear cache/saved connections
5. **Reinstall VPN Client**: Uninstall and reinstall the VPN application
6. **Check Firewall**: Temporarily disable firewall to test if it's blocking VPN

If none of the above steps resolve the issue, please provide:
- Your operating system version
- VPN client version
- Error message (if any)
- Your current location (office / home / other)

We will escalate to our Network Team if needed.

Best regards,
IT Support Team`,
 },
 {
 id:"tmpl-email-config",
 name:"Email Configuration",
 category:"Email Issue",
 subject:"Re: Email Configuration Issue",
 body: `Dear {{caller}},

Thank you for reporting your email issue.

To help resolve your email problem, please try the following:

1. **Outlook Restart**: Close Outlook completely and reopen it
2. **Repair Outlook**: Go to Control Panel → Programs → Microsoft Office → Repair
3. **Check Account Settings**: File → Account Settings → Verify server settings
4. **Clear Offline Cache**: File → Account Settings → Delete offline data
5. **Create New Profile**: Control Panel → Mail → Show Profiles → Add

**Server Settings (if needed):**
- Incoming: Exchange/IMAP server settings
- Outgoing: SMTP server settings
- Port: Check with IT for your organization's settings

If your email is still not working after these steps, we will remotely access your computer to diagnose the issue.

Best regards,
IT Support Team`,
 },
 {
 id:"tmpl-software-install",
 name:"Software Installation",
 category:"Software Issue",
 subject:"Re: Software Installation Request",
 body: `Dear {{caller}},

Thank you for your software installation request.

We have received your request and will process it as follows:

**Standard Software**: Available through the Software Center
1. Open Software Center (search in Start Menu)
2. Search for the required application
3. Click Install
4. The installation will proceed automatically

**Licensed Software**: Requires approval
1. Your manager needs to approve the license request
2. Once approved, our team will deploy the software remotely
3. Expected timeline: 1–2 business days after approval

**Approval Status**: {{status}}

If you need the software urgently, please have your manager contact IT Support directly.

Please note: Installing unauthorized software violates company policy and may result in system security risks.

Best regards,
IT Support Team`,
 },
 {
 id:"tmpl-hardware-support",
 name:"Hardware Support",
 category:"Hardware Issue",
 subject:"Re: Hardware Issue Report",
 body: `Dear {{caller}},

Thank you for reporting your hardware issue.

We have logged your hardware support request (Ticket: {{ticketNumber}}).

**Immediate Steps:**
1. If the device is under warranty, do NOT attempt any repairs
2. Backup your data immediately if the device is still accessible
3. Do not discard any components or packaging

**Our Process:**
1. A technician will assess your device within 24 hours
2. If repair is possible on-site, we will schedule a visit
3. If replacement is needed, we will arrange a temporary device
4. Hardware replacement approval may require manager authorization

**For Critical Issues** (complete failure, data at risk):
Please call the IT Help Desk immediately for expedited support.

Best regards,
Desktop Support Team`,
 },
 {
 id:"tmpl-general-acknowledge",
 name:"General Acknowledgement",
 category:"General",
 subject:"Re: IT Support Request",
 body: `Dear {{caller}},

Thank you for contacting IT Support.

We have received your request (Ticket: {{ticketNumber}}) and it has been assigned to our support team.

**Current Status**: {{status}}
**Priority**: {{priority}}
**Estimated Response Time**: Based on your priority level

Our team will review your request and respond within our SLA guidelines:
- Critical: Within 1 hour
- High: Within 4 hours 
- Moderate: Within 1 business day
- Low: Within 3 business days

If your situation becomes more urgent, please reply to this email or call the IT Help Desk.

Best regards,
IT Support Team`,
 },
];

// ─── Template Keyword Triggers ────────────────────────────────────────────────

const TEMPLATE_TRIGGERS: { templateId: string; keywords: string[] }[] = [
 { templateId:"tmpl-password-reset", keywords: ["password","reset","locked","cannot login","forgot password","account locked","authentication"] },
 { templateId:"tmpl-vpn-troubleshoot", keywords: ["vpn","network","connectivity","connection","internet","wifi","remote access"] },
 { templateId:"tmpl-email-config", keywords: ["email","outlook","mail","inbox","cannot send","cannot receive","exchange"] },
 { templateId:"tmpl-software-install", keywords: ["install","software","application","app","download","license","activate"] },
 { templateId:"tmpl-hardware-support", keywords: ["hardware","laptop","desktop","printer","monitor","keyboard","mouse","device","broken","not working"] },
];

// ─── Core Engine Functions ────────────────────────────────────────────────────

/**
 * Normalize text for keyword matching
 */
function normalize(text: string): string {
 return text.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"").trim();
}

/**
 * Extract keywords found in text from a keyword list
 */
function findMatchingKeywords(text: string, keywords: string[]): string[] {
 const norm = normalize(text);
 return keywords.filter(kw => norm.includes(normalize(kw)));
}

/**
 * Score text against a keyword list
 */
function scoreText(text: string, keywords: string[]): number {
 const matches = findMatchingKeywords(text, keywords);
 return matches.length;
}

/**
 * Summarize a ticket text using rule-based sentence extraction.
 * Condenses the input to the most informative ~15 words.
 */
export function summarizeTicket(text: string): string {
 if (!text || text.trim().length === 0) return"No description provided.";

 const cleaned = text.trim().replace(/\s+/g,"");

 // If already short, return as-is
 if (cleaned.split("").length <= 15) return cleaned;

 // Split into sentences
 const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);

 if (sentences.length === 0) return cleaned.split("").slice(0, 15).join("") +"...";

 // Score each sentence for information density (contains issue keywords)
 const allKeywords = Object.values(CATEGORY_KEYWORDS).flat()
 .concat(Object.values(PRIORITY_KEYWORDS).flat());

 let bestSentence = sentences[0];
 let bestScore = 0;

 sentences.forEach(sentence => {
 const score = scoreText(sentence, allKeywords);
 if (score > bestScore) {
 bestScore = score;
 bestSentence = sentence;
 }
 });

 // Trim to max 20 words
 const words = bestSentence.split("");
 if (words.length > 20) {
 return words.slice(0, 20).join("") +"...";
 }

 return bestSentence.charAt(0).toUpperCase() + bestSentence.slice(1);
}

/**
 * Suggest a category based on keyword matching
 */
export function suggestCategory(text: string): { category: string; confidence: number; matchedKeywords: string[] } {
 if (!text || text.trim().length === 0) {
 return { category:"General", confidence: 0, matchedKeywords: [] };
 }

 let bestCategory ="General";
 let bestScore = 0;
 let bestKeywords: string[] = [];

 for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
 const matched = findMatchingKeywords(text, keywords);
 const score = matched.length;
 if (score > bestScore) {
 bestScore = score;
 bestCategory = category;
 bestKeywords = matched;
 }
 }

 // Confidence: scale score to 0-100
 const maxPossible = Math.max(...Object.values(CATEGORY_KEYWORDS).map(kws => kws.length));
 const confidence = bestScore === 0 ? 0 : Math.min(100, Math.round((bestScore / Math.max(1, maxPossible * 0.3)) * 100));

 return { category: bestCategory, confidence, matchedKeywords: bestKeywords };
}

/**
 * Suggest a priority level based on keyword matching
 */
export function suggestPriority(text: string): { priority: string; confidence: number } {
 if (!text || text.trim().length === 0) {
 return { priority:"4 - Low", confidence: 0 };
 }

 const scores: Record<string, number> = {};

 for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
 scores[priority] = scoreText(text, keywords);
 }

 // Find highest scoring priority
 let bestPriority ="4 - Low";
 let bestScore = 0;

 for (const [priority, score] of Object.entries(scores)) {
 if (score > bestScore) {
 bestScore = score;
 bestPriority = priority;
 }
 }

 const confidence = bestScore === 0 ? 20 : Math.min(100, bestScore * 25);

 return { priority: bestPriority, confidence };
}

/**
 * Suggest an assignment team based on category
 */
export function suggestTeam(category: string): string {
 return TEAM_MAP[category] ||"IT Support Team";
}

/**
 * Find matching KB articles using keyword matching
 */
export function findMatchingArticles(
 text: string,
 articles: { id: string; title: string; content?: string; category?: string }[]
): RecommendedArticle[] {
 if (!text || articles.length === 0) return [];

 const norm = normalize(text);
 const searchWords = norm.split("").filter(w => w.length > 3);

 const scored = articles.map(article => {
 const titleNorm = normalize(article.title ||"");
 const contentNorm = normalize(article.content ||"");
 const categoryNorm = normalize(article.category ||"");

 let score = 0;

 // Title matches are worth more
 searchWords.forEach(word => {
 if (titleNorm.includes(word)) score += 3;
 if (contentNorm.includes(word)) score += 1;
 if (categoryNorm.includes(word)) score += 2;
 });

 // Snippet from content
 const snippet = article.content
 ? article.content.substring(0, 120) + (article.content.length > 120 ?"..." :"")
 :"No preview available.";

 return {
 id: article.id,
 title: article.title,
 category: article.category ||"General",
 matchScore: score,
 snippet,
 };
 });

 return scored
 .filter(a => a.matchScore > 0)
 .sort((a, b) => b.matchScore - a.matchScore)
 .slice(0, 5);
}

/**
 * Suggest a response template based on text analysis
 */
export function suggestResponseTemplate(text: string): ResponseTemplate | null {
 if (!text || text.trim().length === 0) return null;

 let bestTemplate: ResponseTemplate | null = null;
 let bestScore = 0;

 for (const trigger of TEMPLATE_TRIGGERS) {
 const score = scoreText(text, trigger.keywords);
 if (score > bestScore) {
 bestScore = score;
 bestTemplate = RESPONSE_TEMPLATES.find(t => t.id === trigger.templateId) || null;
 }
 }

 // If no specific match, return general acknowledgement
 if (!bestTemplate && text.trim().length > 0) {
 bestTemplate = RESPONSE_TEMPLATES.find(t => t.id ==="tmpl-general-acknowledge") || null;
 }

 return bestTemplate;
}

/**
 * Full analysis of ticket text — returns all AI recommendations
 */
export function analyzeTicket(
 text: string,
 kbArticles: { id: string; title: string; content?: string; category?: string }[] = []
): AIAnalysis {
 const categoryResult = suggestCategory(text);
 const priorityResult = suggestPriority(text);
 const team = suggestTeam(categoryResult.category);
 const summary = summarizeTicket(text);
 const articles = findMatchingArticles(text, kbArticles);
 const template = suggestResponseTemplate(text);

 // Overall confidence = average of category + priority confidences
 const confidence = Math.round((categoryResult.confidence + priorityResult.confidence) / 2);

 return {
 summary,
 suggestedCategory: categoryResult.category,
 suggestedPriority: priorityResult.priority,
 suggestedTeam: team,
 confidence,
 keywords: [...new Set(categoryResult.matchedKeywords)].slice(0, 10),
 recommendedArticles: articles,
 suggestedTemplate: template,
 };
}

/**
 * Analyze a collection of tickets to extract trends
 */
export function analyzeTrends(tickets: any[]): TrendData {
 if (!tickets || tickets.length === 0) {
 return {
 topCategories: [],
 topPriorities: [],
 topTeams: [],
 recurringIssues: [],
 totalAnalyzed: 0,
 resolutionRate: 0,
 avgResponseKeywords: [],
 };
 }

 const total = tickets.length;

 // Count categories
 const categoryCount: Record<string, number> = {};
 tickets.forEach(t => {
 const cat = t.category || t.incidentCategory ||"Uncategorized";
 categoryCount[cat] = (categoryCount[cat] || 0) + 1;
 });

 // Count priorities
 const priorityCount: Record<string, number> = {};
 tickets.forEach(t => {
 const pri = t.priority ||"4 - Low";
 priorityCount[pri] = (priorityCount[pri] || 0) + 1;
 });

 // Count teams/assignment groups
 const teamCount: Record<string, number> = {};
 tickets.forEach(t => {
 const team = t.assignmentGroup || t.assignment_group ||"Unassigned";
 teamCount[team] = (teamCount[team] || 0) + 1;
 });

 // Find recurring issues (repeated titles)
 const titleCount: Record<string, number> = {};
 tickets.forEach(t => {
 const title = (t.title ||"").toLowerCase().trim();
 if (title) titleCount[title] = (titleCount[title] || 0) + 1;
 });

 const recurringIssues = Object.entries(titleCount)
 .filter(([, count]) => count > 1)
 .sort(([, a], [, b]) => b - a)
 .slice(0, 10)
 .map(([title, count]) => ({
 title: title.charAt(0).toUpperCase() + title.slice(1),
 count,
 }));

 // Resolution rate
 const resolved = tickets.filter(t =>
 ["Resolved","Closed"].includes(t.status ||"")
 ).length;
 const resolutionRate = Math.round((resolved / total) * 100);

 // Format outputs
 const topCategories = Object.entries(categoryCount)
 .sort(([, a], [, b]) => b - a)
 .slice(0, 8)
 .map(([name, count]) => ({
 name,
 count,
 percentage: Math.round((count / total) * 100),
 }));

 const topPriorities = Object.entries(priorityCount)
 .sort(([, a], [, b]) => b - a)
 .map(([name, count]) => ({
 name,
 count,
 percentage: Math.round((count / total) * 100),
 }));

 const topTeams = Object.entries(teamCount)
 .sort(([, a], [, b]) => b - a)
 .slice(0, 8)
 .map(([name, count]) => ({
 name,
 count,
 percentage: Math.round((count / total) * 100),
 }));

 // Extract common keywords across all ticket descriptions
 const allText = tickets
 .map(t => `${t.title ||""} ${t.description ||""}`)
 .join("");

 const allKeywords = Object.values(CATEGORY_KEYWORDS)
 .flat()
 .concat(Object.values(PRIORITY_KEYWORDS).flat());

 const keywordFreq: Record<string, number> = {};
 allKeywords.forEach(kw => {
 const count = (allText.toLowerCase().match(new RegExp(kw,"gi")) || []).length;
 if (count > 0) keywordFreq[kw] = count;
 });

 const avgResponseKeywords = Object.entries(keywordFreq)
 .sort(([, a], [, b]) => b - a)
 .slice(0, 15)
 .map(([kw]) => kw);

 return {
 topCategories,
 topPriorities,
 topTeams,
 recurringIssues,
 totalAnalyzed: total,
 resolutionRate,
 avgResponseKeywords,
 };
}

/**
 * Get color for priority display
 */
export function getPriorityColor(priority: string): string {
 if (priority.includes("Critical") || priority.includes("1")) return"#ef4444";
 if (priority.includes("High") || priority.includes("2")) return"#f97316";
 if (priority.includes("Moderate") || priority.includes("3")) return"#eab308";
 return"#22c55e";
}

/**
 * Get color for category display (cycling palette)
 */
const CATEGORY_COLORS = [
"#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b",
"#ef4444","#ec4899","#14b8a6","#84cc16","#f97316"
];

export function getCategoryColor(index: number): string {
 return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
