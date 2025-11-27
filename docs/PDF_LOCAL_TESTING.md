# 📄 PDF Generation - Local Testing Mode

## What Changed

The PDF generation now saves files **locally on your Mac** instead of uploading to Supabase Storage. This lets you test the PDF feature immediately without any database setup!

## ✅ How It Works

1. **Create or Update a Quote** in QuotePro
2. **Check the Browser Console** - you'll see:
   ```
   ✅ PDF generated successfully!
   📄 File saved to: /Users/dipen/code/quotepro/generated-pdfs/quote-QT-12345.pdf
   📝 Filename: quote-QT-12345.pdf
   💡 Open this file on your Mac to view the PDF
   ```
3. **Open Finder** → Navigate to `/Users/dipen/code/quotepro/generated-pdfs/`
4. **Double-click the PDF** → Opens in Preview with your beautiful contractor quote! 🎉

## 📁 Where PDFs Are Saved

All PDFs are saved to:
```
/Users/dipen/code/quotepro/generated-pdfs/
```

Filename format:
- `quote-QT-12345.pdf` (uses quote number if available)
- `quote-abc123.pdf` (uses quote ID as fallback)

## 🚀 Quick Test

1. **Make sure your dev server is running**:
   ```bash
   npm run dev
   ```

2. **Open QuotePro** → Create a new quote with:
   - Customer details
   - A few line items
   - Maybe upload a photo
   - Add Good/Better/Best options if you want

3. **Click "Save as Draft"**

4. **Check Console** for the file path

5. **Open the PDF** in Finder

You should see a professional PDF with:
- ✅ Company branding
- ✅ Customer info
- ✅ Itemized pricing
- ✅ Tax breakdown
- ✅ Job photos (if added)
- ✅ "Accept & Sign" button
- ✅ Good/Better/Best tiers (if multiple options)
- ✅ Upsells highlighted in orange

## 🎨 Customization

Edit `/src/components/QuotePDF.tsx` to customize:
- **Brand color**: Change `#FF6200` to your color
- **Fonts**: Currently using Inter (Google Fonts)
- **Layout**: Adjust margins, spacing, etc.
- **Footer**: Update company details

## 🔄 Switching to Production Mode

When you're ready to deploy to production with Supabase Storage:

1. **Open** `/src/app/api/quotes/[id]/generate-pdf/route.ts`

2. **Comment out** the "DEVELOPMENT MODE" section (lines ~123-148)

3. **Uncomment** the "PRODUCTION MODE" section (lines ~151-186)

4. **Run the migration**:
   - Open Supabase Dashboard → SQL Editor
   - Run `supabase/migrations/009_add_pdf_url_to_quotes.sql`

5. **Create storage bucket**:
   - Supabase Dashboard → Storage → New Bucket
   - Name: `quotes`, Public: Yes

That's it! PDFs will then upload to Supabase and store URLs in the database.

## 🧹 Cleanup

PDFs are automatically ignored by git (added to `.gitignore`), so they won't clutter your repo.

To delete all generated PDFs:
```bash
rm -rf generated-pdfs/
```

## ❓ FAQ

**Q: Do I need SignNow for this?**
A: No! SignNow is a separate feature for electronic signatures. PDF generation works independently.

**Q: Can I share these PDFs?**
A: Currently they're just local files. For sharing, you'd need to:
- Switch to production mode (Supabase Storage), OR
- Manually send the PDF files via email/Slack/etc

**Q: Why local instead of Supabase?**
A: Faster testing! No database setup needed. Once you're happy with the PDFs, switch to production mode for cloud storage.

**Q: Can I still use the pdf_url in quotes table?**
A: In local mode, we skip the database update. Switch to production mode when you want to store URLs.

## 🐛 Troubleshooting

**"Failed to save PDF locally"**
- Check terminal for detailed error
- Make sure you have write permissions in the project folder

**"PDF generated but I can't find the file"**
- Check the exact path in the console output
- Copy/paste the path into Finder → Go → Go to Folder (Cmd+Shift+G)

**"PDF is blank or has errors"**
- Check browser console for rendering errors
- Verify quote has customer details and line items
- Try a simpler quote first (no photos)

## 💡 Pro Tips

- **PDFs overwrite**: Same quote number = same filename (previous version replaced)
- **View in VS Code**: Install "vscode-pdf" extension to preview PDFs right in the editor
- **Test different layouts**: Try quotes with 1 option vs Good/Better/Best vs lots of upsells
- **Check file size**: Photos can make PDFs large (compress images if needed)

---

**Ready to test?** Save a quote and check your `generated-pdfs/` folder! 🚀
