import { expect, test } from "@playwright/test";

test.describe("/go-api proxy", () => {
  test("proxies Go service health endpoint", async ({ request }) => {
    const response = await request.get("/go-api/health");
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.status).toBe("ok");
  });
});
