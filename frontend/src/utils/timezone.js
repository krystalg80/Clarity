// Create src/utils/timezone.js
export const timezoneUtils = {
  // Get user's current timezone
  getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },
  
  // Get current date/time in user's timezone
  getCurrentLocalTime() {
    return new Date();
  },
  
  // Get start of day in user's timezone
  getStartOfDay(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  },
  
  // Get end of day in user's timezone
  getEndOfDay(date = new Date()) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  },
  
  // Format date in user's timezone (YYYY-MM-DD)
  formatLocalDate(date) {
    return date.toLocaleDateString('en-CA');
  },
  
  // Format datetime in user's timezone
  formatLocalDateTime(date) {
    return date.toLocaleString();
  },
  
  // Format time only in user's timezone
  formatLocalTime(date) {
    return date.toLocaleTimeString();
  },
  
  // Get date range for last N days in user's timezone
  getLocalDateRange(days = 7) {
    const endDate = this.getEndOfDay(new Date());
    const startDate = this.getStartOfDay(new Date());
    startDate.setDate(startDate.getDate() - (days - 1));
    return { startDate, endDate };
  },
  
  // Check if date is today in user's timezone
  isToday(date) {
    const today = new Date();
    return this.formatLocalDate(date) === this.formatLocalDate(today);
  },
  
  // Check if two dates are same day in user's timezone
  isSameLocalDay(date1, date2) {
    return this.formatLocalDate(date1) === this.formatLocalDate(date2);
  },
  
  // Convert any date to user's timezone for storage
  toLocalTimezone(date) {
    return new Date(date);
  },
  
  // Get relative time (e.g., "2 hours ago") in user's timezone
  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatLocalDate(date);
  }
};

export default timezoneUtils;