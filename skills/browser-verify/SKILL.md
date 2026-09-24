---
name: browser-verify
description: Drives a real web browser to check that a change works, reproduce a UI bug, or read a page that needs JavaScript or a sign-in. Use when a task involves a running web app, a localhost URL, a UI change that tests can't prove, or a site that plain HTTP fetching can't read. Do not use for static docs or APIs that a plain fetch or curl can read.
---

# Browser Verification

Use whichever browser automation this session provides. A harness may drive the user's own
browser, where the user is signed in to their real accounts, or a separate automation profile.
Find out which one you have before acting, and treat the user's own browser with more care.

## Before Opening the Browser

- **Try a lighter tool first:** if an HTTP fetch, `curl`, or the test suite can answer the question, use it.
- **Know what "working" looks like:** write down the expected result (text, element, URL, absence of errors) before navigating.
- **Start the app yourself** if the target is local, and wait until it responds before navigating.

## Working in the Browser

1. **Open a new tab.** Leave the tabs the user already has open alone; don't navigate, reload, or close them.
2. **Read the page as text first.** Use the accessibility tree, page text, or a DOM snapshot to find
   elements and check content. Take a screenshot only to check layout or visual output, or when text fails.
3. **Act on elements by reference** from the latest snapshot rather than by pixel coordinates. Take a
   new snapshot after anything that changes the page.
4. **Check the console and network** for errors after the page loads and after each key interaction.
   An empty page with a console error is a failure, even if the test you targeted passed.
5. **Wait on conditions, not time:** wait for an element, text, or URL to appear rather than sleeping.
6. **Batch steps that need no judgement between them.** If the automation can run code, do the
   navigate, act, wait, and read steps as one script and return only the evidence you'll report. Each separate
   call puts a whole page snapshot in your context.

## Stop and Ask

Get the user's confirmation before:

- Submitting forms that send, publish, or delete data outside localhost.
- Anything involving payments, purchases, account settings, passwords, or security prompts.
- Entering credentials. Never type a password; ask the user to sign in themselves.
- Accepting permission prompts (camera, location, notifications, downloads) or cookie/terms dialogs
  on sites you don't control.

If a CAPTCHA, a sign-in wall, or a browser that can't be reached blocks you, stop and report it
instead of looking for a workaround.

## Reporting

- State what you checked, against which URL, and the result compared with what you expected.
- Quote the relevant page text or console errors. Attach a screenshot only if it shows something text can't.
- Say plainly if you couldn't verify something, and why.
- Close the tabs you opened when you're done.
