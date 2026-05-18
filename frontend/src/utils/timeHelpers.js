/**
 * Formats a time string (e.g., "08:00", "14:30:00") into AM/PM format (e.g., "08:00 A.M.", "02:30 P.M.")
 * @param {string} timeStr - The time string to format
 * @returns {string} The formatted time string
 */
export const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '-';
  
  // Handle cases like "Lunes, Martes 08:00 - 10:00"
  if (timeStr.includes('-')) {
    return timeStr.split('-').map(part => formatTimeAMPM(part.trim())).join(' - ');
  }

  // Handle cases like "Lunes 08:00"
  const dayMatch = timeStr.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ\s,]+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (dayMatch) {
    return `${dayMatch[1]} ${formatTimeAMPM(dayMatch[2])}`;
  }

  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return timeStr;

  let [_, hours, minutes] = match;
  hours = parseInt(hours, 10);
  const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = hours < 10 ? `0${hours}` : hours;
  
  return `${strHours}:${minutes} ${ampm}`;
};
