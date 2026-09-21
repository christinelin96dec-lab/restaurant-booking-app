import { PaymentsService } from './payments.service';

function fakeConfig(values: Record<string, string> = {}) {
  return { get: (key: string, def?: string) => values[key] ?? def } as any;
}

describe('PaymentsService.computeApplicationFeeCents', () => {
  it('takes 10% of the order total by default', () => {
    const service = new PaymentsService(fakeConfig(), {} as any);
    expect(service.computeApplicationFeeCents(100000)).toBe(10000);
  });

  it('rounds to the nearest cent instead of truncating', () => {
    const service = new PaymentsService(fakeConfig(), {} as any);
    // 10% of 12345 = 1234.5 -> should round to 1235, not truncate to 1234.
    expect(service.computeApplicationFeeCents(12345)).toBe(1235);
  });

  it('respects a configured PLATFORM_FEE_PERCENT override', () => {
    const service = new PaymentsService(fakeConfig({ PLATFORM_FEE_PERCENT: '15' }), {} as any);
    expect(service.computeApplicationFeeCents(100000)).toBe(15000);
  });

  it('returns 0 fee for a 0 amount', () => {
    const service = new PaymentsService(fakeConfig(), {} as any);
    expect(service.computeApplicationFeeCents(0)).toBe(0);
  });
});
