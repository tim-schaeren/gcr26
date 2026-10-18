# Synthesises the radar ping (apps/mobile/assets/sounds/radar-ping.wav) and two
# alternatives, so no sound needs licensing:
#   python3 local/synth-radar-ping.py <output folder>
# b-radar-blip.wav is the one the app uses.
import math, struct, wave, sys
RATE = 44100

def write(path, samples):
    peak = max(1e-9, max(abs(x) for x in samples))
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(struct.pack('<%dh' % len(samples), *[int(x / peak * 0.85 * 32767) for x in samples])); w.close()

def reverb(dry, wet=0.35, feedback=0.82):
    # Schroeder: four combs in parallel, then two allpasses — a small metal room
    n = len(dry); out = [0.0] * n
    for ms in (29.7, 37.1, 41.1, 43.7):
        d = int(RATE * ms / 1000); buf = [0.0] * n
        for i in range(n):
            buf[i] = dry[i] + (feedback * buf[i - d] if i >= d else 0.0)
        for i in range(n): out[i] += buf[i] / 4
    for ms, g in ((5.0, 0.7), (1.7, 0.7)):
        d = int(RATE * ms / 1000); y = [0.0] * n
        for i in range(n):
            xd = out[i - d] if i >= d else 0.0; yd = y[i - d] if i >= d else 0.0
            y[i] = -g * out[i] + xd + g * yd
        out = y
    return [dry[i] + wet * out[i] for i in range(n)]

def sonar(freq, seconds, decay, echo_at, echo_gain):
    n = int(RATE * seconds); s = []
    for i in range(n):
        t = i / RATE
        env = min(t / 0.003, 1) * math.exp(-t / decay)
        # Two sines a few hertz apart shimmer the way a real ping rings
        tone = math.sin(2 * math.pi * freq * t) + 0.25 * math.sin(2 * math.pi * (freq * 1.004) * t)
        e = 0.0
        if t > echo_at:
            te = t - echo_at
            e = echo_gain * min(te / 0.01, 1) * math.exp(-te / (decay * 0.8)) * math.sin(2 * math.pi * freq * te)
        s.append(env * tone + e)
    return reverb(s)

def blip(freq, seconds):
    n = int(RATE * seconds); s = []
    for i in range(n):
        t = i / RATE
        env = min(t / 0.002, 1) * math.exp(-t / 0.05)
        s.append(env * (math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(2 * math.pi * freq * 2 * t)))
    return reverb(s, wet=0.15, feedback=0.6)

d = sys.argv[1]
write(f'{d}/a-sonar.wav', sonar(1080, 2.2, 0.38, 0.55, 0.22))
write(f'{d}/b-radar-blip.wav', blip(1750, 0.5))
write(f'{d}/c-sonar-deep.wav', sonar(720, 3.0, 0.6, 0.8, 0.28))
print('ok')
