"""Reduced ASM1-inspired soluble-state model; not a calibrated plant model.

Two mixed zones, fixed active biomass, Monod carbon oxidation/denitrification
and nitrification, oxygen transfer, internal recycle. Units: mg/L, m3, hours.
The fixed biomass approximation is intended for 24-hour comparisons only.
"""
import math


def bounded(value, low, high):
    return max(low, min(high, float(value)))


def simulate(controls, scenario=None, process="a2o"):
    scenario = scenario or {}
    air = bounded(controls.get("air", 3200), 0, 5000)
    volume = bounded(controls.get("volume", 7000), 4000, 20000)
    flow = bounded(scenario.get("peakFlow", 1050), 100, 3000)
    nh = bounded(scenario.get("influentNh", 32), 1, 100)
    temperature = bounded(scenario.get("temperature", 24), 5, 35)
    cod = bounded(scenario.get("influentCod", 220), 30, 600)
    # The legacy L/day sideflow is small. Do not relabel it as internal recycle.
    sideflow = bounded(controls.get("pump", 72000), 0, 150000) / 24000
    recycle = bounded(controls.get("recycle", 2.0), 0, 4)
    va, vo = volume * (0.28 if process == "a2o" else 0.38), volume * (0.72 if process == "a2o" else 0.62)
    mu_h, mu_a = 6.0 / 24 * 1.072 ** (temperature - 20), 0.8 / 24 * 1.08 ** (temperature - 20)
    xh, xa, yh, ya = 600.0, 95.0, 0.67, 0.24
    kla = (air / 3200) * 12.0 * (7000 / volume) ** 0.45
    saturation = bounded(9.1 - 0.17 * (temperature - 20), 6.5, 11)
    step = 0.002

    def derivative(y, hour, warm=False):
        a, o = y[:4], y[4:]
        q = flow * (0.76 if warm else 0.76 + 0.12 * math.sin((hour - 5) * math.pi / 12) + 0.1 * math.sin((hour - 13) * math.pi / 6))
        qr = recycle * q
        inlet = [cod, nh * (1 if warm else 1 + 0.09 * math.sin((hour - 7) * math.pi / 12)), 0.5, 0.1]
        da = [((q + sideflow) * inlet[i] + qr * o[i] - (q + sideflow + qr) * a[i]) / va for i in range(4)]
        do = [(q + sideflow + qr) * (a[i] - o[i]) / vo for i in range(4)]
        for zone, delta, aeration in ((a, da, 0.0), (o, do, kla)):
            ss, snh, sno, oxygen = [max(0.0, value) for value in zone]
            growth_h = mu_h * ss / (20 + ss) * oxygen / (0.2 + oxygen) * xh
            growth_d = mu_h * ss / (20 + ss) * 0.2 / (0.2 + oxygen) * sno / (0.5 + sno) * 0.8 * xh
            growth_a = mu_a * snh / (1 + snh) * oxygen / (0.4 + oxygen) * xa
            delta[0] -= (growth_h + growth_d) / yh
            delta[1] -= growth_a / ya + 0.086 * (growth_h + growth_d)
            delta[2] += growth_a / ya - (1 - yh) / (2.86 * yh) * growth_d
            delta[3] += aeration * (saturation - oxygen) - (1 - yh) / yh * growth_h - (4.57 - ya) / ya * growth_a
        return da + do, q

    def advance(y, hour, warm=False):
        k1, _ = derivative(y, hour, warm)
        k2, _ = derivative([v + step * k / 2 for v, k in zip(y, k1)], hour + step / 2, warm)
        k3, _ = derivative([v + step * k / 2 for v, k in zip(y, k2)], hour + step / 2, warm)
        k4, _ = derivative([v + step * k for v, k in zip(y, k3)], hour + step, warm)
        return [max(0.0, v + step * (a + 2*b + 2*c + d) / 6) for v, a, b, c, d in zip(y, k1, k2, k3, k4)]

    y = [20, 25, 8, 0.1, 3, 2, 12, 2]
    for i in range(round(24 / step)):
        y = advance(y, i * step, True)
    result = {key: [] for key in ("t", "snhx", "snox", "cod", "do", "flow")}
    for i in range(round(24 / step) + 1):
        hour = i * step
        if i % round(1 / step) == 0:
            _, q = derivative(y, hour)
            for key, value in zip(result, (hour / 24, y[5], y[6], y[4], y[7], q)):
                result[key].append(round(value, 6))
        if i < round(24 / step):
            y = advance(y, hour)
    result.update(samples=len(result["t"]), engine="asm", process=process,
                  model="Reduced ASM1-inspired / fixed biomass / RK4", calibrated=False,
                  energy_kwh_m3=round(0.135 + air * 0.000045 + controls.get("pump", 72000) * 0.00000047, 6))
    return result
