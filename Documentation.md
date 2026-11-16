# AGROSORB
## A Smart Chemical Trap for Pesticide Runoff
### Scientific and Technical Project Documentation

**Project Domain:** Environmental Engineering, Chemistry, Computer Science and Simulation Technology  
**Project Type:** Interactive 2.5D–3D Environmental Simulator with a Physical Demonstration Model  
**Core Concept:** Agricultural Runoff Treatment Through Physical Filtration and Chemical Adsorption

---

# 1. Abstract

AgroSorb is an educational environmental engineering project designed to demonstrate the treatment of agricultural runoff containing pesticide-like contaminants through physical filtration and chemical adsorption.

Rainfall can carry pesticides, soil particles and other agricultural pollutants from farmland into nearby rivers, ponds and other water bodies, potentially damaging aquatic ecosystems and reducing water quality.

AgroSorb explores a treatment approach using gravel, sand and activated carbon.

The project combines a miniature physical filtration model with an interactive 2.5D–3D browser-based simulator. The simulator allows users to explore agricultural environments, generate virtual runoff, configure filtration layers, simulate treatment processes and analyze water-quality changes.

The system demonstrates the scientific principles of filtration, adsorption and environmental water-quality assessment through interactive visualization and mathematical modelling.

# 2. Introduction

Agriculture plays an essential role in food production. However, the excessive or inappropriate use of pesticides and other agricultural chemicals can contribute to environmental pollution.

During rainfall, water flows over agricultural surfaces and transports soil particles, pesticide residues and other pollutants into nearby water bodies.

This process is known as agricultural runoff.

AgroSorb investigates how filtration and adsorption can help reduce selected contaminants before runoff reaches natural water systems.

The project integrates environmental chemistry, water-treatment engineering and interactive digital technology.

# 3. Problem Statement

Agricultural runoff is a significant pathway through which pollutants can enter freshwater ecosystems.

Conventional filtration methods can remove suspended particles, but dissolved chemical contaminants may require additional treatment processes.

The project investigates the use of a combined filtration system consisting of gravel, sand and activated carbon.

It also explores how a digital simulator can demonstrate treatment processes and compare different filtration configurations.

# 4. Project Objectives

1. Understand the formation and environmental effects of agricultural runoff.
2. Study physical filtration and chemical adsorption.
3. Demonstrate particle removal using sand and gravel.
4. Investigate activated carbon as an adsorption medium.
5. Develop an interactive 3D agricultural runoff simulator.
6. Model the effects of filter configuration, flow rate and contact time.
7. Compare initial and treated water-quality parameters.
8. Visualize treatment performance through data analysis and graphical representation.

# 5. Scientific Principles

## 5.1 Agricultural Runoff

Agricultural runoff occurs when rainfall or irrigation water flows across farmland and carries pollutants into surrounding environments.

Potential pollutants include:

- Soil and sediment.
- Pesticide residues.
- Fertilizer compounds.
- Other dissolved and suspended substances.

The amount of runoff depends on rainfall intensity, soil characteristics, land slope, vegetation and water infiltration.

## 5.2 Physical Filtration

Physical filtration separates suspended particles from water using porous filter materials.

AgroSorb uses two primary physical filtration materials.

**Gravel:**
- Provides coarse filtration.
- Retains larger suspended particles.
- Supports the filter bed.

**Sand:**
- Helps capture finer suspended particles.
- Reduces turbidity.
- Provides additional filtration through the porous filter bed.

## 5.3 Chemical Adsorption

Adsorption is a surface phenomenon in which molecules from a liquid or gas attach to the surface of a solid material.

Activated carbon is commonly used in water treatment because of its highly porous structure and large internal surface area.

It can adsorb various dissolved organic substances, including certain pesticide compounds.

Its effectiveness depends on:

- Contaminant characteristics.
- Activated carbon properties.
- Carbon quantity.
- Contact time.
- Water flow rate.
- Competing substances in the water.

Adsorption does not guarantee the removal of every pesticide.

## 5.4 Difference Between Adsorption and Absorption

**Adsorption:** Molecules accumulate on the surface of a material.

**Absorption:** A substance enters and is distributed within another material.

AgroSorb primarily demonstrates adsorption through activated carbon.

# 6. System Architecture

AgroSorb consists of two connected project components.

## 6.1 Physical Filtration Model

The miniature physical model represents the water-treatment process using:

- A water inlet.
- A filtration column.
- Gravel filtration layer.
- Sand filtration layer.
- Activated carbon layer.
- Treated-water collection container.

The model demonstrates the physical arrangement and operation of the treatment system.

## 6.2 Digital Simulation System

The website provides an interactive representation of the agricultural environment and treatment process.

Its main modules include:

1. Agricultural Environment.
2. Rainfall and Runoff Simulation.
3. Filter Configuration.
4. Water Treatment Simulation Engine.
5. Water Quality Analysis.
6. Results Dashboard.
7. Educational Field Journal.

The digital simulator uses mathematical assumptions to model treatment behaviour. It is not directly connected to physical sensors in the current project configuration.

# 7. Working Principle

The system follows six stages.

**Stage 1: Rainfall Generation**

The simulator generates rainfall over a virtual agricultural landscape.

Rainfall intensity influences the amount of simulated water entering the runoff system.

**Stage 2: Runoff Generation**

Water flows over agricultural soil and carries simulated suspended particles and dissolved contaminants.

**Stage 3: Water Collection**

Runoff is directed into a collection channel and then towards the filtration station.

**Stage 4: Physical Filtration**

Water passes through gravel and sand, reducing suspended particle concentration.

**Stage 5: Chemical Adsorption**

Water passes through activated carbon, which adsorbs suitable dissolved contaminants.

**Stage 6: Treatment Analysis**

The system calculates the resulting water-quality parameters and displays comparisons between the initial and treated samples.

# 8. Filtration Materials and Their Functions

| Material | Scientific Function |
|---|---|
| Gravel | Coarse particle retention |
| Sand | Fine suspended-particle filtration |
| Activated carbon | Adsorption of suitable dissolved substances |

The filtration layers can be rearranged in the digital simulator to investigate how configuration changes influence the modelled treatment process.

# 9. Mathematical Simulation Model

The digital simulator uses mathematical relationships to estimate treatment outcomes.

The simulation should be deterministic, meaning identical initial conditions and filter configurations produce identical results.

## 9.1 Contaminant Concentration

Let:

- C₀ = Initial contaminant concentration.
- C₁ = Final contaminant concentration.
- E = Estimated removal fraction.

The simplified concentration model is:

C₁ = C₀ × (1 − E)

The removal efficiency is:

Removal Efficiency (%) = ((C₀ − C₁) / C₀) × 100

The removal fraction must depend on model parameters such as activated carbon quantity, contact time, flow rate and contaminant properties.

It must not be treated as a universal constant.

## 9.2 Turbidity Reduction

Turbidity represents the cloudiness of water caused by suspended particles.

Turbidity reduction can be calculated separately:

Turbidity Reduction (%) = ((T₀ − T₁) / T₀) × 100

Where:

- T₀ = Initial turbidity.
- T₁ = Final turbidity.

Turbidity reduction does not directly indicate pesticide removal.

## 9.3 Flow Rate

Flow rate represents the volume of water passing through the filtration system per unit time.

Q = V / t

Where:

- Q = Flow rate.
- V = Volume of water.
- t = Time taken.

Higher flow rates can reduce contact time and may affect adsorption performance.

## 9.4 Contact Time

Contact time represents how long water interacts with the filtration medium.

For a simplified filter model:

Contact Time = Effective Filter Volume / Flow Rate

The simulator can use this relationship to demonstrate the influence of water flow on treatment conditions.

## 9.5 pH

pH measures the acidity or alkalinity of water.

It is calculated using:

pH = −log₁₀[H⁺]

The simulator should treat pH independently from turbidity and contaminant concentration.

# 10. Digital Simulator Architecture

The AgroSorb website is designed as an interactive 2.5D–3D environmental simulation game.

## 10.1 Agricultural Environment

The virtual environment includes:

- Farmland.
- Crop fields.
- Soil terrain.
- Water channels.
- Nearby river systems.
- Rainfall effects.
- Filtration station.
- Treated-water collection area.

Users can explore the environment through an isometric or perspective camera.

## 10.2 Weather and Runoff Controls

Users can adjust rainfall intensity and water flow conditions.

The simulator visualizes:

- Rainfall particles.
- Water accumulation.
- Runoff generation.
- Water movement through channels.
- Water entering the filtration station.

## 10.3 Filter Configuration Interface

Users can interact with the filtration station and configure different filter arrangements.

Available materials:

- Gravel.
- Sand.
- Activated carbon.

Configuration parameters include material quantity, layer arrangement and flow rate.

The 3D filter should update visually whenever the user changes its configuration.

## 10.4 Simulation Engine

The simulation engine processes:

- Initial water-quality conditions.
- Filter configuration.
- Material quantities.
- Flow rate.
- Contact time.
- Estimated treatment performance.

The calculation engine must remain separate from the 3D rendering and user-interface code.

## 10.5 Results Dashboard

The dashboard displays:

- Initial turbidity.
- Final turbidity.
- Initial model contaminant concentration.
- Final model contaminant concentration.
- Estimated removal efficiency.
- Filter configuration.
- Simulation history.

Charts and visual comparisons help users understand the differences between treatment configurations.

# 11. Software and Technologies

| Technology | Technical Role |
|---|---|
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| Vite | Development and build tooling |
| Three.js | 3D graphics rendering |
| React Three Fiber | React integration with Three.js |
| Drei | 3D scene utilities |
| Tailwind CSS | Interface styling |
| Framer Motion | Interface animation |
| Zustand | Global simulation state |
| Recharts | Data visualization |
| LocalStorage | Local experiment and configuration persistence |

The application is designed to operate in a browser without requiring physical sensor integration.

# 12. Experimental Methodology

The physical model can be used to investigate the filtration process through controlled experiments.

Three experimental configurations are proposed.

**Experiment A: Control**

Water passes through no filter.

Purpose: Establish initial water-quality conditions.

**Experiment B: Physical Filtration**

Water passes through sand and gravel.

Purpose: Investigate suspended-particle removal.

**Experiment C: Combined Filtration and Adsorption**

Water passes through gravel, sand and activated carbon.

Purpose: Investigate the combined effects of physical filtration and adsorption.

Each configuration should be tested using consistent initial conditions and repeated trials.

Measurements should include turbidity and pH where suitable equipment is available.

A suitable analytical method is required to determine the concentration of a specific dissolved model contaminant.

Food-grade colorant can be used for a visual adsorption demonstration, but its removal cannot establish pesticide-removal efficiency.

# 13. Scientific Data Analysis

The results should be presented using:

- Initial and final measurement tables.
- Average values from repeated trials.
- Percentage reduction calculations.
- Graphical comparisons.
- Filter configuration comparisons.
- Observations and limitations.

Experimental measurements and digitally simulated values must be stored and presented separately.

The simulator's predictions should be labelled as model outputs rather than experimentally verified treatment results.

# 14. Environmental Significance

AgroSorb relates to three United Nations Sustainable Development Goals.

**SDG 6: Clean Water and Sanitation**

Promotes awareness of water pollution prevention and freshwater protection.

**SDG 12: Responsible Consumption and Production**

Encourages responsible agricultural chemical use and pollution prevention.

**SDG 15: Life on Land**

Promotes awareness of ecosystem protection and the environmental consequences of agricultural pollution.

# 15. Technical Limitations

1. The digital simulation uses simplified mathematical assumptions.
2. Actual pesticide removal depends on the chemical properties of individual pesticides.
3. Turbidity sensors cannot directly detect dissolved pesticide molecules.
4. pH measurements do not establish pesticide concentration.
5. Food coloring is not a scientifically equivalent substitute for all pesticides.
6. The miniature physical model cannot establish full-scale treatment performance.
7. Actual pesticide-removal claims require appropriate laboratory analysis.

# 16. Future Technical Improvements

Potential extensions include:

- Integration of ESP32-based water-quality monitoring.
- Automated turbidity and pH measurement.
- Improved adsorption models.
- Compound-specific pesticide testing.
- More advanced hydraulic and flow simulations.
- Investigation of different activated carbon materials.
- Real-time comparison between physical experiments and virtual simulations.
- Development of larger agricultural drainage treatment systems.

# 17. Conclusion

AgroSorb combines environmental chemistry, water-treatment engineering and interactive simulation technology to investigate the treatment of agricultural runoff.

Through physical filtration, activated carbon adsorption and digital modelling, the project demonstrates how different treatment stages can influence water quality.

The interactive simulator makes the scientific processes easier to explore, while the miniature physical model provides a tangible demonstration of the filtration concept.

AgroSorb ultimately aims to promote scientific understanding, environmental awareness and responsible water management.

**AGROSORB: Cleaner Water, Healthier Soil, Sustainable Farming.**
