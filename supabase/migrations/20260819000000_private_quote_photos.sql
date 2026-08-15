-- Quote photos stop being world-readable.
--
-- The bucket was public and every read path handed out `getPublicUrl()`. The
-- object paths are unguessable — `{company}/{work_item}/{uuid}.{ext}` — so this
-- was never a scanning risk. The problem is what a URL is once it exists:
-- permanent, unauthenticated, and outliving the quote, the customer and even a
-- closed account.
--
-- These are photographs of people's homes. A failed water heater in a basement,
-- the inside of a property, a roof an insurer will see. Forwarded once — to a
-- spouse, a subcontractor's group chat, an email thread — it is public forever
-- and there is no way to withdraw it.
--
-- Private bucket plus short-lived signed URLs, minted server-side on each read.
-- The links still work for the customer viewing their quote; they just stop
-- working an hour later.

update storage.buckets set public = false where id = 'quote-photos';

-- Reads now go through the service role, which is how both call paths already
-- fetch them. No policy is added for `authenticated`: nothing reaches this
-- bucket with a user token, and a policy would be a second door to maintain.
