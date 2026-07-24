import { useRef, useCallback, useEffect } from 'react';

// Handles the kitchen alarm sound. Whenever a custom sound is selected in
// settings, it's preloaded into a browser Audio object the moment settings
// load — not when an order arrives — so playback is instant. Cloudinary also
// serves the file off a CDN with long-lived cache headers, so even the very
// first preload is fast and every later load is effectively free.
export function useKitchenAlarm(settings) {
    const audioCtxRef = useRef(null);
    const customAudioRef = useRef(null);
    const alarmIntervalRef = useRef(null);
    const unlockedRef = useRef(false);

    // Preload/refresh the custom sound whenever the selected sound changes.
    useEffect(() => {
        if (!settings.notificationSoundUrl) {
            customAudioRef.current = null;
            return;
        }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = settings.notificationSoundUrl;
        audio.load(); // starts buffering immediately, well before any order arrives
        customAudioRef.current = audio;
    }, [settings.notificationSoundUrl]);

    // Browsers block audio until a user gesture happens. Unlock both the
    // custom <audio> element and the Web Audio context on the first tap
    // anywhere on the kitchen display.
    useEffect(() => {
        const unlock = () => {
            if (unlockedRef.current) return;
            unlockedRef.current = true;
            if (customAudioRef.current) {
                customAudioRef.current
                    .play()
                    .then(() => {
                        customAudioRef.current.pause();
                        customAudioRef.current.currentTime = 0;
                    })
                    .catch(() => {});
            }
            if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
            window.removeEventListener('pointerdown', unlock);
        };
        window.addEventListener('pointerdown', unlock);
        return () => window.removeEventListener('pointerdown', unlock);
    }, []);

    const playBeep = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const nowT = ctx.currentTime;
            [880, 1108].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, nowT + i * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.3, nowT + i * 0.18 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, nowT + i * 0.18 + 0.16);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(nowT + i * 0.18);
                osc.stop(nowT + i * 0.18 + 0.2);
            });
        } catch (err) {
            console.error('Audio alarm failed', err);
        }
    }, []);

    const playCustom = useCallback(() => {
        const audio = customAudioRef.current;
        if (!audio) return false;
        try {
            audio.currentTime = 0;
            audio.play().catch((err) => console.error('Custom sound playback failed', err));
            return true;
        } catch (err) {
            console.error('Custom sound playback failed', err);
            return false;
        }
    }, []);

    const playAlarm = useCallback(() => {
        if (!settings.soundEnabled) return;
        const played = settings.notificationSoundUrl ? playCustom() : false;
        if (!played) playBeep();
    }, [settings.soundEnabled, settings.notificationSoundUrl, playCustom, playBeep]);

    const startAlarmLoop = useCallback(() => {
        if (alarmIntervalRef.current) return;
        playAlarm();
        const audio = customAudioRef.current;
        const intervalMs = settings.notificationSoundUrl && audio?.duration
            ? Math.max(1500, audio.duration * 1000 + 200)
            : 1500;
        alarmIntervalRef.current = setInterval(playAlarm, intervalMs);
    }, [playAlarm, settings.notificationSoundUrl]);

    const stopAlarmLoop = useCallback(() => {
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
        if (customAudioRef.current) {
            customAudioRef.current.pause();
            customAudioRef.current.currentTime = 0;
        }
    }, []);

    return { startAlarmLoop, stopAlarmLoop };
      }
