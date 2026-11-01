import config from '../config';
import { getSetting } from '../services/setting.service';

export interface QuietHoursStatus {
    isSuspended: boolean;
    currentHour: number;
    currentMinute: number;
    timezone: string;
    windowLabel: string;
    message?: string;
}

/**
 * Checks if the current time falls inside the automation suspension window.
 * Default: 7:00 PM (19:00) to 10:00 AM in Indian Standard Time (Asia/Kolkata).
 * Active scraping window: 10:00 AM to 7:00 PM.
 */
export async function checkAutomationQuietHours(): Promise<QuietHoursStatus> {
    const tz = (await getSetting('automation_timezone')) as string || config.automation?.timezone || 'Asia/Kolkata';
    const enabledSetting = await getSetting('automation_quiet_hours_enabled');
    const isEnabled = enabledSetting != null 
        ? (enabledSetting === true || enabledSetting === 'true') 
        : (config.automation?.quietHoursEnabled ?? true);

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour');
    const minutePart = parts.find((p) => p.type === 'minute');
    const currentHour = parseInt(hourPart?.value || '0', 10);
    const currentMinute = parseInt(minutePart?.value || '0', 10);

    const startHour = Number(await getSetting('automation_quiet_hours_start')) || config.automation?.quietHoursStart || 19; // 7 PM
    const endHour = Number(await getSetting('automation_quiet_hours_end')) || config.automation?.quietHoursEnd || 10;     // 10 AM

    const formatHourLabel = (h: number) => {
        if (h === 0 || h === 24) return '12:00 AM';
        if (h === 12) return '12:00 PM';
        return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
    };

    const windowLabel = `${formatHourLabel(startHour)} to ${formatHourLabel(endHour)} (${tz})`;

    if (!isEnabled) {
        return {
            isSuspended: false,
            currentHour,
            currentMinute,
            timezone: tz,
            windowLabel,
        };
    }

    // Suspended from 7:00 PM (19:00) through 9:59 AM (currentHour < 10)
    const isSuspended = currentHour >= startHour || currentHour < endHour;

    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    return {
        isSuspended,
        currentHour,
        currentMinute,
        timezone: tz,
        windowLabel,
        message: isSuspended
            ? `🌙 [AUTOMATION SUSPENDED] Quiet hours active (${windowLabel}). Current time: ${timeStr} ${tz}. Automation resumes automatically at ${formatHourLabel(endHour)}.`
            : `☀️ [AUTOMATION ACTIVE] In operational window (${formatHourLabel(endHour)} to ${formatHourLabel(startHour)} ${tz}). Current time: ${timeStr} ${tz}.`,
    };
}
