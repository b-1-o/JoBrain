import { describe, expect, it } from "vitest";
import {
  APPEARANCE_DEFAULTS,
  APPEARANCE_PRESETS,
  normalizeAppearance,
  resolveTheme,
} from "./appearance";

describe("normalizeAppearance", () => {
  it("applies defaults for empty input", () => {
    expect(normalizeAppearance(null)).toEqual(APPEARANCE_DEFAULTS);
  });

  it("clamps numeric ranges and validates accent", () => {
    const result = normalizeAppearance({
      accentColor: "not-a-color",
      glassIntensity: 999,
      glassBlur: -4,
      panelOpacity: 10,
      borderIntensity: 200,
      reducedMotion: true,
      theme: "light",
    });
    expect(result.accentColor).toBe(APPEARANCE_DEFAULTS.accentColor);
    expect(result.glassIntensity).toBe(80);
    expect(result.glassBlur).toBe(0);
    expect(result.panelOpacity).toBe(40);
    expect(result.borderIntensity).toBe(100);
    expect(result.reducedMotion).toBe(true);
    expect(result.theme).toBe("light");
  });

  it("presets stay within safe bounds", () => {
    for (const preset of Object.values(APPEARANCE_PRESETS)) {
      const normalized = normalizeAppearance(preset);
      expect(normalized.glassIntensity).toBeGreaterThanOrEqual(0);
      expect(normalized.glassIntensity).toBeLessThanOrEqual(80);
      expect(normalized.glassBlur).toBeLessThanOrEqual(24);
      expect(normalized.panelOpacity).toBeGreaterThanOrEqual(40);
    }
  });
});

describe("resolveTheme", () => {
  it("resolves explicit themes", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });
});
