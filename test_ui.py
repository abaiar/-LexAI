from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    # Capture console errors
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)

    # Navigate to the app
    page.goto("http://localhost:5173", timeout=15000)
    page.wait_for_load_state("networkidle", timeout=15000)
    time.sleep(2)

    # Take screenshot of initial state
    page.screenshot(path="/tmp/lexai_home.png", full_page=False)
    print("1. Home page screenshot saved")

    # Try chat feature
    try:
        chat_nav = page.locator("text=法律咨询").first
        if chat_nav.is_visible():
            chat_nav.click()
            time.sleep(1)
            page.screenshot(path="/tmp/lexai_chat.png", full_page=False)
            print("2. Chat page screenshot saved")
    except Exception as e:
        print(f"2. Chat nav failed: {e}")

    # Try contract draft
    try:
        draft_nav = page.locator("text=合同起草").first
        if draft_nav.is_visible():
            draft_nav.click()
            time.sleep(1)
            page.screenshot(path="/tmp/lexai_draft.png", full_page=False)
            print("3. Contract draft screenshot saved")
    except Exception as e:
        print(f"3. Draft nav failed: {e}")

    # Try contract review
    try:
        review_nav = page.locator("text=合同审查").first
        if review_nav.is_visible():
            review_nav.click()
            time.sleep(1)
            page.screenshot(path="/tmp/lexai_review.png", full_page=False)
            print("4. Contract review screenshot saved")
    except Exception as e:
        print(f"4. Review nav failed: {e}")

    # Print console errors
    if errors:
        print("\n=== Console Errors ===")
        for e in errors[:20]:
            print(e)
    else:
        print("\nNo console errors found")

    browser.close()
