# Troubleshooting Guide

## Page Not Loading - Common Issues & Solutions

### Issue 1: Blank White Page
**Cause:** Dev server not running or app not started

**Solution:**
```bash
npm run dev
```
The app will start on `http://localhost:3000`

---

### Issue 2: "Cannot GET /" or Page Blank with Loading Spinner
**Cause:** AuthContext is loading and Supabase connection is pending

**Solution:**
1. Check `.env` file has correct Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Verify Supabase project is accessible by checking the URL in browser

3. If still stuck on loading spinner:
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab - look for failed requests to supabase

---

### Issue 3: "Module not found" Errors
**Cause:** Missing dependencies

**Solution:**
```bash
npm install
npm run build
npm run dev
```

---

### Issue 4: CORS Errors in Console
**Cause:** Supabase URL misconfigured

**Solution:**
1. Get your Supabase project URL from Supabase dashboard
2. Update `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```
3. Restart dev server: `npm run dev`

---

### Issue 5: Login Page Shows but Can't Sign In
**Cause:** Database schema not created

**Solution:**
1. Go to Supabase SQL Editor
2. Run the migration SQL from the project (create_worker_tracking_system)
3. This creates all required tables with RLS policies

---

### Issue 6: Signed In but Dashboard is Blank
**Cause:** No workers created yet

**Solution:**
- You need to be signed in as Admin to create workers
- Go to `/dashboard/workers`
- Click "Add Worker" button
- Then go to `/dashboard/income` to track income

---

### Issue 7: 404 Pages
**Cause:** Route doesn't exist

**Available routes:**
```
/ → Home (redirects to login or dashboard)
/login → Login page
/signup → Registration
/dashboard → Analytics dashboard
/dashboard/workers → Manage workers (admin only)
/dashboard/income → Track income
/dashboard/expenses → Track expenses
/dashboard/audit-logs → View audit logs (admin only)
```

---

## Quick Start Checklist

- [ ] Environment variables set in `.env`
- [ ] Supabase project URL verified (test by visiting the URL)
- [ ] Database migrations run (SQL schema created)
- [ ] Dev server started (`npm run dev`)
- [ ] Can access `http://localhost:3000`
- [ ] Created admin account via signup
- [ ] Created at least one worker
- [ ] Able to log in to dashboard

---

## Debug Mode

Check browser console for errors:
1. Open DevTools (F12 or Ctrl+Shift+I)
2. Go to Console tab
3. Look for red error messages
4. Common ones to check:
   - Supabase connection errors
   - Authentication errors
   - CORS issues

---

## Still Not Working?

1. **Restart everything:**
```bash
npm run build
npm run dev
```

2. **Clear browser cache:**
- Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
- Clear all cookies and site data
- Hard refresh: Ctrl+F5

3. **Check network requests:**
- DevTools → Network tab
- Try signing in
- Look for failed requests (red)
- Check their response for error details

4. **Verify Supabase connection:**
```bash
curl https://your-project.supabase.co/rest/v1/workers -H "Authorization: Bearer your-anon-key"
```
Should return empty array `[]`, not an error
