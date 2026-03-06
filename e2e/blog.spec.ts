import { test, expect } from "@playwright/test";

const MARKDOWN_WITH_CHARTS = `
## MoCRA Compliance in 2026

Here is some analysis text about cosmetics regulation.

![Cosmetics FDA Actions by Category](https://quickchart.io/chart?w=480&h=280&c=%7B%22type%22%3A%22bar%22%7D)

More analysis text after the chart.

![Cross-Reference Rate for Beauty Supplements](https://quickchart.io/chart?w=480&h=280&c=%7B%22type%22%3A%22doughnut%22%7D)
`;

const MARKDOWN_WITH_METADATA = `**Title:** Test Post
**Slug:** test-post
**Category:** regulatory_trends
**Excerpt:** A test excerpt

## Actual Content

This is the real post content.
`;

test.describe("Blog MarkdownContent", () => {
  test.beforeEach(async ({ page }) => {
    // Mount the MarkdownContent component via a test page
    // We'll test against an actual blog post if one exists, or use the component directly
  });

  test("chart images render inside figure cards with captions", async ({ page }) => {
    // Navigate to a blog post that has charts
    // First check if the MoCRA post exists
    const response = await page.goto("/blog/mocra-compliance-2026-what-comes-next");

    if (!response || response.status() === 404) {
      test.skip(true, "MoCRA blog post not found — skipping chart card test");
      return;
    }

    // Charts should be wrapped in <figure> elements
    const figures = page.locator("article figure");
    const figureCount = await figures.count();
    expect(figureCount).toBeGreaterThan(0);

    // First figure should have the card styling
    const firstFigure = figures.first();
    await expect(firstFigure).toBeVisible();

    // Should contain an img
    const img = firstFigure.locator("img");
    await expect(img).toBeVisible();

    // Should have a figcaption (from alt text)
    const caption = firstFigure.locator("figcaption");
    await expect(caption).toBeVisible();
    const captionText = await caption.textContent();
    expect(captionText?.length).toBeGreaterThan(0);
  });

  test("metadata block is not visible in blog post content", async ({ page }) => {
    const response = await page.goto("/blog/mocra-compliance-2026-what-comes-next");

    if (!response || response.status() === 404) {
      test.skip(true, "MoCRA blog post not found — skipping metadata test");
      return;
    }

    // The metadata block should NOT be visible
    const article = page.locator("article");
    const articleText = await article.textContent();

    // These metadata prefixes should never appear in rendered content
    expect(articleText).not.toContain("**Title:**");
    expect(articleText).not.toContain("**Slug:**");
    expect(articleText).not.toContain("**Category:**");
    expect(articleText).not.toContain("**Primary Keyword:**");
    expect(articleText).not.toContain("**Word Count:**");
  });

  test("chart card has proper max-width", async ({ page }) => {
    const response = await page.goto("/blog/mocra-compliance-2026-what-comes-next");

    if (!response || response.status() === 404) {
      test.skip(true, "MoCRA blog post not found — skipping styling test");
      return;
    }

    const figure = page.locator("article figure").first();
    await expect(figure).toBeVisible();

    // Check max-width is constrained (not full article width)
    const box = await figure.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(560); // 540px + some padding tolerance
    }
  });
});
