export interface FlashSaleCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function parseFlashSaleEndAt(value: string | undefined): number | null {
  if (!value) return null;

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (zone !== "Z" && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59))
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getFlashSaleCountdown(targetAt: number, now = Date.now()): FlashSaleCountdown {
  const remainingSeconds = Math.max(0, Math.ceil((targetAt - now) / 1000));
  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    expired: targetAt <= now,
  };
}

