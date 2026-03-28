const TZ = 'Asia/Tokyo';

const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date を JST で "YYYY-MM-DD" 形式に変換する */
function formatDateJst(date: Date): string {
  const parts = jstDateFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 現在の JST 日付を "YYYY-MM-DD" 形式で返す */
export function todayJst(): string {
  return formatDateJst(new Date());
}

/** JST 基準の today から period 分だけ遡った "YYYY-MM-DD" 文字列を返す */
export function calcFromDateJst(period: '6m' | '1y' | '2y' | '10y'): string {
  const date = new Date();

  switch (period) {
    case '6m':
      date.setMonth(date.getMonth() - 6);
      break;
    case '1y':
      date.setFullYear(date.getFullYear() - 1);
      break;
    case '2y':
      date.setFullYear(date.getFullYear() - 2);
      break;
    case '10y':
      date.setFullYear(date.getFullYear() - 10);
      break;
  }

  return formatDateJst(date);
}
