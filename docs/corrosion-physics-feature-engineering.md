# Corrosion Physics → Feature Engineering

> Companion to `problem-analysis.md` — Aircraft Corrosion Risk Prediction (`haks-airbus-x-ibm-x-aws-2026`)
> Explains the chemical/physical mechanism of atmospheric corrosion, maps it to the 33 environmental columns, and derives the engineered features from first principles. Written to be presentable to a non-specialist jury.

---

## 1. The mechanism: corrosion is a battery

Atmospheric corrosion is an **electrochemical** process. Three ingredients must be present *simultaneously* on the metal surface:

1. **An electrolyte** — a thin, invisible film of water (a few molecules to a few µm thick). Not rain: an adsorbed/condensed film.
2. **Dissolved aggressive ions** that make the film conductive and break the metal's protection (chloride, sulfate, nitrate).
3. **An oxidant** — dissolved O₂ from the air.

Metal dissolves at **anodic** sites, oxygen is reduced at **cathodic** sites, and current flows through the water film:

$$
\text{Anode:}\quad \mathrm{Al \rightarrow Al^{3+} + 3e^-}
\qquad\qquad
\text{Cathode:}\quad \mathrm{O_2 + 2H_2O + 4e^- \rightarrow 4\,OH^-}
$$

**No water film → no circuit → essentially zero corrosion.** Corrosion rate is not a smooth function of humidity; it is nearly zero below a wetness threshold and fast above it. This on/off behavior drives most of the feature design below.

### 1.1 Why aluminum, and why pitting

Aircraft alloys (2024, 7075 — Al with Cu/Zn) are protected by a passive **Al₂O₃ oxide layer**. Corrosion starts where that layer is locally broken — which is precisely what **chloride** does: Cl⁻ forms soluble complexes with aluminum, preventing the oxide from re-healing locally. A pit opens, and then becomes **autocatalytic**:

$$
\mathrm{Al^{3+} + H_2O \rightarrow AlOH^{2+} + H^+}
$$

The hydrolysis of dissolved Al³⁺ acidifies the pit interior; the local positive charge attracts more Cl⁻ into the pit; acid + chloride accelerate dissolution further. The pit digs itself deeper.

> **Consequence for the label convention:** this autocatalytic, threshold-gated mechanism is exactly why corrosion is *non-linear and late-onset* — nothing visible for years, then self-accelerating attack. It is the physical justification for the competition's "24 months earlier = healthy" assumption.

---

## 2. The damage model: corrosion is an accumulated dose

Damage is an **integral over time**, not a snapshot. A parked aircraft is a passive metal coupon left in the weather; flight is a *drying* cycle (cold, extremely dry air at altitude). So the dose only accumulates while parked:

$$
D(t) \;\approx\; \sum_{\text{months } m \le t} \underbrace{\text{parking}_m}_{\text{exposure time}} \times \underbrace{f(\text{wetness}_m)}_{\text{is there an electrolyte?}} \times \underbrace{g(\mathrm{Cl}_m,\ \mathrm{SO_2}_m,\ T_m)}_{\text{how aggressive is it?}}
$$

The three factors are **multiplicative, not additive**: salty air over a dry surface does nothing; a wet surface with no ions corrodes very slowly; a wet *and* salty surface parked for a month corrodes fast.

This is also why single-month features cannot separate the label-0 (−24 months) row from the label-1 (observation) row of the same aircraft: both rows often sit in the *same climate*. What differs is the **integral** — cumulative exposure and age.

---

## 3. Mapping the mechanism to the dataset columns

### Factor 1 — Is there an electrolyte? (time-of-wetness, TOW)

Columns: `metar_relative_humidity`, `metar_dew_point_c`, `metar_temperature_c`, `metar_hour_precipitation`, `specific_humidity`.

- A water film forms when **RH ≳ 80 %**. The classical ISO 9223 definition of time-of-wetness is *hours with RH > 80 % and T > 0 °C*. Below the threshold the rate is ≈ 0; above it, corrosion switches on. Threshold-style features (`(RH − 80)⁺`, fraction above threshold) beat raw RH.
- The **dew-point spread** $T - T_{dew}$ is a condensation proxy. Metal skins cool below air temperature at night (radiative cooling): a small spread + high RH means the aircraft literally sweats even without rain.
- **Temperature plays a double role.** Kinetics follow Arrhenius (rate roughly doubles per +10 °C), but heat also evaporates the film. The danger zone is **warm + humid** (tropical/coastal climates). Below 0 °C the electrolyte freezes and corrosion essentially stops.

### Factor 2 — How aggressive is the electrolyte?

| Column group | Role in the mechanism |
|---|---|
| `sea_salt_aerosol_*` (3 size bins) | **Chloride — the headline driver.** (a) Pit initiation: Cl⁻ breaks the passive oxide. (b) **Deliquescence**: salt deposits are hygroscopic — NaCl pulls water from air at ~76 % RH, MgCl₂ (present in sea salt) at ~33 % RH. Salt therefore *lowers the humidity threshold at which the surface gets wet at all* → `salt × humidity` must be an explicit interaction. Fine fraction (0.03–0.5 µm) travels far inland; coarse fraction (5–20 µm) ≈ parked at the coast. |
| `sulphur_dioxide_mass_mixing_ratio`, `sulphate_aerosol_mixing_ratio` | **Sulfur — the second classical driver.** SO₂ dissolves into the film and oxidizes to sulfuric acid, dissolving the protective oxide. Industrial/airport pollution signature. |
| `ozone_mass_mixing_ratio`, `h2o2`, `oh` | **Oxidants — indirect accelerators.** They convert SO₂ → sulfate and NO₂ → HNO₃ in the wet film (H₂O₂ is the dominant aqueous-phase SO₂ oxidizer). Physically motivated interaction: `SO₂ × (H₂O₂ + O₃)` = acid production rate. |
| `hno3`, `nitrogen_dioxide_*`, `nitrogen_monoxide_*`, `organic_nitrates` | **Nitrate acidity** — same role as sulfur, usually weaker. |
| `dust_aerosol_*` (3 size bins) | **Deposits.** Create crevices and differential-aeration cells (oxygen-starved zones under a deposit become anodes); hygroscopic dust nucleates droplets. Mildly accelerating; occasionally protective if alkaline (carbonate dust neutralizes acid). |
| `*_black_carbon_*` | Soot is conductive and noble relative to Al — particles on the surface act as **extra cathodic sites** (galvanic effect). |
| `ethane`, `c3h8`, `isoprene`, `formaldehyde`, `carbon_monoxide_*` | **No direct corrosion chemistry.** Best understood as *location fingerprints* (isoprene = vegetation/tropics, propane/ethane = urban-industrial). Useful as geography proxies — do not present them to the jury as corrosive agents. |

### Factor 3 — For how long?

Column: `total_parking_minutes`, plus the per-aircraft timeline (delivery date → age).

The exposure *dose* of the damage integral in §2. An aircraft spends ~⅔ of its life parked; flying dries it out. All chemistry features should be **gated by parking time** when accumulated.

---

## 4. Reference formulas

### 4.1 Time-of-wetness gate (ISO 9223 convention)

$$
\mathrm{TOW}_m \;=\; \text{hours in month } m \text{ with } \mathrm{RH} > 80\% \ \text{and}\ T > 0\,^\circ\mathrm{C}
$$

With monthly aggregates only, approximate with a smooth gate on the monthly mean:

$$
f(\text{wetness}_m) \;=\; \sigma\!\left(\frac{\mathrm{RH}_m - 80}{s}\right) \cdot \mathbb{1}[T_m > 0\,^\circ\mathrm{C}]
\qquad (s \approx 5\text{–}10)
$$

### 4.2 Arrhenius temperature weighting

$$
k(T) \;=\; A \, e^{-E_a / RT}, \qquad E_a \approx 40\text{–}60\ \mathrm{kJ\,mol^{-1}}
$$

(The model only needs the *shape*; any plausible $E_a$ works. Rule of thumb: rate ×2 per +10 °C. Zero the term below 0 °C.)

### 4.3 ISO 9223 / 9224 dose–response form

The industry standard classifies atmospheric corrosivity (C1–C5) from exactly three inputs — TOW, chloride deposition, SO₂ deposition — via empirical dose–response functions of the form:

$$
r_{\text{corr}} \;=\; A \cdot \mathrm{TOW}^{\,a} \cdot [\mathrm{SO_2}]^{\,b} \cdot [\mathrm{Cl^-}]^{\,c} \cdot e^{\,h(T)}
$$

A proxy of this index, computed from the dataset columns, makes a single physically-grounded feature — and citing ISO 9223 to the jury shows the features mirror the standard the industry itself uses, rather than being ad-hoc.

### 4.4 The full damage integral (discrete, per aircraft)

$$
D(t) \;=\; \sum_{m \,\le\, t} \text{parking}_m \;\cdot\; f(\text{wetness}_m) \;\cdot\; \Big( \alpha\,\mathrm{Cl}_m \;+\; \beta\,\mathrm{SO_2}_m \;+\; \gamma \Big) \;\cdot\; k(T_m)
$$

In practice the model learns $\alpha, \beta, \gamma$ implicitly — expose the *components* (salt-dose, acid-dose, plain wet-dose) as separate cumulative features and let the booster weight them.

---

## 5. Engineered features, ranked by physical grounding

1. **Wet-parking dose** — $\text{parking}_m \times f(\text{wetness}_m)$, cumulated since delivery + trailing 6/12/24-month windows. The discretized TOW × exposure integral.
2. **Salt-wet interaction dose** — $\text{parking} \times f(\text{wetness}) \times \text{sea\_salt}$, cumulated. The most mechanism-faithful feature in the set (deliquescence + pitting).
3. **Acid dose** — $\text{parking} \times f(\text{wetness}) \times (\mathrm{SO_2} + \text{sulphate} + \mathrm{HNO_3})$, cumulated; optionally an $\mathrm{SO_2} \times (\mathrm{H_2O_2}+\mathrm{O_3})$ acid-production term.
4. **Condensation proxy** — trailing mean of $(T - T_{dew})$; count/fraction of months with a small spread.
5. **Arrhenius-weighted dose** — multiply each monthly dose by $e^{-E_a/RT_m}$, zeroed below 0 °C.
6. **ISO 9223-style corrosivity index** — the §4.3 dose–response computed from RH/Cl/SO₂ columns, as a single feature (and a strong jury talking point).
7. **Aircraft age + cumulative lifetime parking** — the trivially strongest separator between the paired label-0 and label-1 rows (same aircraft, 24 months apart).
8. **Location fingerprints** — long-run means of coarse sea salt (= coastal base), SO₂ / black carbon (= industrial airport), isoprene (= tropical/vegetated): capture the environment's *base rate*.

> **Leakage reminder:** all cumulative/trailing features must be **causal** — computed only from months ≤ the scored month (see `problem-analysis.md` §8).

---

## 6. The jury pitch (two sentences)

> "Corrosion is a battery that needs three things at once: a film of water on the metal, salt or acid dissolved in it, and time. Our data measures exactly those three things month by month — how often the air was humid enough to wet the aircraft, how much sea salt and pollution that water film contained, and how many hours the aircraft sat parked in it — so our features are simply the accumulated product of the three, the same dose–response logic the ISO 9223 corrosion standard uses."

**Why physics-informed features instead of letting the model figure it out:** the mechanism says effects are *multiplicative and thresholded*. Gradient boosting can learn interactions on its own, but with only ~1,500 labeled rows it learns them far more reliably when handed the physically-correct products and cumulative integrals directly. The feature engineering is not decoration — it compensates for a small training set with a century of corrosion science.

---

## 7. One-glance summary table

| Physical question | Columns | Feature family |
|---|---|---|
| Is the surface wet? | RH, dew point, temperature, precipitation, specific humidity | TOW gate, dew-point spread, freezing fraction |
| How aggressive is the water? | Sea salt (×3), SO₂, sulphate, HNO₃, NOₓ, oxidants (O₃, H₂O₂, OH), dust, black carbon | Salt dose, acid dose, oxidant interaction, deposit proxies |
| For how long? | `total_parking_minutes`, delivery date | Cumulative & trailing wet/salt/acid doses, age |
| Where is it parked? (base rate) | Coarse sea salt, SO₂, black carbon, isoprene, VOCs | Long-run environmental means (location fingerprints) |
