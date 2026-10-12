import { describe, expect, it } from "vitest";
import { centsToInput, equalShares, formatBalance, formatMoney, parseDollars, shareSum } from "@/lib/money";

describe("parseDollars", () => {
  it("reads whole dollars and cents", () => {
    expect(parseDollars("12")).toBe(1200);
    expect(parseDollars("12.5")).toBe(1250);
    expect(parseDollars("12.50")).toBe(1250);
    expect(parseDollars("$1,234.56")).toBe(123456);
    expect(parseDollars(" 15.25 ")).toBe(1525);
    expect(parseDollars("0")).toBe(0);
    expect(parseDollars("0.00")).toBe(0);
  });

  it("rejects amounts that are not cents", () => {
    expect(parseDollars("")).toBeNull();
    expect(parseDollars("12.501")).toBeNull();
    expect(parseDollars("-5")).toBeNull();
    expect(parseDollars("10.2.3")).toBeNull();
    expect(parseDollars("abc")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats positive and negative cents", () => {
    expect(formatMoney(32440)).toBe("$324.40");
    expect(formatMoney(-6920)).toBe("−$69.20");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatBalance(1500)).toBe("+$15.00");
    expect(formatBalance(-1500)).toBe("−$15.00");
    expect(centsToInput(1250)).toBe("12.50");
  });
});

describe("equalShares", () => {
  it("splits an even total", () => {
    expect(equalShares(1000, ["a", "b"])).toEqual([
      { personId: "a", amountCents: 500 },
      { personId: "b", amountCents: 500 },
    ]);
  });

  it("gives leftover cents to the first people", () => {
    const shares = equalShares(100, ["a", "b", "c"]);
    expect(shares).toEqual([
      { personId: "a", amountCents: 34 },
      { personId: "b", amountCents: 33 },
      { personId: "c", amountCents: 33 },
    ]);
    expect(shareSum(shares)).toBe(100);
  });

  it("can leave a later person at zero when the total is tiny", () => {
    expect(equalShares(2, ["a", "b", "c"])).toEqual([
      { personId: "a", amountCents: 1 },
      { personId: "b", amountCents: 1 },
      { personId: "c", amountCents: 0 },
    ]);
  });

  it("rejects an empty split", () => {
    expect(() => equalShares(100, [])).toThrow(/at least one person/i);
  });
});
