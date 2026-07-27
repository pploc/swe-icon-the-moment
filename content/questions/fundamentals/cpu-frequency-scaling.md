---
title: How does CPU frequency scaling work and how does it affect latency?
topics: [os-linux]
roles: [backend, infra]
tags: [cpu-frequency, p-states, c-states, turbo-boost, power, latency]
time: 15
updated: 2026-07-27
---

## Question

Explain CPU frequency scaling: P-states (performance), C-states (idle), Intel Turbo Boost, and how they create latency tail problems for low-latency services. How do you configure for performance vs power efficiency?

## Answer

**P-states (Performance states):** Different CPU clock frequencies and voltages. P0 = maximum performance; P-max = lowest frequency. The CPU dynamically adjusts based on workload.

**C-states (CPU idle states):** Power-saving states when the CPU is idle.

| State | Wake latency | Power save |
|---|---|---|
| C0 | 0 (active) | None |
| C1/C1E | ~1µs | Light (halt instruction) |
| C3 | ~10µs | Medium (cache flushed) |
| C6 | ~100µs | Deep (core powered down) |
| C7/C8/C10 | ~100-300µs | Very deep |

**The latency problem:** A CPU in C6/C7 state needs ~100-300µs to wake up before it can process a timer or incoming request. For a service targeting P99 < 1ms, a 300µs wake-up is catastrophic. This explains latency spikes in otherwise idle services.

**Intel Turbo Boost:** When thermal headroom allows, CPU boosts above base frequency (e.g., 3.2 GHz base → 4.5 GHz boost for 1 core). Great for burst workloads; can cause frequency instability for sustained loads.

**Governors:**
```bash
# View available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# conservative ondemand userspace powersave performance

# Set performance governor (max freq, no scaling)
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Or use cpupower:
cpupower frequency-set -g performance
```

**Configuration for low-latency services:**
```bash
# 1. Set performance governor
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 2. Disable deep C-states (limit to C1)
cpupower idle-set -D 1    # disable all C-states deeper than C1

# 3. Kernel boot parameter: disable idle states entirely
# GRUB: idle=poll     (burns 100% CPU even when idle — extreme)
# GRUB: processor.max_cstate=1

# 4. Check current frequency
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
```

**Tradeoff:** Performance governor + disabled C-states → consistent latency, 20-30W higher power consumption per CPU. Accept the tradeoff for latency-sensitive services (trading, gaming servers, HFT).

## Follow-ups

- What is Intel's `intel_pstate` driver and how does it differ from the `acpi-cpufreq` driver?
- How does `isolcpus` and `nohz_full` kernel parameter further reduce timer interrupts on isolated CPUs?
- What is CPU frequency jitter and how does it affect benchmarking results?
