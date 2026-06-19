import React, { useEffect, useState } from"react";

interface TypographySettings {
 globalFont: string;
 loginFont: string;
 dashboardFont: string;
 ticketFont: string;
 reportFont: string;
 portalFont: string;
 kbFont: string;
 profileFont: string;
 customFonts: Array<{ name: string; url: string }>;
}

export function DynamicTypography() {
 const [settings, setSettings] = useState<TypographySettings>({
 globalFont:"Inter",
 loginFont:"Inter",
 dashboardFont:"Inter",
 ticketFont:"Inter",
 reportFont:"Inter",
 portalFont:"Inter",
 kbFont:"Inter",
 profileFont:"Inter",
 customFonts: []
 });

 useEffect(() => {
 // Fetch typography settings from backend
 fetch("/api/settings/typography")
 .then(res => res.json())
 .then(data => {
 if (data && !data.error) {
 setSettings(data);
 }
 })
 .catch(err => console.error("Error loading typography settings:", err));
 }, []);

 useEffect(() => {
 // 1. Collect all google fonts to load
 const standardFonts = ["Inter","Roboto","Outfit","Open Sans","Poppins","Montserrat","Lato"];
 const activeFonts = new Set<string>();
 
 const fontFields = [
 settings.globalFont,
 settings.loginFont,
 settings.dashboardFont,
 settings.ticketFont,
 settings.reportFont,
 settings.portalFont,
 settings.kbFont,
 settings.profileFont
 ];

 fontFields.forEach(f => {
 if (f && standardFonts.includes(f)) {
 activeFonts.add(f);
 }
 });

 // 2. Load Google Fonts
 if (activeFonts.size > 0) {
 const fontFamilies = Array.from(activeFonts)
 .map(f => `family=${f.replace(/\s+/g,"+")}:wght@300;400;500;600;700`)
 .join("&");
 
 const linkId ="dynamic-google-fonts";
 let link = document.getElementById(linkId) as HTMLLinkElement;
 if (!link) {
 link = document.createElement("link");
 link.id = linkId;
 link.rel ="stylesheet";
 document.head.appendChild(link);
 }
 link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
 }

 // 3. Inject CSS styles
 const styleId ="dynamic-typography-styles";
 let style = document.getElementById(styleId) as HTMLStyleElement;
 if (!style) {
 style = document.createElement("style");
 style.id = styleId;
 document.head.appendChild(style);
 }

 // Generate @font-face rules for custom fonts
 let customFontRules ="";
 if (settings.customFonts && settings.customFonts.length > 0) {
 settings.customFonts.forEach(font => {
 customFontRules += `
 @font-face {
 font-family: '${font.name}';
 src: url('${font.url}') format('woff2');
 font-weight: normal;
 font-style: normal;
 font-display: swap;
 }
 `;
 });
 }

 // CSS selectors for modules
 style.innerHTML = `
 ${customFontRules}

 /* Global assignment */
 body, html, #root {
 font-family: '${settings.globalFont || 'Inter'}', sans-serif !important;
 }

 /* Login & Registration assignment */
 .login-container, [class*="login-"], [class*="register-"] {
 font-family: '${settings.loginFont || 'Inter'}', sans-serif !important;
 }

 /* Dashboard assignment */
 .dashboard-container, [class*="dashboard"], [class*="Dashboard"] {
 font-family: '${settings.dashboardFont || 'Inter'}', sans-serif !important;
 }

 /* Ticket & Incident management assignment */
 .tickets-container, [class*="ticket-"], [class*="Ticket-"] {
 font-family: '${settings.ticketFont || 'Inter'}', sans-serif !important;
 }

 /* Reports assignment */
 .reports-container, [class*="report-"], [class*="Report-"] {
 font-family: '${settings.reportFont || 'Inter'}', sans-serif !important;
 }

 /* Self-Service Portal assignment */
 .portal-container, [class*="portal-"], [class*="Portal-"] {
 font-family: '${settings.portalFont || 'Inter'}', sans-serif !important;
 }

 /* Knowledge Base assignment */
 .kb-container, [class*="kb-"], [class*="Kb-"], [class*="knowledge-"] {
 font-family: '${settings.kbFont || 'Inter'}', sans-serif !important;
 }

 /* Profile assignment */
 .profile-container, [class*="profile-"], [class*="Profile-"] {
 font-family: '${settings.profileFont || 'Inter'}', sans-serif !important;
 }
 `;

 }, [settings]);

 return null; // purely side-effect component
}
