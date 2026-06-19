const BUSINESS_START = 8; // 8 AM
const BUSINESS_END = 18; // 6 PM
const HOLIDAYS = [
 '2026-01-01', // New Year
 '2026-12-25', // Christmas
];

export function isHoliday(date: Date): boolean {
 const dateStr = date.toISOString().split('T')[0];
 return HOLIDAYS.includes(dateStr);
}

export function isWeekend(date: Date): boolean {
 const day = date.getDay();
 return day === 0 || day === 6; // Sunday or Saturday
}

export function isBusinessHour(date: Date): boolean {
 const hour = date.getHours();
 return hour >= BUSINESS_START && hour < BUSINESS_END;
}

export function calculateSLADeadline(startTime: Date, hours: number, policy: {
 businessHours?: boolean;
 excludeWeekends?: boolean;
 excludeHolidays?: boolean;
}): Date {
 let remainingMs = hours * 60 * 60 * 1000;
 let currentDate = new Date(startTime.getTime());

 if (!policy.businessHours && !policy.excludeWeekends && !policy.excludeHolidays) {
 return new Date(startTime.getTime() + remainingMs);
 }

 // Iterate in 1-hour increments to find the end date
 // This is a simplified version suitable for frontend/backend sharing
 while (remainingMs > 0) {
 const isWknd = isWeekend(currentDate);
 const isHol = isHoliday(currentDate);
 const isBiz = isBusinessHour(currentDate);

 let skip = false;
 if (policy.excludeWeekends && isWknd) skip = true;
 if (policy.excludeHolidays && isHol) skip = true;
 if (policy.businessHours && !isBiz) skip = true;

 if (skip) {
 currentDate.setHours(currentDate.getHours() + 1);
 currentDate.setMinutes(0);
 currentDate.setSeconds(0);
 continue;
 }

 // Determine how much of the current hour can be consumed
 // To keep it simple and accurate, we consume 1 hour at a time
 const timeToConsume = Math.min(remainingMs, 3600000); 
 remainingMs -= timeToConsume;
 currentDate = new Date(currentDate.getTime() + timeToConsume);
 }

 return currentDate;
}
