# Hyperframes Composition Brief: Lead Hunter Club

## Objective
Create a short launch-style brag video for Lead Hunter Club.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: E:\programming and stuff\leadhunterclubfull\apps\web
- Primary files read: src/app/page.tsx, src/app/components/HeroSection.tsx, src/lib/colors.ts, tailwind.config.ts
- Product name: Lead Hunter Club
- Tagline / strongest claim: Stop looking for clients. Start intercepting them.
- Key UI or visual moment to recreate: Lead Feed with Live Signals + replyProbability, AI filter funnel pass/reject rows, Intel dossier + Intent Score 94%, Pipeline Saved->Contacted->Replied->Closed, Noise 1.2% vs Signal 38% cards
- Copy that must appear verbatim:
  - Stop looking for clients.
  - Start intercepting them.
  - Lead Hunter Club monitors active service demand in real-time, compiles deep social intelligence, and unlocks verified contact details so you close deals first.
  - From Raw Signal To Closed Client.
  - We Intercept Fresh Signals / AI Filters Out the Noise / We Build Lead Intelligence / Released to the Hunters
  - Intent Score: 94%
  - Start Hunting Free
  - Trusted by 500+ freelancers
  - ~38% Reply Rate vs ~1.2% Reply Rate

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium hunt film - obsidian ops room intercepts
- Interpretation: Fewer scenes longer holds confidence through restraint soft crossfades generous type
- Angle: Obsidian ops room watches live buyer signals come in. Not prospecting, intercepting. Raw Signal -> Closed Client in 20s.
- Hook: Stop looking for clients. / Start intercepting them. amber italic second line
- Outro / punchline: Start Hunting Free amber CTA + Trusted by 500+ freelancers
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: #0d0e0f / #121314 obsidian
- Text: #e3e2e3
- Accent: #ffb800 kinetic amber
- Display font: Geist display fallback system-ui sans-serif (Hyperframes local, no external Google Fonts to keep check passing)
- Body font: Geist sans fallback system-ui
- Visual references from the project: wolf island hero gradient scrim, macOS chrome dots #FF5F57 #FEBC2E #28C840, metallic-card borders white 8%, Lead Feed Live Signals pill amber, mint #43ed9e verified, cyan #00d7fe intel

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.5s — Stop looking / Start intercepting lines must be readable settled holds
2. Reveal Live Signals — 3.5s — 3 cards sequential with 92-96% badges
3. AI Filter + Intel — 10s — funnel pass/reject then dossier 4 fields + 94% counter + verified lock
4. Pipeline + CTA — 4s — Saved->Contacted->Replied->Closed sequential then Start Hunting Free

## Audio
- Audio role: warm bed steady clean
- Audio arc: low steady full run, sparse ticks/confirms, 1s fade-out 19-20s
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3
- Music treatment: volume 0.32, fade-in 0.5s, hold, fade-out 1.0s outro
- Music cue guidance: cues preset happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json tempo 109.96 BPM; strongCues 8.74s(0.99),10.93s(0.97),13.11s(0.98),17.47s(0.99),18.56s(0.99); lock 1-3 majors within ±0.15s: hook settle 1.09s, 94% lock 13.11s, pipeline close 17.47s; sequential snap beats ±0.10s every-other-beat for readable text; or unavailable continue without sync
- Audio-reactive treatment: subtle; RMS/bass breathe hero glow + amber CTA presence, no waveform/equalizer
- Audio-coupled moments:
  - Scene2 signal cards — card sequence ticks
  - Scene3 dossier fields + 94% counter — typing/counter ticks + badge lock
  - Scene4 pipeline Saved->Closed — sequential confirms + final logo hit on CTA
- SFX selection guidance: motion-matched restraint; card-slide/place for cards, drop_001/002 for labels, impactSoft_medium for reveals, impactBell_heavy_000 for 94% + CTA payoff; prefer low high-frequency-risk per sfx-analysis; thin dense sequences to first/last/strong beats
- SFX analysis guidance: C:\Users\HP\.agents\skills\brag\assets\sfx\sfx-analysis.json / .md if present
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, volume based on implemented animation.
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer unless audio was explicitly disabled or documented as intentionally silent.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing and should ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in a 15-25s video unless the edit clearly benefits from more.
- Use SFX to support motion and interaction: card sounds for card-like reveals, short announcement cues for major payoffs, key/click sounds for text or user actions, and restraint when the edit is already busy.
- Honor planned music treatment such as fade-outs, ducking, beat-aligned reveals, or letting a final SFX ring over the music, using the best Hyperframes-supported implementation.
- When music is present and the treatment is not `none`, consider Hyperframes audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle, brand-specific motion. Good targets are glow, depth, background warmth, card presence, title emphasis, or other existing visual elements. Avoid waveform/equalizer visuals, musical-note graphics, generic particle systems, strobing, or heavy pulsing.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.
