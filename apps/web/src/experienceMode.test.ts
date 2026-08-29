import { describe, expect, it } from "vitest";
import { DEFAULT_EXPERIENCE_MODE } from "./experienceMode";

describe("experience defaults", () => {
  it("opens the public showcase in narrative mode", () => {
    expect(DEFAULT_EXPERIENCE_MODE).toBe("story");
  });
});
