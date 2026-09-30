# קביעת פגישות עם לקוחות

אתר שנשלח ללקוחות בקישור לקביעת פגישה (חצי שעה או שעה).

## כללי המערכת
- ימים א׳–ה׳, 10:00–17:00. שישי, שבת, חגים וערבי חג (ולוח חגי ישראל, כולל יום העצמאות) חסומים אוטומטית.
- מועד תפוס לא ניתן לקביעה. הנעילה נעשית במסד הנתונים (מפתח ראשי לכל חצי שעה), כך שגם שתי הזמנות בו-זמנית לא ייצרו כפילות.
- הזמנה לפחות 24 שעות מראש ועד 60 יום קדימה (`MIN_LEAD_HOURS`, `MAX_DAYS_AHEAD` ב-`src/lib/rules.ts`).
- הלקוח מזין: שם מלא, פרויקט (רשימה נפתחת), מספר דירה, טלפון ואימייל.
- אחרי הקביעה: דף אישור עם קובץ יומן, ומייל אישור אם הוגדר Resend.

## דף ניהול (`/admin`)
מוגן בסיסמה (`ADMIN_PASSWORD`): רשימת פגישות וביטול, חסימת ימים/שעות, ניהול רשימת הפרויקטים, וייצוא:
- **אקסל (.xlsx)** לרישום ידני.
- **קובץ יומן (.ics)**: פתיחה באאוטלוק מוסיפה את כל הפגישות ליומן בבת אחת.

## העלאה ל-Vercel
1. יצירת בסיס נתונים ב-[Turso](https://turso.tech) (חינם): `turso db create meetings`, אחר כך `turso db show meetings --url` ו-`turso db tokens create meetings`.
2. ב-[Vercel](https://vercel.com/new): Import של הריפו הזה (Framework: Next.js).
3. ב-Settings → Environment Variables מגדירים לפי `.env.example`:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`, ואופציונלי `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_NOTIFY_EMAIL`, `MEETING_LOCATION`, `SITE_TITLE`.
4. Deploy. הטבלאות נוצרות אוטומטית בפנייה הראשונה. הקישור ללקוחות הוא כתובת האתר; כתובת הניהול היא `/admin`.

## פיתוח מקומי
```bash
npm install
cp .env.example .env   # חובה למלא TURSO_DATABASE_URL ו-TURSO_AUTH_TOKEN: אין מסד נתונים מקומי
npm run dev
npm test               # בדיקות לחוקי התזמון והחגים
```
