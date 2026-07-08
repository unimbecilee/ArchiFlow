import { describe, expect, it } from "vitest";
import { getRealtimeMode } from "./realtime-config";

describe("getRealtimeMode", () => {
  it("defaults to ws", () => {
    expect(getRealtimeMode()).toBe("ws");
  });
});
