export const timezoneUtils = {
  getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  getCurrentLocalTime() {
    return new Date();
  },

  getStartOfDay(date: Date = new Date()): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  },

  getEndOfDay(date: Date = new Date()): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  },

  formatLocalDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
  },

  formatLocalDateTime(date: Date): string {
    return date.toLocaleString();
  },

  formatLocalTime(date: Date): string {
    return date.toLocaleTimeString();
  },

  getLocalDateRange(days: number = 7): { startDate: Date; endDate: Date } {
    const endDate = this.getEndOfDay(new Date());
    const startDate = this.getStartOfDay(new Date());
    startDate.setDate(startDate.getDate() - (days - 1));
    return { startDate, endDate };
  },

  isToday(date: Date): boolean {
    const today = new Date();
    return this.formatLocalDate(date) === this.formatLocalDate(today);
  },

  isSameLocalDay(date1: Date, date2: Date): boolean {
    return this.formatLocalDate(date1) === this.formatLocalDate(date2);
  },

  toLocalTimezone(date: Date): Date {
    return new Date(date);
  },

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatLocalDate(date);
  },

  getCurrentWeekRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(now.getDate() - dayOfWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  },
};

export default timezoneUtils;
