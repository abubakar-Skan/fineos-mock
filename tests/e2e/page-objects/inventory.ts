import {
  expect,
  type AriaRole,
  type Locator,
  type Page,
} from "@playwright/test";

export interface ControlSpec {
  readonly role: AriaRole;
  readonly name: string;
  readonly count?: number;
}

type Scope = Page | Locator;

const INTERACTIVE = [
  "button:enabled:visible",
  "a[href]:visible",
  "input:not([disabled]):not([readonly]):visible",
  'input[readonly][aria-label="Global search"]:visible',
  "select:not([disabled]):visible",
  "textarea:not([disabled]):visible",
].join(",");

export const control = (
  role: AriaRole,
  name: string,
  count?: number,
): ControlSpec => ({ role, name, count });

export const assertInventory = async (
  scope: Scope,
  expected: readonly ControlSpec[],
): Promise<void> => {
  await expect(scope.locator(INTERACTIVE)).toHaveCount(expectedCount(expected));
  await Promise.all(expected.map((item) => assertControl(scope, item)));
};

const expectedCount = (expected: readonly ControlSpec[]): number =>
  expected.reduce((count, item) => count + (item.count ?? 1), 0);

const assertControl = async (
  scope: Scope,
  item: ControlSpec,
): Promise<void> => {
  await expect(scope.getByRole(item.role, { name: item.name, exact: true }))
    .toHaveCount(item.count ?? 1);
};

export const assertOptions = async (
  select: Locator,
  expected: readonly string[],
): Promise<void> => {
  await expect(select.locator("option")).toHaveText(expected);
};

export const changeText = async (field: Locator, value: string): Promise<void> => {
  await field.fill(value);
  await expect(field).toHaveValue(value);
};

export const changeSelect = async (
  field: Locator,
  value: string,
): Promise<void> => {
  await field.selectOption({ label: value });
  await expect(field.locator("option:checked")).toHaveText(value);
};

export const toggle = async (field: Locator): Promise<void> => {
  const before = await field.isChecked();
  await field.click();
  await expect(field).toBeChecked({ checked: !before });
};
