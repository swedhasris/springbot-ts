/**
 * AI-Powered Work Session Manager
 * Handles screenshot capture, AI analysis, and auto work notes generation
 */

// Capture a screenshot of the current visible page using html2canvas-style approach
export async function captureScreenshot(): Promise<string> {
 try {
 // Use the native Canvas API to capture the current viewport
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Canvas context not available');

 // Set canvas to viewport size
 canvas.width = window.innerWidth;
 canvas.height = window.innerHeight;

 // Draw a representation of the current page
 // We'll capture the DOM state as a data snapshot instead of pixel-perfect screenshot
 // since html2canvas is heavy — we send page context to the AI instead
 const pageContext = gatherPageContext();
 
 // Return the context as a lightweight"screenshot" payload
 return JSON.stringify(pageContext);
 } catch (error) {
 console.error('[WorkSession] Screenshot capture failed:', error);
 return JSON.stringify({ error: 'capture_failed', fallback: document.title });
 }
}

// Gather rich context from the current page DOM
function gatherPageContext(): PageContext {
 const url = window.location.pathname;
 const title = document.title;
 
 // Get all visible text content from forms/inputs
 const formData: Record<string, string> = {};
 document.querySelectorAll('input, select, textarea').forEach((el) => {
 const input = el as HTMLInputElement;
 const label = input.closest('.grid')?.querySelector('label')?.textContent?.trim() || 
 input.getAttribute('placeholder') || 
 input.name || '';
 if (label && input.value) {
 formData[label] = input.value.substring(0, 200);
 }
 });

 // Get key headings and status indicators
 const headings = Array.from(document.querySelectorAll('h1, h2, h3, [class*="font-bold"]'))
 .slice(0, 10)
 .map(el => el.textContent?.trim() || '')
 .filter(Boolean);

 // Get status badges / pill elements
 const badges = Array.from(document.querySelectorAll('[class*="rounded-full"], [class*="badge"], [class*="status"]'))
 .slice(0, 5)
 .map(el => el.textContent?.trim() || '')
 .filter(Boolean);

 // Detect page type
 const pageType = detectPageType(url, headings);

 return {
 url,
 title,
 pageType,
 headings,
 badges,
 formData,
 timestamp: new Date().toISOString(),
 visibleText: getVisibleTextSummary()
 };
}

function detectPageType(url: string, headings: string[]): string {
 if (url.includes('/tickets/')) return 'ticket_detail';
 if (url.includes('/tickets')) return 'ticket_list';
 if (url.includes('/timesheet')) return 'timesheet';
 if (url.includes('/settings')) return 'settings';
 if (url.includes('/users')) return 'user_management';
 if (url.includes('/calendar')) return 'calendar';
 if (url.includes('/leaderboard')) return 'leaderboard';
 if (url.includes('/kb')) return 'knowledge_base';
 if (url.includes('/cmdb')) return 'cmdb';
 if (url.includes('/reports')) return 'reports';
 return 'general';
}

function getVisibleTextSummary(): string {
 // Get the main content area text (not sidebar/nav)
 const main = document.querySelector('main') || document.body;
 const text = main.textContent || '';
 // Trim to first 500 chars of meaningful content
 return text.replace(/\s+/g, ' ').trim().substring(0, 500);
}

interface PageContext {
 url: string;
 title: string;
 pageType: string;
 headings: string[];
 badges: string[];
 formData: Record<string, string>;
 timestamp: string;
 visibleText: string;
}

// Send captured context to AI for analysis
export async function analyzeWorkContext(
 context: string,
 ticketNumber: string,
 ticketTitle: string,
 action: 'start' | 'stop',
 elapsedTime?: number
): Promise<WorkAnalysis> {
 try {
 const response = await fetch('/api/ai/analyze-work', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 context,
 ticketNumber,
 ticketTitle,
 action,
 elapsedTime
 })
 });

 if (!response.ok) {
 throw new Error(`AI analysis failed: ${response.status}`);
 }

 return await response.json();
 } catch (error) {
 console.error('[WorkSession] AI analysis failed:', error);
 // Return a smart fallback
 return generateFallbackAnalysis(ticketNumber, ticketTitle, action, elapsedTime);
 }
}

function generateFallbackAnalysis(
 ticketNumber: string,
 ticketTitle: string,
 action: 'start' | 'stop',
 elapsedTime?: number
): WorkAnalysis {
 const verbs = [
 'Investigated', 'Reviewed', 'Analyzed', 'Examined',
 'Worked on', 'Addressed', 'Assessed', 'Evaluated'
 ];
 const stopVerbs = [
 'Completed investigation of', 'Finished working on', 
 'Concluded review of', 'Wrapped up analysis of'
 ];
 
 const verb = action === 'start' 
 ? verbs[Math.floor(Math.random() * verbs.length)]
 : stopVerbs[Math.floor(Math.random() * stopVerbs.length)];

 const durationStr = elapsedTime 
 ? ` (${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s)` 
 : '';

 return {
 summary: `${verb} incident ${ticketNumber}: ${ticketTitle}${durationStr}`,
 activityType: 'ticket_resolution',
 confidence: 0.5,
 actionVerb: verb,
 detectedActivities: ['Ticket work']
 };
}

export interface WorkAnalysis {
 summary: string;
 activityType: string;
 confidence: number;
 actionVerb: string;
 detectedActivities: string[];
}

// Save a work session record
export async function saveWorkSession(session: WorkSessionData): Promise<any> {
 try {
 const response = await fetch('/api/work-sessions', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(session)
 });

 if (!response.ok) {
 throw new Error(`Save work session failed: ${response.status}`);
 }

 return await response.json();
 } catch (error) {
 console.error('[WorkSession] Failed to save session:', error);
 throw error;
 }
}

export interface WorkSessionData {
 user_id: string;
 user_name: string;
 ticket_id: string;
 ticket_number: string;
 start_time: string;
 stop_time?: string;
 duration?: number;
 start_context?: string;
 stop_context?: string;
 ai_notes_start?: string;
 ai_notes_stop?: string;
 status: 'active' | 'completed';
}
