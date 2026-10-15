/** GPU particle tiers. Read only after mount: depends on viewport and device. */
export function particleBudget() {
  const mobile = window.innerWidth <= 600;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  return {
    mobile,
    count: mobile ? 6500 : lowPower ? 14000 : 22000,
    haloCount: mobile ? 1100 : lowPower ? 2000 : 3200,
  };
}
