# AIRSHIFT — two-minute prototype demonstration script

Setup: open the prototype full-screen at 1440×900 or larger (`npm run preview`, or your published URL later). Reload first so every control is at its default. Total spoken time ≈ 1:55. Say "simulated" out loud at least twice.

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page. Move the pointer across the particle field. | "What if you could see the air you breathe? The WHO says 99% of people breathe air above its guideline limits. That's a global outdoor figure. It tells us nothing about *my* classroom. AIRSHIFT helps a school find out." |
| 0:15 | Click **Enter the Air Lab**. | "Four steps: Detect, Decide, Verify, Replicate. This is the Air Lab." |
| 0:20 | Drag to orbit the 3D room. Click **Dust event · 120**. Point at the zone numbers. | "A classroom in 3D. The particle animation is conceptual, not airflow physics. The numbers come from a simple mass-balance model with listed assumptions. In a dust event, outdoor air pushes the room above the WHO reference." |
| 0:40 | Toggle **Hypothetical portable HEPA intervention** on. Let the numbers settle. Point at CO2 tile. | "Now a hypothetical HEPA cleaner. The model drops. But watch CO2: unchanged. HEPA filters particles, not CO2. That's a separate ventilation signal." |
| 0:55 | Scroll to **School Air Map**. Click the Entrance corridor, then Classroom A. | "Each room, with its source, timestamp and unit. The badge says simulated demonstration data. No sensor is connected." |
| 1:10 | Scroll to **Interventions**. Click **$500**, then **$1,500**. Tick *Visible dust*. | "The studio sizes the cleaner for this room against the EPA rule of thumb. At $500 coverage is partial; at $1,500 it's full. Observations re-rank the options. Source control moves up. No precise promises: it's a range with assumptions." |
| 1:30 | Scroll to **Evidence**. Point at raw −51% and outdoor-adjusted. Point at the amber warning. | "Before and after for matched school hours. Outdoor air got dustier after the intervention, and the tool warns about it, so we also compare indoor-to-outdoor and a comparison room. This is demo data, and PM2.5 isn't a health outcome." |
| 1:45 | Click **Sample report (HTML)**. | "The report exports with a SIMULATED banner." |
| 1:50 | Scroll to **Replicate**. Click **South Asia** on the globe. | "Everything beyond Al Dhafra is hypothetical. The plan: pilot, publish the toolkit, then let other schools repeat it. Thank you." |

## If something goes wrong

- 3D view blank: reload; if the device has no WebGL the page shows a fallback and all numbers still work. Continue with the zone buttons.
- Slow laptop: enable "reduce motion" in the OS before the demo; the particle field becomes static and the Air Lab stops animating.
- Time overrun: skip the Air Map step and the report download.
