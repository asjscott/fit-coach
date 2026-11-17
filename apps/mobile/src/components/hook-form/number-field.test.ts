import { createElement, Fragment } from "react";
// @ts-expect-error react-dom ships no types of its own, and the app has no @types/react-dom
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, createFormControl } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { numberFieldValue } from "./number-field";

// The value a Controller field with this default shows once the form's value is set to `value`
function controllerValueAfterSetting(defaultValue: number, value: unknown): string {
  const { formControl, control } = createFormControl<{ weight: unknown }>({ defaultValues: { weight: defaultValue } });
  // A form reads its values only once mounted, which useForm marks in an effect that server rendering never runs; the
  // form control's state stands in for it. Should react-hook-form drop that flag, the test fails rather than passes
  control._state.mount = true;
  formControl.setValue("weight", value);
  const field = createElement(Controller<{ weight: unknown }>, {
    control,
    name: "weight",
    render: ({ field }) => createElement(Fragment, null, String(field.value)),
  });
  return (renderToStaticMarkup as (element: typeof field) => string)(field);
}

// #154: a number field's typed text becomes the form's value
describe("a number field's value", () => {
  it("stores a typed number as a number", () => {
    expect(numberFieldValue("180")).toBe(180);
    expect(numberFieldValue("176.4")).toBe(176.4);
  });

  it("keeps a number still being typed as text", () => {
    expect(numberFieldValue("176.")).toBe("176.");
    expect(numberFieldValue("-")).toBe("-");
  });

  it("keeps an emptied field empty rather than unset", () => {
    expect(numberFieldValue("")).toBeNull();
  });

  // react-hook-form shows a field's default value again when the form's value is undefined: emptying a body weight
  // of 176.4 put 176.4 straight back
  it("keeps a field with a default value empty once emptied, rather than showing the default again", () => {
    expect(controllerValueAfterSetting(176.4, numberFieldValue(""))).toBe("null");
  });
});
