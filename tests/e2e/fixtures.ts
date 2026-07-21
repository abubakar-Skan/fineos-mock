import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
} from "@playwright/test";

interface Fixtures {
  readonly browserGuard: void;
}

const collectBrowserErrors = (page: Page, errors: string[]): void => {
  page.on("console", (message) => collectConsoleFailure(message, errors));
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
};

const collectConsoleFailure = (message: ConsoleMessage, errors: string[]): void => {
  if (message.type() === "error" || message.type() === "warning") {
    errors.push(`console.${message.type()}: ${message.text()}`);
  }
};

export const test = base.extend<Fixtures>({
  browserGuard: [async ({ page, request }, use) => {
    const reset = await request.post("/api/test/reset");
    expect(reset.ok()).toBe(true);
    const errors: string[] = [];
    collectBrowserErrors(page, errors);
    await use();
    expect(errors, "browser runtime errors").toEqual([]);
  }, { auto: true }],
});

export { expect } from "@playwright/test";
